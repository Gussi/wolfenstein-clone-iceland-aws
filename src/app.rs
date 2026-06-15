//! The orchestrator: owns the `World` and the browser boundaries, and runs one
//! frame per `requestAnimationFrame` callback (US-20, US-21, US-22).

use crate::boundary::{AudioSink, InputSource, InputState, Sound, Surface, TextureImage, TextureSet};
use crate::constants::{
    GAME_OVER_DURATION, INTRO_DURATION, MAX_HEALTH, SCORE_LEVEL_COMPLETE, SCORE_PER_ENEMY,
    SCORE_PER_SECRET, SCREEN_HEIGHT, SCREEN_WIDTH,
};
use crate::domain::map::animate_map;
use crate::systems::ai::update_enemies;
use crate::systems::combat::{resolve_attack, update_weapon};
use crate::systems::hud::{HudView, Overlay, render_hud};
use crate::systems::interactions::{Interaction, collect_pickups, try_interact};
use crate::systems::movement::{heal_player, update_player};
use crate::systems::raycaster::{Framebuffer, cast_walls};
use crate::systems::sprites::render_sprites;
use crate::world::{GameStatus, World};

/// Maximum simulation step, to keep physics stable after a tab stall.
const MAX_DT: f32 = 0.05;

pub struct App<S: Surface, A: AudioSink, I: InputSource> {
    world: World,
    surface: S,
    audio: A,
    input: I,
    textures: TextureSet,
    intro_image: Option<TextureImage>,
    fb: Framebuffer,
    zbuffer: Vec<f32>,
    last_ms: Option<f64>,
    music_started: bool,
}

impl<S: Surface, A: AudioSink, I: InputSource> App<S, A, I> {
    pub fn new(mut world: World, surface: S, audio: A, input: I, textures: TextureSet, intro_image: Option<TextureImage>) -> Self {
        world.status = GameStatus::Intro {
            remaining: INTRO_DURATION,
        };
        Self {
            world,
            surface,
            audio,
            input,
            textures,
            intro_image,
            fb: Framebuffer::new(SCREEN_WIDTH, SCREEN_HEIGHT),
            zbuffer: vec![0.0; SCREEN_WIDTH],
            last_ms: None,
            music_started: false,
        }
    }

    /// Advance and render one frame. `now_ms` is the rAF timestamp.
    pub fn tick(&mut self, now_ms: f64) {
        let dt = match self.last_ms {
            Some(prev) => (((now_ms - prev) / 1000.0) as f32).clamp(0.0, MAX_DT),
            None => 0.0,
        };
        self.last_ms = Some(now_ms);
        self.world.timers.delta = dt;

        let input = self.input.poll();
        self.update(dt, &input);
        self.render();
        self.surface.present(&self.fb);
        self.render_text();
    }

    pub fn status(&self) -> GameStatus {
        self.world.status
    }

    fn update(&mut self, dt: f32, input: &InputState) {
        match self.world.status {
            GameStatus::Loading => {}
            GameStatus::Intro { remaining } => {
                if !self.music_started {
                    self.audio.play_music(true);
                    self.music_started = true;
                }
                let r = remaining - dt;
                self.world.status = if input.attack {
                    GameStatus::Playing
                } else {
                    GameStatus::Intro { remaining: r.min(remaining) }
                };
            }
            GameStatus::Playing => self.update_playing(dt, input),
            GameStatus::Paused => {
                if input.pause_toggle {
                    self.world.status = GameStatus::Playing;
                }
            }
            GameStatus::GameOver { elapsed } => {
                let e = elapsed + dt;
                self.world.status = GameStatus::GameOver { elapsed: e };
                if e >= GAME_OVER_DURATION && input.dismiss {
                    self.world.reset();
                    self.music_started = false;
                    self.world.status = GameStatus::Intro {
                        remaining: INTRO_DURATION,
                    };
                }
            }
            GameStatus::Victory => {}
        }
    }

    fn update_playing(&mut self, dt: f32, input: &InputState) {
        if input.pause_toggle {
            self.world.status = GameStatus::Paused;
            return;
        }
        self.world.timers.level_elapsed += dt;

        update_player(&mut self.world.player, &self.world.map, input, dt);
        let events = update_enemies(&mut self.world, dt);
        if events.alerted > 0 {
            self.audio.play(Sound::EnemyAlert);
        }
        update_weapon(&mut self.world, dt);
        animate_map(&mut self.world.map, dt);

        self.handle_attack(input);
        self.handle_interactions(input);
        self.cleanup_dispersed();
        self.check_end_conditions();
    }

    fn handle_attack(&mut self, input: &InputState) {
        if input.attack && self.world.weapon.is_ready() {
            self.audio.play(Sound::WeaponSwing);
            let outcome = resolve_attack(&mut self.world);
            if outcome.hit.is_some() {
                self.audio.play(Sound::EnemyHit);
                if outcome.dispersed {
                    self.audio.play(Sound::EnemyDispersed);
                    self.world.score.connections += SCORE_PER_ENEMY;
                    self.world.stats.enemies_dispersed += 1;
                }
            }
        }
    }

    fn handle_interactions(&mut self, input: &InputState) {
        if input.interact {
            match try_interact(&mut self.world) {
                Some(Interaction::OpenedDoor(_)) => self.audio.play(Sound::DoorOpen),
                Some(Interaction::TriggeredPushWall(_)) => {
                    self.audio.play(Sound::Secret);
                    self.world.stats.secrets_found += 1;
                    self.world.score.connections += SCORE_PER_SECRET;
                }
                None => {}
            }
        }
        let healed = collect_pickups(&mut self.world);
        if healed > 0 {
            heal_player(&mut self.world.player, healed);
            self.audio.play(Sound::Pickup);
        }
    }

