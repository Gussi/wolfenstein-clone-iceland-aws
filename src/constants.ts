/**
 * Game balance and rendering constants for "Pots & Parliament".
 * All values are taken directly from the functional design (business-rules.md).
 */

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------
export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 400;
/** Field of view in radians (66 degrees). */
export const FOV = (66 * Math.PI) / 180;
/** Camera plane magnitude = tan(FOV / 2). */
export const CAMERA_PLANE_LENGTH = Math.tan(FOV / 2);
export const TEXTURE_SIZE = 128;
/** Darken factor applied to side-hit (N/S) walls. */
export const WALL_SHADE_FACTOR = 0.7;
/** Sprites farther than this (grid units) are culled. */
export const SPRITE_CULL_DISTANCE = 14;

// ---------------------------------------------------------------------------
// Player
// ---------------------------------------------------------------------------
export const MOVE_SPEED = 3.0; // grid cells / second
export const ROTATION_SPEED = 0.003; // radians / pixel of mouse movement
export const COLLISION_RADIUS = 0.2; // grid units
export const MAX_HEALTH = 100;
export const INTERACTION_RANGE = 1.2; // grid units
export const PICKUP_RADIUS = 0.5; // grid units

// ---------------------------------------------------------------------------
// Weapon (Wooden Spoon)
// ---------------------------------------------------------------------------
export const WEAPON_RANGE = 1.5; // grid units
export const WEAPON_ARC = (60 * Math.PI) / 180; // radians (±30°)
export const WEAPON_DAMAGE = 1; // stun points per hit
export const SWING_DURATION = 0.25; // seconds to hit check
export const RECOVER_DURATION = 0.2; // cooldown after swing
export const TOTAL_ATTACK_TIME = SWING_DURATION + RECOVER_DURATION;

// ---------------------------------------------------------------------------
// Enemy (Red Tape)
// ---------------------------------------------------------------------------
export const ENEMY_HEALTH = 3; // hits to disperse
export const ENEMY_SPEED = 2.0; // grid cells / second
export const ENEMY_DAMAGE = 5; // health removed per attack
export const ENEMY_ATTACK_COOLDOWN = 1.0; // seconds
export const ENEMY_ATTACK_RANGE = 0.8; // grid units
export const DETECTION_RANGE = 8.0; // grid units (LOS)
export const ALERT_DURATION = 0.5; // seconds
export const STUN_DURATION = 0.3; // seconds
export const DISPERSE_DURATION = 0.5; // seconds
export const ENEMY_RADIUS = 0.3; // grid units (collision vs walls)

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------
export const COFFEE_HEAL = 15;
export const KLEINUR_HEAL = 30;

// ---------------------------------------------------------------------------
// Level / world
// ---------------------------------------------------------------------------
export const GRID_SIZE = 32;
export const DOOR_OPEN_DURATION = 0.5; // seconds
export const PUSHWALL_SLIDE_DURATION = 1.5; // seconds
export const PUSHWALL_SLIDE_CELLS = 2;

// ---------------------------------------------------------------------------
// Scoring (connections)
// ---------------------------------------------------------------------------
export const SCORE_PER_ENEMY = 10;
export const SCORE_PER_SECRET = 50;
export const SCORE_LEVEL_COMPLETE = 100;

// ---------------------------------------------------------------------------
// Flow timing
// ---------------------------------------------------------------------------
export const INTRO_DURATION = 5.0; // seconds intro text shows
export const GAME_OVER_DURATION = 1.5; // seconds "give up" animation

// ---------------------------------------------------------------------------
// Enemy taunts (shown when a Red Tape first detects the player)
// ---------------------------------------------------------------------------
export const ENEMY_TAUNTS: readonly string[] = [
  'Ég ætla að segja mömmu þinni!', // "I'm telling your mother!"
  'Vantar þig eyðublað?', // "Need a form?"
  'Þetta er ekki rétt deild!', // "This is the wrong department!"
  'Komdu aftur á mánudag!', // "Come back Monday!"
  'Ertu með tilvísun?', // "Do you have a reference?"
];
export const TAUNT_DISPLAY_TIME = 1.5; // seconds
