//! Level data: the serialized JSON format, parsing/validation, the runtime
//! grid model, and door / push-wall animation.

use crate::domain::DecorationKindDef;
use crate::domain::enemy::EnemyKind;
use crate::domain::pickup::PickupKind;
use serde::Deserialize;

// =========================================================================
// Serialized format (serde) — camelCase on disk, snake_case in Rust.
// =========================================================================

#[derive(Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct MapFile {
    pub name: String,
    pub width: u32,
    pub height: u32,
    /// `[y][x]` wall-type ids; 0 = empty.
    pub grid: Vec<Vec<u8>>,
    pub player_spawn: SpawnPoint,
    #[serde(default)]
    pub enemies: Vec<EnemySpawn>,
    #[serde(default)]
    pub pickups: Vec<PickupSpawn>,
    #[serde(default)]
    pub doors: Vec<DoorDef>,
    #[serde(default)]
    pub push_walls: Vec<PushWallDef>,
    #[serde(default)]
    pub decorations: Vec<DecorationDef>,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct SpawnPoint {
    pub x: u32,
    pub y: u32,
    pub angle: f32,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct EnemySpawn {
    pub kind: EnemyKind,
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct PickupSpawn {
    pub kind: PickupKind,
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct DoorDef {
    pub x: u32,
    pub y: u32,
    pub texture: WallTexture,
    pub orientation: Orientation,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct PushWallDef {
    pub x: u32,
    pub y: u32,
    pub texture: WallTexture,
    pub hint_texture: WallTexture,
    pub slide_direction: Direction,
}

#[derive(Deserialize, Clone, Copy)]
#[serde(rename_all = "camelCase")]
pub struct DecorationDef {
    pub kind: DecorationKindDef,
    pub x: u32,
    pub y: u32,
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Orientation {
    Horizontal,
    Vertical,
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum Direction {
    North,
    South,
    East,
    West,
}

impl Direction {
    /// Unit step (dx, dy) in grid space for this direction.
    pub fn step(self) -> (i32, i32) {
        match self {
            Direction::North => (0, -1),
            Direction::South => (0, 1),
            Direction::East => (1, 0),
            Direction::West => (-1, 0),
        }
    }
}

#[derive(Deserialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum WallTexture {
    DoleriteDark,
    PlasterCream,
    PlasterWainscot,
    CommitteeDoor,
    WindowVolcano,
    PortraitWall,
    Bookshelf,
    DoleriteArch,
    PlasterSconce,
    CarpetBlue,
}

impl WallTexture {
    /// Map a raw grid id to a wall texture (0 / unknown => `None`).
    pub fn from_grid_id(id: u8) -> Option<Self> {
        Some(match id {
            1 => WallTexture::DoleriteDark,
            2 => WallTexture::PlasterCream,
            3 => WallTexture::PlasterWainscot,
            4 => WallTexture::CommitteeDoor,
            5 => WallTexture::WindowVolcano,
            6 => WallTexture::PortraitWall,
            7 => WallTexture::Bookshelf,
            8 => WallTexture::DoleriteArch,
            9 => WallTexture::PlasterSconce,
            10 => WallTexture::CarpetBlue,
            _ => return None,
        })
    }

    /// Stable index used to look up the decoded texture in the `TextureSet`.
    pub const fn atlas_index(self) -> usize {
        self as usize
    }
}

// =========================================================================
// Errors
// =========================================================================

#[derive(Debug, thiserror::Error)]
pub enum MapError {
    #[error("malformed map JSON: {0}")]
    Json(#[from] serde_json::Error),
    #[error("invalid map: {0}")]
    Invalid(String),
}

// =========================================================================
// Runtime model
// =========================================================================

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct DoorId(pub usize);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub struct PushWallId(pub usize);

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum TileKind {
    Empty,
    Wall(WallTexture),
    Door(DoorId),
    PushWall(PushWallId),
}

#[derive(Clone, Copy, Debug)]
pub struct Tile {
    pub kind: TileKind,
    /// Blocks movement and rays. Mutated as doors open / push-walls move.
    pub solid: bool,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum DoorState {
    Closed,
    Opening,
    Open,
}

#[derive(Clone, Copy, Debug)]
pub struct Door {
    pub pos: (usize, usize),
    pub state: DoorState,
    pub open_amount: f32, // 0.0 closed .. 1.0 open
    pub texture: WallTexture,
    pub orientation: Orientation,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PushWallState {
    Hidden,
    Sliding,
    Open,
}

#[derive(Clone, Copy, Debug)]
pub struct PushWall {
    pub pos: (usize, usize),
    pub state: PushWallState,
    pub offset: f32, // 0.0 flush .. 2.0 fully slid back
    pub slide_direction: Direction,
    pub texture: WallTexture,
    pub hint_texture: WallTexture,
}

pub struct Map {
    pub width: usize,
    pub height: usize,
    tiles: Vec<Tile>, // row-major: index = y * width + x
    pub doors: Vec<Door>,
    pub push_walls: Vec<PushWall>,
    spawn: SpawnPoint,
}

impl Map {
    pub fn tile(&self, x: usize, y: usize) -> Tile {
        self.tiles[y * self.width + x]
    }

    fn tile_mut(&mut self, x: usize, y: usize) -> &mut Tile {
        &mut self.tiles[y * self.width + x]
    }

    /// Bounds-checked solidity query (out-of-bounds counts as solid).
    pub fn is_solid(&self, x: i32, y: i32) -> bool {
        if x < 0 || y < 0 || x as usize >= self.width || y as usize >= self.height {
            return true;
        }
        self.tiles[y as usize * self.width + x as usize].solid
    }

    pub fn player_spawn(&self) -> SpawnPoint {
        self.spawn
    }

    /// Build the runtime map from a parsed + validated file.
    pub(crate) fn from_file(file: &MapFile) -> Self {
        let width = file.width as usize;
        let height = file.height as usize;
        let mut tiles = vec![
            Tile {
                kind: TileKind::Empty,
                solid: false,
            };
            width * height
        ];

        // Base walls from the grid.
        for (y, row) in file.grid.iter().enumerate() {
            for (x, &id) in row.iter().enumerate() {
                if let Some(tex) = WallTexture::from_grid_id(id) {
                    tiles[y * width + x] = Tile {
                        kind: TileKind::Wall(tex),
                        solid: true,
                    };
                }
            }
        }

        // Doors overlay (closed => solid).
        let mut doors = Vec::with_capacity(file.doors.len());
        for (i, d) in file.doors.iter().enumerate() {
            let (x, y) = (d.x as usize, d.y as usize);
            tiles[y * width + x] = Tile {
                kind: TileKind::Door(DoorId(i)),
                solid: true,
            };
            doors.push(Door {
                pos: (x, y),
                state: DoorState::Closed,
                open_amount: 0.0,
                texture: d.texture,
                orientation: d.orientation,
            });
        }

        // Push-walls overlay (hidden => solid).
        let mut push_walls = Vec::with_capacity(file.push_walls.len());
        for (i, p) in file.push_walls.iter().enumerate() {
            let (x, y) = (p.x as usize, p.y as usize);
            tiles[y * width + x] = Tile {
                kind: TileKind::PushWall(PushWallId(i)),
                solid: true,
            };
            push_walls.push(PushWall {
                pos: (x, y),
                state: PushWallState::Hidden,
                offset: 0.0,
                slide_direction: p.slide_direction,
                texture: p.texture,
                hint_texture: p.hint_texture,
            });
        }

        Self {
            width,
            height,
            tiles,
            doors,
            push_walls,
            spawn: file.player_spawn,
        }
    }
}

/// Parse and validate a level from its JSON text.
pub fn parse_map(json: &str) -> Result<Map, MapError> {
    let file: MapFile = serde_json::from_str(json)?;
    validate(&file)?;
    Ok(Map::from_file(&file))
}

pub(crate) fn validate(file: &MapFile) -> Result<(), MapError> {
    let (w, h) = (file.width as usize, file.height as usize);
    if w == 0 || h == 0 {
        return Err(MapError::Invalid("width and height must be > 0".into()));
    }
    if file.grid.len() != h {
        return Err(MapError::Invalid(format!(
            "grid has {} rows, expected height {}",
            file.grid.len(),
            h
        )));
    }
    for (y, row) in file.grid.iter().enumerate() {
        if row.len() != w {
            return Err(MapError::Invalid(format!(
                "grid row {} has {} cells, expected width {}",
                y,
                row.len(),
                w
            )));
        }
    }

    let in_bounds = |x: u32, y: u32| (x as usize) < w && (y as usize) < h;
    let check = |x: u32, y: u32, what: &str| -> Result<(), MapError> {
        if in_bounds(x, y) {
            Ok(())
        } else {
            Err(MapError::Invalid(format!(
                "{what} at ({x}, {y}) is out of bounds"
            )))
        }
    };

    check(file.player_spawn.x, file.player_spawn.y, "player spawn")?;
    for e in &file.enemies {
        check(e.x, e.y, "enemy spawn")?;
    }
    for p in &file.pickups {
        check(p.x, p.y, "pickup spawn")?;
    }
    for d in &file.doors {
        check(d.x, d.y, "door")?;
    }
    for p in &file.push_walls {
        check(p.x, p.y, "push-wall")?;
    }
    for d in &file.decorations {
        check(d.x, d.y, "decoration")?;
    }
    Ok(())
}

// =========================================================================
// Animation
// =========================================================================

/// Begin opening a closed door.
pub fn open_door(map: &mut Map, id: DoorId) {
    if let Some(door) = map.doors.get_mut(id.0)
        && door.state == DoorState::Closed
    {
        door.state = DoorState::Opening;
    }
}

/// Begin sliding a hidden push-wall.
pub fn activate_push_wall(map: &mut Map, id: PushWallId) {
    if let Some(pw) = map.push_walls.get_mut(id.0)
        && pw.state == PushWallState::Hidden
    {
        pw.state = PushWallState::Sliding;
    }
}

/// Advance door and push-wall animations and update tile solidity.
pub fn animate_map(map: &mut Map, dt: f32) {
    use crate::constants::{DOOR_OPEN_DURATION, PUSHWALL_SLIDE_DURATION};

    // Doors.
    for i in 0..map.doors.len() {
        let door = map.doors[i];
        if door.state == DoorState::Opening {
            let mut d = door;
            d.open_amount += dt / DOOR_OPEN_DURATION;
            if d.open_amount >= 1.0 {
                d.open_amount = 1.0;
                d.state = DoorState::Open;
                let (x, y) = d.pos;
                map.tile_mut(x, y).solid = false;
            }
            map.doors[i] = d;
        }
    }

    // Push-walls.
    for i in 0..map.push_walls.len() {
        let pw = map.push_walls[i];
        if pw.state == PushWallState::Sliding {
            let mut p = pw;
            // Slides 2 cells over the slide duration.
            p.offset += (2.0 / PUSHWALL_SLIDE_DURATION) * dt;
            if p.offset >= 2.0 {
                p.offset = 2.0;
                p.state = PushWallState::Open;
                let (x, y) = p.pos;
                // Reveal the passage: the original cell becomes empty.
                let t = map.tile_mut(x, y);
                t.kind = TileKind::Empty;
                t.solid = false;
            }
            map.push_walls[i] = p;
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const VALID: &str = r#"{
        "name": "Test",
        "width": 3,
        "height": 3,
        "grid": [[1,1,1],[1,0,1],[1,1,1]],
        "playerSpawn": { "x": 1, "y": 1, "angle": 0.0 },
        "enemies": [],
        "pickups": [],
        "doors": [],
        "pushWalls": [],
        "decorations": []
    }"#;

    #[test]
    fn parses_valid_map() {
        let map = parse_map(VALID).expect("should parse");
        assert_eq!(map.width, 3);
        assert_eq!(map.height, 3);
        assert!(map.is_solid(0, 0)); // wall border
        assert!(!map.is_solid(1, 1)); // open centre
    }

    #[test]
    fn out_of_bounds_counts_as_solid() {
        let map = parse_map(VALID).unwrap();
        assert!(map.is_solid(-1, 0));
        assert!(map.is_solid(0, 99));
    }

    #[test]
    fn rejects_mismatched_dimensions() {
        let bad = r#"{
            "name": "Bad", "width": 3, "height": 2,
            "grid": [[1,1,1]],
            "playerSpawn": { "x": 0, "y": 0, "angle": 0.0 }
        }"#;
        assert!(matches!(parse_map(bad), Err(MapError::Invalid(_))));
    }

    #[test]
    fn rejects_spawn_out_of_bounds() {
        let bad = r#"{
            "name": "Bad", "width": 2, "height": 2,
            "grid": [[1,1],[1,1]],
            "playerSpawn": { "x": 5, "y": 5, "angle": 0.0 }
        }"#;
        assert!(matches!(parse_map(bad), Err(MapError::Invalid(_))));
    }

    #[test]
    fn rejects_malformed_json() {
        assert!(matches!(parse_map("{not json"), Err(MapError::Json(_))));
    }

    #[test]
    fn door_opens_and_clears_solidity() {
        let json = r#"{
            "name": "Door", "width": 3, "height": 1,
            "grid": [[1,0,1]],
            "playerSpawn": { "x": 1, "y": 0, "angle": 0.0 },
            "doors": [{ "x": 1, "y": 0, "texture": "committeeDoor", "orientation": "vertical" }]
        }"#;
        let mut map = parse_map(json).unwrap();
        assert!(map.is_solid(1, 0));
        open_door(&mut map, DoorId(0));
        // Advance well past the open duration.
        animate_map(&mut map, 10.0);
        assert!(!map.is_solid(1, 0));
        assert_eq!(map.doors[0].state, DoorState::Open);
    }
}
