# Services — "Pots & Parliament" (Rust)

## Service Layer Overview

> **Design note:** There is no backend and no service layer in the traditional sense. The "orchestration" is `App::tick` running the per-frame system pipeline over the owning `World`. Systems are free functions; the orchestrator threads `&mut World` (and the boundary traits) through them in a fixed order and turns the pure outcomes (`AttackOutcome`, `Interaction`) into side effects (audio, score, HUD).

---

## 1. Frame pipeline (`App::tick`)

Sequential pipeline per frame. Each step borrows only what it needs.

```rust
fn tick(&mut self, now_ms: f64) {
    let dt = self.delta_seconds(now_ms);
    self.world.timers.delta = dt;

    match self.world.status {
        GameStatus::Playing => {
            let input = self.input.poll();                       // 1. input snapshot
            update_player(&mut self.world.player, &self.world.map, &input, dt); // 2
            update_enemies(&mut self.world, dt);                 // 3. AI ticks
            update_weapon(&mut self.world.weapon, dt);           // 4. weapon anim
            animate_map(&mut self.world.map, dt);                // 5. doors/push-walls

            self.handle_attack(&input);                          // 6. combat → sfx/score
            self.handle_interactions(&input);                    // 7. doors/pickups → sfx
            self.check_end_conditions();                         // 8. win/lose
        }
        GameStatus::Intro { .. } | GameStatus::GameOver { .. } => self.advance_timed_state(dt),
        _ => {}
    }

    // 9-10. render world + HUD into the framebuffer, then present
    self.render();
    self.surface.present(&self.framebuffer);
}
```

Input one-shots are cleared inside `poll`, so no separate reset step is needed.

---

## 2. Combat coordination (`handle_attack`)

Bridges pure combat results to audio and score.

```rust
fn handle_attack(&mut self, input: &InputState) {
    if !(input.attack && self.world.weapon.is_ready()) {
        return;
    }
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
```

---

## 3. Interaction coordination (`handle_interactions`)

```rust
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

    // pickups are auto-collected on overlap
    let healed = collect_pickups(&mut self.world);
    if healed > 0 {
        heal_player(&mut self.world.player, healed);
        self.audio.play(Sound::Pickup);
    }
}
```

---

## 4. State transitions (`check_end_conditions` + `advance_timed_state`)

```rust
fn check_end_conditions(&mut self) {
    if !self.world.player.is_alive() {
        self.audio.play(Sound::PlayerHurt);
        self.world.status = GameStatus::GameOver { elapsed: 0.0 };
    } else if self.world.alive_enemy_count() == 0 {
        self.world.score.connections += SCORE_LEVEL_COMPLETE;
        self.world.stats.time_seconds = self.world.timers.level_elapsed;
        self.world.status = GameStatus::Victory;
    }
}
```

State graph:

```
Loading  ──assets loaded──▶ Intro { remaining }
Intro    ──timeout/keypress──▶ Playing
Playing  ──health == 0──▶ GameOver { elapsed }
Playing  ──no enemies left──▶ Victory
Playing  ──Esc──▶ Paused ──Esc──▶ Playing
GameOver ──animation done + key──▶ (rebuild World) Intro
Victory  ──show stats screen──▶ (end)
```

Timers that only matter in a given state (`Intro`, `GameOver`) are carried inside the enum variant rather than as always-present fields.

---

## No external services

No backend, auth, leaderboard, analytics, or persistence. The session is ephemeral; restart rebuilds a fresh `World` from the parsed map.
