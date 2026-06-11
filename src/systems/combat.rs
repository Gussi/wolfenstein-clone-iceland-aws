//! Wooden-spoon combat: weapon phases and single-target melee hit detection
//! (US-05, US-06).

use crate::constants::{
    RECOVER_DURATION, SWING_DURATION, WEAPON_ARC_RADIANS, WEAPON_DAMAGE, WEAPON_RANGE,
};
use crate::domain::{EntityId, WeaponPhase};
use crate::math::Vec2;
use crate::systems::ai::apply_hit;
use crate::world::World;

/// Outcome of a swing, for the orchestrator to turn into sound/score effects.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct AttackOutcome {
    /// Closest enemy struck, if any.
    pub hit: Option<EntityId>,
    /// Whether that hit dispersed the enemy.
    pub dispersed: bool,
}

/// Advance the weapon's swing/recover phase timers.
pub fn update_weapon(world: &mut World, dt: f32) {
    let w = &mut world.weapon;
    w.timer += dt;
    match w.phase {
        WeaponPhase::Idle => {}
        WeaponPhase::Swinging => {
            if w.timer >= SWING_DURATION {
                w.phase = WeaponPhase::Recovering;
                w.timer = 0.0;
            }
        }
        WeaponPhase::Recovering => {
            if w.timer >= RECOVER_DURATION {
                w.phase = WeaponPhase::Idle;
                w.timer = 0.0;
                w.hit_checked = false;
            }
        }
    }
}

/// Signed angle (radians) from `a` to `b`.
fn angle_between(a: Vec2, b: Vec2) -> f32 {
    let cross = a.x * b.y - a.y * b.x;
    let dot = a.dot(b);
    cross.atan2(dot)
}

/// Start a swing and resolve the hit against the single closest enemy within
/// range and the attack arc. The caller is responsible for gating on
/// [`crate::domain::Weapon::is_ready`].
pub fn resolve_attack(world: &mut World) -> AttackOutcome {
    world.weapon.phase = WeaponPhase::Swinging;
    world.weapon.timer = 0.0;
    world.weapon.hit_checked = true;

    let player_pos = world.player.pos;
    let player_dir = world.player.dir;
    let half_arc = WEAPON_ARC_RADIANS / 2.0;

    let mut best: Option<(usize, f32)> = None;
    for (i, e) in world.enemies.iter().enumerate() {
        if !e.is_alive() {
            continue;
        }
        let to = e.pos - player_pos;
        let dist = to.length();
        if dist > WEAPON_RANGE {
            continue;
        }
        if angle_between(player_dir, to).abs() > half_arc {
            continue;
        }
        if best.is_none_or(|(_, bd)| dist < bd) {
            best = Some((i, dist));
        }
    }

    match best {
        Some((idx, _)) => {
            let res = apply_hit(&mut world.enemies[idx], WEAPON_DAMAGE);
            AttackOutcome {
                hit: Some(world.enemies[idx].id),
                dispersed: res.dispersed,
            }
        }
        None => AttackOutcome::default(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::ENEMY_HEALTH;
    use crate::domain::{Enemy, EnemyKind, EntityId};

    fn world_with_enemy_at(pos: Vec2) -> World {
        let level = r#"{
            "name": "Arena", "width": 5, "height": 5,
            "grid": [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
            "playerSpawn": { "x": 2, "y": 2, "angle": 0.0 }
        }"#;
        let mut w = World::load(level).unwrap();
        w.enemies.push(Enemy::new(
            EntityId(1),
            EnemyKind::RedTape,
            pos,
            ENEMY_HEALTH,
        ));
        w
    }

    #[test]
    fn hits_enemy_in_front_within_range() {
        // Player at (2.5,2.5) facing +x; enemy just ahead.
        let mut w = world_with_enemy_at(Vec2::new(3.2, 2.5));
        let out = resolve_attack(&mut w);
        assert_eq!(out.hit, Some(EntityId(1)));
    }

    #[test]
    fn misses_enemy_behind() {
        let mut w = world_with_enemy_at(Vec2::new(1.6, 2.5)); // behind (−x)
        let out = resolve_attack(&mut w);
        assert_eq!(out.hit, None);
    }

    #[test]
    fn misses_enemy_out_of_range() {
        let mut w = world_with_enemy_at(Vec2::new(3.9, 2.5)); // >WEAPON_RANGE? dist 1.4 < 1.5
        // Place clearly out of range instead:
        w.enemies[0].pos = Vec2::new(2.5 + WEAPON_RANGE + 0.5, 2.5);
        let out = resolve_attack(&mut w);
        assert_eq!(out.hit, None);
    }

    #[test]
    fn weapon_cycles_back_to_idle() {
        let mut w = world_with_enemy_at(Vec2::new(3.2, 2.5));
        resolve_attack(&mut w);
        assert_eq!(w.weapon.phase, WeaponPhase::Swinging);
        update_weapon(&mut w, SWING_DURATION + 0.01);
        assert_eq!(w.weapon.phase, WeaponPhase::Recovering);
        update_weapon(&mut w, RECOVER_DURATION + 0.01);
        assert_eq!(w.weapon.phase, WeaponPhase::Idle);
        assert!(w.weapon.is_ready());
    }
}
