//! Game balance constants. Single source of tuned values (see
//! `aidlc-docs/construction/prototype/functional-design/business-rules.md`).

// --- Rendering ---
pub const SCREEN_WIDTH: usize = 640;
pub const SCREEN_HEIGHT: usize = 400;
pub const FOV_RADIANS: f32 = 1.152; // ~66 degrees
pub const CAMERA_PLANE_LENGTH: f32 = 0.66; // tan(FOV / 2)
pub const TEXTURE_SIZE: usize = 128;
pub const WALL_SHADE_FACTOR: f32 = 0.7; // darken side-hit (N/S) walls

// --- Player ---
pub const MOVE_SPEED: f32 = 3.0; // grid cells / second
pub const ROTATION_SPEED: f32 = 0.003; // radians per pixel of mouse movement
pub const COLLISION_RADIUS: f32 = 0.2; // grid units
pub const MAX_HEALTH: u32 = 100;
pub const INTERACTION_RANGE: f32 = 1.2; // grid units
pub const PICKUP_RADIUS: f32 = 0.5; // grid units

// --- Weapon (Wooden Spoon) ---
pub const WEAPON_RANGE: f32 = 1.5; // grid units
pub const WEAPON_ARC_RADIANS: f32 = 1.047; // ~60 degrees (full cone)
pub const WEAPON_DAMAGE: u32 = 1; // stun points per hit
pub const SWING_DURATION: f32 = 0.25; // seconds to hit check
pub const RECOVER_DURATION: f32 = 0.2; // cooldown after swing

// --- Enemy (Red Tape) ---
pub const ENEMY_HEALTH: u32 = 3; // hits to disperse
pub const ENEMY_SPEED: f32 = 2.0; // grid cells / second
pub const ENEMY_DAMAGE: u32 = 5; // health removed per attack
pub const ENEMY_ATTACK_COOLDOWN: f32 = 1.0; // seconds
pub const ENEMY_ATTACK_RANGE: f32 = 0.8; // grid units
pub const DETECTION_RANGE: f32 = 8.0; // grid units (line of sight)
pub const ALERT_DURATION: f32 = 0.5; // seconds
pub const STUN_DURATION: f32 = 0.3; // seconds
pub const DISPERSE_DURATION: f32 = 0.5; // seconds before removal

// --- Level / flow ---
pub const GRID_SIZE: usize = 32;
pub const DOOR_OPEN_DURATION: f32 = 0.5; // seconds
pub const PUSHWALL_SLIDE_DURATION: f32 = 1.5; // seconds to slide 2 cells
pub const INTRO_DURATION: f32 = 5.0; // seconds the intro text lingers
pub const GAME_OVER_DURATION: f32 = 1.5; // "give up and go home" animation

// --- Scoring (connections) ---
pub const SCORE_PER_ENEMY: u32 = 10;
pub const SCORE_PER_SECRET: u32 = 50;
pub const SCORE_LEVEL_COMPLETE: u32 = 100;

// --- Taunts ---
pub const TAUNT_DURATION: f32 = 1.5; // seconds on screen

/// Shown once above an enemy when it first detects the player.
pub const TAUNTS: [&str; 5] = [
    "Ég ætla að segja mömmu þinni!", // "I'm telling your mother!"
    "Vantar þig eyðublað?",          // "Need a form?"
    "Þetta er ekki rétt deild!",     // "This is the wrong department!"
    "Komdu aftur á mánudag!",        // "Come back Monday!"
    "Ertu með tilvísun?",            // "Do you have a reference?"
];
