//! Red Tape enemy AI: detection, pursuit, attack, stun, dispersal
//! (US-06, US-07, US-08, US-24).

use crate::constants::{
    ALERT_DURATION, COLLISION_RADIUS, DETECTION_RANGE, DISPERSE_DURATION, ENEMY_ATTACK_COOLDOWN,
    ENEMY_ATTACK_RANGE, ENEMY_DAMAGE, ENEMY_SPEED, SCORE_PER_ENEMY, STUN_DURATION, TAUNT_DURATION,
    TAUNTS,
};
use crate::domain::map::Map;
use crate::domain::{Enemy, EnemyState, Player, Taunt};
use crate::math::Vec2;
use crate::systems::movement::{blocked, damage_player};
use crate::world::World;

/// Result of a melee hit landing on an enemy.
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct HitResult {
    pub stunned: bool,
    pub dispersed: bool,
    pub score_awarded: u32,
}

/// Line-of-sight check via grid DDA. Returns false if blocked or out of range.
pub fn can_see_player(from: Vec2, player: Vec2, map: &Map) -> bool {
    let delta = player - from;
    let dist = delta.length();
    if dist > DETECTION_RANGE {
        return false;
    }
    if dist < f32::EPSILON {
        return true;
    }
    let dir = delta * (1.0 / dist);

    let mut map_x = from.x.floor() as i32;
    let mut map_y = from.y.floor() as i32;
    let target_x = player.x.floor() as i32;
    let target_y = player.y.floor() as i32;

    let delta_dist_x = if dir.x.abs() < 1e-6 {
        f32::INFINITY
    } else {
        (1.0 / dir.x).abs()
    };
    let delta_dist_y = if dir.y.abs() < 1e-6 {
        f32::INFINITY
    } else {
        (1.0 / dir.y).abs()
    };

    let (step_x, mut side_x) = if dir.x < 0.0 {
        (-1, (from.x - map_x as f32) * delta_dist_x)
    } else {
        (1, (map_x as f32 + 1.0 - from.x) * delta_dist_x)
    };
    let (step_y, mut side_y) = if dir.y < 0.0 {
        (-1, (from.y - map_y as f32) * delta_dist_y)
    } else {
        (1, (map_y as f32 + 1.0 - from.y) * delta_dist_y)
    };

    // Bounded by the grid diagonal to guarantee termination.
    let max_steps = (map.width + map.height) * 2;
    for _ in 0..max_steps {
        if map_x == target_x && map_y == target_y {
            return true;
        }
        if side_x < side_y {
            side_x += delta_dist_x;
            map_x += step_x;
        } else {
            side_y += delta_dist_y;
            map_y += step_y;
        }
        if map_x == target_x && map_y == target_y {
            return true;
        }
        if map.is_solid(map_x, map_y) {
            return false;
        }
    }
    false
}

/// Apply a melee hit; transition to Stunned or Dispersing.
pub fn apply_hit(enemy: &mut Enemy, damage: u32) -> HitResult {
    enemy.stun_remaining = enemy.stun_remaining.saturating_sub(damage);
    if enemy.stun_remaining == 0 {
        enemy.enter(EnemyState::Dispersing);
        HitResult {
            stunned: false,
            dispersed: true,
            score_awarded: SCORE_PER_ENEMY,
        }
    } else {
        enemy.enter(EnemyState::Stunned);
        HitResult {
            stunned: true,
            dispersed: false,
            score_awarded: 0,
        }
    }
}

/// Events emitted by an AI tick, for the orchestrator to turn into audio.
#[derive(Clone, Copy, Debug, Default)]
pub struct EnemyEvents {
    /// Number of enemies that newly entered the Alert state this frame.
    pub alerted: u32,
}

/// Tick every enemy's AI for this frame.
pub fn update_enemies(world: &mut World, dt: f32) -> EnemyEvents {
    let World {
        enemies,
        player,
        map,
        ..
    } = world;

    let mut events = EnemyEvents::default();
    for enemy in enemies.iter_mut() {
        tick_taunt(enemy, dt);
        if tick_enemy(enemy, player, map, dt) {
            events.alerted += 1;
        }
    }
    events
}

fn tick_taunt(enemy: &mut Enemy, dt: f32) {
    if let Some(t) = enemy.taunt.as_mut() {
        t.remaining -= dt;
        if t.remaining <= 0.0 {
            enemy.taunt = None;
        }
    }
}