    fn cleanup_dispersed(&mut self) {
        use crate::constants::DISPERSE_DURATION;
        use crate::domain::EnemyState;
        self.world
            .enemies
            .retain(|e| !(e.state == EnemyState::Dispersing && e.state_timer >= DISPERSE_DURATION));
    }

    fn check_end_conditions(&mut self) {
        if !self.world.player.is_alive() {
            self.audio.play(Sound::PlayerHurt);
            self.audio.stop_music();
            self.world.status = GameStatus::GameOver { elapsed: 0.0 };
        } else if self.world.alive_enemy_count() == 0 {
            self.world.score.connections += SCORE_LEVEL_COMPLETE;
            self.world.stats.time_seconds = self.world.timers.level_elapsed;
            self.audio.stop_music();
            self.world.status = GameStatus::Victory;
        }
    }

    fn render(&mut self) {
        self.fb.clear([0, 0, 0, 255]);
        if matches!(self.world.status, GameStatus::Loading) {
            return;
        }
        if matches!(self.world.status, GameStatus::Intro { .. }) {
            // Intro: black screen with portrait (aspect-fit).
            if let Some(img) = &self.intro_image {
                let fw = self.fb.width as f32;
                let fh = self.fb.height as f32;
                let scale = (fw / img.size as f32).min(fh / img.size as f32);
                let dw = (img.size as f32 * scale) as i32;
                let dh = dw; // square texture
                let ox = (self.fb.width as i32 - dw) / 2;
                let oy = (self.fb.height as i32 - dh) / 2;
                for dy in 0..dh {
                    for dx in 0..dw {
                        let u = dx as f32 / dw as f32;
                        let v = dy as f32 / dh as f32;
                        let c = img.sample(u, v);
                        if c[3] > 0 {
                            self.fb.set((ox + dx) as usize, (oy + dy) as usize, c);
                        }
                    }
                }
            }
            return;
        }
        cast_walls(
            &self.world.player,
            &self.world.map,
            &self.textures,
            &mut self.fb,
            &mut self.zbuffer,
        );
        render_sprites(&self.world, &self.textures, &mut self.fb, &self.zbuffer);
        let view = self.build_hud_view();
        render_hud(&view, &self.textures, &mut self.fb);
    }

    fn render_text(&mut self) {
        let w = SCREEN_WIDTH as f64;
        let h = SCREEN_HEIGHT as f64;
        let cx = w / 2.0;
        let cy = h / 2.0;

        match self.world.status {
            GameStatus::Intro { .. } => {
                self.surface.draw_text("Guð blessi Ísland...", cx, cy + 40.0, 48.0, "#e8e0d0");
            }
            GameStatus::GameOver { .. } => {
                self.surface.draw_text("You give up and go home...", cx, cy - 10.0, 16.0, "#e06050");
                self.surface.draw_text("Press any key to restart", cx, cy + 14.0, 10.0, "#a0a0a0");
            }
            GameStatus::Victory => {
                let s = &self.world.stats;
                self.surface.draw_text("LEVEL COMPLETE", cx, cy - 24.0, 18.0, "#f0d060");
                let line1 = format!("Dispersed: {}/{}", s.enemies_dispersed, s.total_enemies);
                let line2 = format!("Secrets: {}/{}", s.secrets_found, s.total_secrets);
                let line3 = format!("Time: {:.1}s", s.time_seconds);
                self.surface.draw_text(&line1, cx, cy, 12.0, "#e0e0e0");
                self.surface.draw_text(&line2, cx, cy + 16.0, 12.0, "#e0e0e0");
                self.surface.draw_text(&line3, cx, cy + 32.0, 12.0, "#e0e0e0");
            }
            GameStatus::Playing => {
                if let Some(t) = self.world.enemies.iter().find_map(|e| e.taunt) {
                    self.surface.draw_text(t.text, cx, 20.0, 14.0, "#ff8888");
                }
            }
            GameStatus::Paused => {
                self.surface.draw_text("PAUSED", cx, cy, 40.0, "#ffffff");
            }
            _ => {}
        }

        // Health and score labels on the HUD bar.
        let bar_y = h * 0.84;
        self.surface.draw_text(
            &format!("HP: {}", self.world.player.health),
            80.0, bar_y, 14.0, "#ffffff",
        );
        self.surface.draw_text(
            &format!("Score: {}", self.world.score.connections),
            w - 80.0, bar_y, 14.0, "#ffffff",
        );
    }

    fn build_hud_view(&self) -> HudView {
        let overlay = match self.world.status {
            GameStatus::GameOver { .. } => Some(Overlay::Text {
                text: "You give up and go home...".into(),
                remaining: 0.0,
            }),
            GameStatus::Victory => Some(Overlay::Stats(self.world.stats)),
            GameStatus::Playing => self
                .world
                .enemies
                .iter()
                .find_map(|e| e.taunt.map(|t| Overlay::Taunt { text: t.text })),
            _ => None,
        };

        HudView {
            health: self.world.player.health,
            max_health: MAX_HEALTH,
            connections: self.world.score.connections,
            weapon_frame: self.world.weapon.frame(),
            face: self.world.face_expression(),
            overlay,
        }
    }
}
