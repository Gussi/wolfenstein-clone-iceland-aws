/**
 * Game balance and rendering constants for "Pots & Parliament".
 * Values sourced from aidlc-docs/construction/prototype/functional-design/business-rules.md
 */

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 400;
export const FOV = 1.152; // 66 degrees in radians
export const CAMERA_PLANE_LENGTH = 0.66; // tan(FOV/2)
export const TEXTURE_SIZE = 128;
export const WALL_SHADE_FACTOR = 0.7; // darken factor for side-hit walls

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
export const MOVE_SPEED = 3.0; // grid cells per second
export const ROTATION_SPEED = 0.003; // radians per pixel of mouse movement
export const COLLISION_RADIUS = 0.2; // grid units
export const MAX_HEALTH = 100;
export const INTERACTION_RANGE = 1.2; // grid units
export const PICKUP_RADIUS = 0.5; // grid units

// ---------------------------------------------------------------------------
// Weapon (Wooden Spoon)
// ---------------------------------------------------------------------------
export const WEAPON_RANGE = 1.5; // grid units
export const WEAPON_ARC = 1.047; // 60 degrees in radians (±30°)
export const WEAPON_DAMAGE = 1; // stun points per hit
export const SWING_DURATION = 0.25; // seconds to hit-check midpoint
export const RECOVER_DURATION = 0.2; // cooldown after swing

// ---------------------------------------------------------------------------
// Enemy (Red Tape)
// ---------------------------------------------------------------------------
export const ENEMY_HEALTH = 3; // hits to disperse
export const ENEMY_SPEED = 2.0; // grid cells per second
export const ENEMY_DAMAGE = 5; // health points removed per attack
export const ENEMY_ATTACK_COOLDOWN = 1.0; // seconds between enemy attacks
export const ENEMY_ATTACK_RANGE = 0.8; // grid units
export const DETECTION_RANGE = 8.0; // grid units (line-of-sight)
export const ALERT_DURATION = 0.5; // seconds paused in ALERT state
export const STUN_DURATION = 0.3; // seconds staggered after hit
export const DISPERSE_DURATION = 0.5; // death animation seconds
export const SCORE_PER_ENEMY = 10; // connections per dispersed enemy

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------
export const COFFEE_HEAL = 15;
export const KLEINUR_HEAL = 30;

// ---------------------------------------------------------------------------
// Level / Animation
// ---------------------------------------------------------------------------
export const DOOR_OPEN_DURATION = 0.5; // seconds for door to slide open
export const PUSHWALL_SLIDE_DURATION = 1.5; // seconds for push-wall to slide 2 cells
export const PUSHWALL_SLIDE_CELLS = 2;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------
export const SCORE_SECRET_FOUND = 50;
export const SCORE_LEVEL_COMPLETE = 100;

// ---------------------------------------------------------------------------
// Game flow timing
// ---------------------------------------------------------------------------
export const INTRO_DURATION = 5.0; // seconds intro text shows (or until keypress)
export const GAMEOVER_ANIM_DURATION = 1.5; // seconds "give up" animation
export const TAUNT_DURATION = 1.5; // seconds a taunt floats above an enemy

// ---------------------------------------------------------------------------
// Rendering tuning
// ---------------------------------------------------------------------------
export const SPRITE_CULL_DISTANCE = 14; // grid units — skip sprites farther than this
export const MAX_DELTA_TIME = 0.05; // clamp frame delta to avoid tunneling

// ---------------------------------------------------------------------------
// Enemy taunts (US-24)
// ---------------------------------------------------------------------------
export const ENEMY_TAUNTS: readonly string[] = [
  "Ég ætla að segja mömmu þinni!", // I'm telling your mother!
  "Vantar þig eyðublað?", // Need a form?
  "Þetta er ekki rétt deild!", // This is the wrong department!
  "Komdu aftur á mánudag!", // Come back Monday!
  "Ertu með tilvísun?", // Do you have a reference?
];