fn tick_enemy(enemy: &mut Enemy, player: &mut Player, map: &Map, dt: f32) -> bool {
    enemy.state_timer += dt;
    let to_player = player.pos - enemy.pos;
    let player_dist = to_player.length();
    let mut alerted = false;

    match enemy.state {
        EnemyState::Idle => {
            if can_see_player(enemy.pos, player.pos, map) {
                enemy.last_seen_player = Some(player.pos);
                trigger_taunt(enemy);
                enemy.enter(EnemyState::Alert);
                alerted = true;
            }
        }
        EnemyState::Alert => {
            if enemy.state_timer >= ALERT_DURATION {
                enemy.enter(EnemyState::Pursue);
            }
        }
        EnemyState::Pursue => {
            let visible = can_see_player(enemy.pos, player.pos, map);
            if visible {
                enemy.last_seen_player = Some(player.pos);
                if player_dist <= ENEMY_ATTACK_RANGE {
                    enemy.attack_cooldown = 0.0;
                    enemy.enter(EnemyState::Attack);
                    return alerted;
                }
            }
            match enemy.last_seen_player {
                Some(target) => {
                    let to_target = target - enemy.pos;
                    if to_target.length() < 0.1 && !visible {
                        // Reached last-known position and player is gone.
                        enemy.last_seen_player = None;
                        enemy.enter(EnemyState::Idle);
                    } else {
                        step_toward(enemy, to_target, dt, map);
                    }
                }
                None => enemy.enter(EnemyState::Idle),
            }
        }
        EnemyState::Attack => {
            if player_dist > ENEMY_ATTACK_RANGE {
                enemy.enter(EnemyState::Pursue);
                return alerted;
            }
            enemy.attack_cooldown -= dt;
            if enemy.attack_cooldown <= 0.0 {
                damage_player(player, ENEMY_DAMAGE);
                enemy.attack_cooldown = ENEMY_ATTACK_COOLDOWN;
            }
        }
        EnemyState::Stunned => {
            if enemy.state_timer >= STUN_DURATION {
                enemy.last_seen_player = Some(player.pos);
                enemy.enter(EnemyState::Pursue);
            }
        }
        EnemyState::Dispersing => {
            // Removal is handled by the orchestrator once the animation ends.
            let _ = DISPERSE_DURATION;
        }
    }
    alerted
}

fn trigger_taunt(enemy: &mut Enemy) {
    if !enemy.has_taunted {
        let idx = (enemy.id.0 as usize) % TAUNTS.len();
        enemy.taunt = Some(Taunt {
            text: TAUNTS[idx],
            remaining: TAUNT_DURATION,
        });
        enemy.has_taunted = true;
    }
}

fn step_toward(enemy: &mut Enemy, dir: Vec2, dt: f32, map: &Map) {
    if dir.length_squared() <= f32::EPSILON {
        return;
    }
    let step = dir.normalized() * (ENEMY_SPEED * dt);
    let try_x = Vec2::new(enemy.pos.x + step.x, enemy.pos.y);
    if !blocked(map, try_x, COLLISION_RADIUS) {
        enemy.pos.x = try_x.x;
    }
    let try_y = Vec2::new(enemy.pos.x, enemy.pos.y + step.y);
    if !blocked(map, try_y, COLLISION_RADIUS) {
        enemy.pos.y = try_y.y;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::{ENEMY_HEALTH, MAX_HEALTH};
    use crate::domain::map::parse_map;
    use crate::domain::{Enemy, EnemyKind, EntityId};

    const OPEN: &str = r#"{
        "name": "Open", "width": 5, "height": 5,
        "grid": [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
        "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 }
    }"#;

    #[test]
    fn los_clear_and_blocked() {
        let map = parse_map(OPEN).unwrap();
        // Clear line within the open interior.
        assert!(can_see_player(
            Vec2::new(1.5, 1.5),
            Vec2::new(3.5, 1.5),
            &map
        ));
        // Beyond detection range.
        assert!(!can_see_player(
            Vec2::new(1.5, 1.5),
            Vec2::new(1.5, 50.0),
            &map
        ));
    }

    #[test]
    fn hit_stuns_then_disperses() {
        let mut e = Enemy::new(
            EntityId(0),
            EnemyKind::RedTape,
            Vec2::new(2.0, 2.0),
            ENEMY_HEALTH,
        );
        let r1 = apply_hit(&mut e, 1);
        assert!(r1.stunned && !r1.dispersed);
        assert_eq!(e.state, EnemyState::Stunned);
        apply_hit(&mut e, 1);
        let r3 = apply_hit(&mut e, 1);
        assert!(r3.dispersed);
        assert_eq!(r3.score_awarded, SCORE_PER_ENEMY);
        assert_eq!(e.state, EnemyState::Dispersing);
    }

    #[test]
    fn enemy_detects_and_pursues() {
        let mut world = World::load(OPEN).unwrap();
        world.enemies.push(Enemy::new(
            EntityId(99),
            EnemyKind::RedTape,
            Vec2::new(3.5, 1.5),
            ENEMY_HEALTH,
        ));
        // Player at (1.5,1.5) facing the enemy down a clear corridor.
        let start = world.enemies[0].pos;
        update_enemies(&mut world, 0.1); // detect → Alert
        assert_eq!(world.enemies[0].state, EnemyState::Alert);
        assert!(world.enemies[0].taunt.is_some());
        // Run enough frames to clear Alert and start pursuing/closing in.
        for _ in 0..120 {
            update_enemies(&mut world, 0.05);
        }
        let moved = world.enemies[0].pos.distance(start) > 0.1;
        let hurt = world.player.health < MAX_HEALTH;
        assert!(moved || hurt, "enemy should pursue and eventually attack");
    }
}
