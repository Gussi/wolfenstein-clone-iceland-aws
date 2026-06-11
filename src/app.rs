//! The orchestrator: owns the `World` and the browser boundaries, and runs one
//! frame per `requestAnimationFrame` callback (US-20, US-21, US-22).

use crate::boundary::{AudioSink, InputSource, InputState, Sound, Surface, TextureSet};
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
    fb: Framebuffer,
    zbuffer: Vec<f32>,
    last_ms: Option<f64>,
    music_started: bool,
}

impl<S: Surface, A: AudioSink, I: InputSource> App<S, A, I> {
    pub fn new(mut world: World, surface: S, audio: A, input: I, textures: TextureSet) -> Self {
        world.status = GameStatus::Intro {
            remaining: INTRO_DURATION,
        };
        Self {
            world,
            surface,
            audio,
            input,
            textures,
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
                self.world.status = if input.dismiss || r <= 0.0 {
                    GameStatus::Playing
                } else {
                    GameStatus::Intro { remaining: r }
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

    fn build_hud_view(&self) -> HudView {
        let overlay = match self.world.status {
            GameStatus::Intro { remaining } => Some(Overlay::Text {
                text: "You just need to file one form...".into(),
                remaining,
            }),
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
