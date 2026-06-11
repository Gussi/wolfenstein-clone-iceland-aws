// Game balance constants for Pots & Parliament
// Source: aidlc-docs/construction/prototype/functional-design/business-rules.md

// ---------------------------------------------------------------------------
// Rendering
// ---------------------------------------------------------------------------

export const SCREEN_WIDTH = 640;
export const SCREEN_HEIGHT = 400;
export const FOV = (66 * Math.PI) / 180; // 66 degrees in radians
export const CAMERA_PLANE_LENGTH = Math.tan(FOV / 2); // ~0.65
export const TEXTURE_SIZE = 128;
export const WALL_SHADE_FACTOR = 0.7; // side-hit walls darkened
export const MAX_SPRITE_DISTANCE = 16; // cull sprites farther than this

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
export const WEAPON_ARC = (60 * Math.PI) / 180; // 60 degrees total cone
export const WEAPON_DAMAGE = 1;
export const SWING_DURATION = 0.25; // seconds to hit point
export const RECOVER_DURATION = 0.2; // cooldown after swing
export const WEAPON_SWING_FRAMES = 3;

// ---------------------------------------------------------------------------
// Enemy (Red Tape)
// ---------------------------------------------------------------------------

export const ENEMY_HEALTH = 3; // hits to disperse
export const ENEMY_SPEED = 2.0; // grid cells per second
export const ENEMY_DAMAGE = 5;
export const ENEMY_ATTACK_COOLDOWN = 1.0; // seconds
export const ENEMY_ATTACK_RANGE = 0.8; // grid units
export const DETECTION_RANGE = 8.0; // grid units
export const ALERT_DURATION = 0.5; // seconds
export const STUN_DURATION = 0.3; // seconds
export const DISPERSE_DURATION = 0.5; // seconds
export const SCORE_PER_ENEMY = 10;
export const ENEMY_COLLISION_RADIUS = 0.25;

// Enemy sprite animation
export const ENEMY_WALK_FRAME_TIME = 0.15; // seconds per walk frame
export const ENEMY_DISPERSE_FRAME_TIME = DISPERSE_DURATION / 3;

// ---------------------------------------------------------------------------
// Pickups
// ---------------------------------------------------------------------------

export const COFFEE_HEAL = 15;
export const KLEINUR_HEAL = 30;

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

export const SCORE_PER_SECRET = 50;
export const LEVEL_COMPLETE_BONUS = 100;

// ---------------------------------------------------------------------------
// Map / level animations
// ---------------------------------------------------------------------------

export const DOOR_OPEN_DURATION = 0.5; // seconds
export const PUSHWALL_SLIDE_DURATION = 1.5; // seconds
export const PUSHWALL_SLIDE_DISTANCE = 2; // grid cells

// ---------------------------------------------------------------------------
// Game flow
// ---------------------------------------------------------------------------

export const INTRO_DURATION = 4.0; // seconds (auto-dismiss intro text)
export const GAME_OVER_DURATION = 2.0; // seconds before restart prompt
export const TAUNT_DURATION = 1.5; // seconds taunt text shows

// ---------------------------------------------------------------------------
// HUD thresholds (health fraction)
// ---------------------------------------------------------------------------

export const FACE_HURT_THRESHOLD = 0.75;
export const FACE_CRITICAL_THRESHOLD = 0.4;

// ---------------------------------------------------------------------------
// Enemy taunts (Icelandic with English context in comments)
// ---------------------------------------------------------------------------

export const ENEMY_TAUNTS: string[] = [
  'Ég segi mömmu þinni!', // I'm telling your mother!
  'Vantar þig eyðublað?', // Need a form?
  'Þetta er röng deild!', // This is the wrong department!
  'Komdu aftur á mánudag!', // Come back Monday!
  'Ertu með tilvísun?', // Do you have a reference?
];
