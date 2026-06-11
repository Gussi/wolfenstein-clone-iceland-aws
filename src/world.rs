//! The owning game-state container and level (re)construction.

use crate::constants::{ENEMY_HEALTH, MAX_HEALTH};
use crate::domain::map::{Map, MapError, MapFile};
use crate::domain::{Decoration, Enemy, EntityId, FaceExpression, Pickup, Player, Weapon};
use crate::math::Vec2;

/// High-level game state. Timed states carry their timer inside the variant.
#[derive(Clone, Copy, Debug, PartialEq)]
pub enum GameStatus {
    Loading,
    Intro { remaining: f32 },
    Playing,
    Paused,
    GameOver { elapsed: f32 },
    Victory,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Score {
    pub connections: u32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct LevelStats {
    pub enemies_dispersed: u32,
    pub total_enemies: u32,
    pub secrets_found: u32,
    pub total_secrets: u32,
    pub time_seconds: f32,
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Timers {
    pub level_elapsed: f32,
    pub delta: f32,
}

/// Centre-of-cell world position for a grid coordinate.
fn cell_center(x: u32, y: u32) -> Vec2 {
    Vec2::new(x as f32 + 0.5, y as f32 + 0.5)
}

/// Owns all mutable game state for the current level.
pub struct World {
    pub status: GameStatus,
    pub player: Player,
    pub map: Map,
    pub enemies: Vec<Enemy>,
    pub pickups: Vec<Pickup>,
    pub decorations: Vec<Decoration>,
    pub weapon: Weapon,
    pub score: Score,
    pub stats: LevelStats,
    pub timers: Timers,
    next_id: u32,
    /// The parsed level file, kept so the level can be rebuilt on restart.
    source: MapFile,
}

impl World {
    /// Parse a level from JSON and build a fresh world ready for `Intro`.
    pub fn load(json: &str) -> Result<World, MapError> {
        let file: MapFile = serde_json::from_str(json)?;
        crate::domain::map::validate(&file)?;
        Ok(World::from_file(file))
    }

    fn from_file(file: MapFile) -> World {
        let map = Map::from_file(&file);
        let spawn = file.player_spawn;
        let player = Player::new(cell_center(spawn.x, spawn.y), spawn.angle, MAX_HEALTH);

        let mut world = World {
            status: GameStatus::Loading,
            player,
            map,
            enemies: Vec::new(),
            pickups: Vec::new(),
            decorations: Vec::new(),
            weapon: Weapon::default(),
            score: Score::default(),
            stats: LevelStats::default(),
            timers: Timers::default(),
            next_id: 0,
            source: file,
        };
        world.spawn_entities();
        world
    }

    /// Rebuild this world from its source level (used on restart). Cheap: the
    /// parsed `MapFile` is retained, so no re-parsing is needed.
    pub fn reset(&mut self) {
        let rebuilt = World::from_file(self.source.clone());
        *self = rebuilt;
    }

    fn next_id(&mut self) -> EntityId {
        let id = EntityId(self.next_id);
        self.next_id += 1;
        id
    }

    /// Populate enemies, pickups, and decorations from the source file.
    fn spawn_entities(&mut self) {
        // Clone the spawn lists out first to avoid borrowing `self.source`
        // while mutating `self`.
        let enemies = self.source.enemies.clone();
        let pickups = self.source.pickups.clone();
        let decorations = self.source.decorations.clone();
        let total_secrets = self.source.push_walls.len() as u32;

        for e in enemies {
            let id = self.next_id();
            self.enemies
                .push(Enemy::new(id, e.kind, cell_center(e.x, e.y), ENEMY_HEALTH));
        }
        for p in pickups {
            let id = self.next_id();
            self.pickups.push(Pickup {
                id,
                kind: p.kind,
                pos: cell_center(p.x, p.y),
            });
        }
        for d in decorations {
            self.decorations.push(Decoration {
                kind: d.kind.into(),
                pos: cell_center(d.x, d.y),
            });
        }

        self.stats.total_enemies = self.enemies.len() as u32;
        self.stats.total_secrets = total_secrets;
    }

    /// Number of enemies still active (not yet dispersing).
    pub fn alive_enemy_count(&self) -> usize {
        self.enemies.iter().filter(|e| e.is_alive()).count()
    }

    /// Current HUD face expression for the player.
    pub fn face_expression(&self) -> FaceExpression {
        let won = self.status == GameStatus::Victory;
        FaceExpression::from_health(self.player.health, MAX_HEALTH, won)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const LEVEL: &str = r#"{
        "name": "Tiny",
        "width": 4,
        "height": 4,
        "grid": [[1,1,1,1],[1,0,0,1],[1,0,0,1],[1,1,1,1]],
        "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 },
        "enemies": [{ "kind": "redTape", "x": 2, "y": 2 }],
        "pickups": [{ "kind": "coffee", "x": 1, "y": 2 }],
        "doors": [],
        "pushWalls": [],
        "decorations": [{ "kind": "plant", "x": 2, "y": 1 }]
    }"#;

    #[test]
    fn loads_and_spawns() {
        let w = World::load(LEVEL).expect("load");
        assert_eq!(w.enemies.len(), 1);
        assert_eq!(w.pickups.len(), 1);
        assert_eq!(w.decorations.len(), 1);
        assert_eq!(w.stats.total_enemies, 1);
        assert_eq!(w.player.health, MAX_HEALTH);
        assert_eq!(w.alive_enemy_count(), 1);
    }

    #[test]
    fn reset_restores_initial_state() {
        let mut w = World::load(LEVEL).unwrap();
        w.player.health = 1;
        w.enemies.clear();
        w.score.connections = 999;
        w.reset();
        assert_eq!(w.player.health, MAX_HEALTH);
        assert_eq!(w.enemies.len(), 1);
        assert_eq!(w.score.connections, 0);
    }
}
