# User Stories — "Pots & Parliament" Prototype

## Story Organization
Stories are organized by game system (feature-based breakdown). Each story targets the prototype scope: 1 level, 1 weapon, 1 enemy type, core mechanics.

---

## Epic 1: Core Movement & Exploration

### US-01: Basic Movement
**As a** player, **I want to** move forward, backward, and strafe left/right using WASD keys **so that** I can navigate the level fluidly.

**Acceptance Criteria:**
- [ ] WASD keys control forward/backward/strafe movement
- [ ] Movement feels fast and arcade-like (no acceleration delay)
- [ ] Player cannot walk through walls
- [ ] Movement speed is consistent regardless of frame rate

### US-02: Mouse Look
**As a** player, **I want to** rotate my view horizontally using the mouse **so that** I can look around and aim at enemies.

**Acceptance Criteria:**
- [ ] Horizontal mouse movement rotates the player view
- [ ] Rotation is smooth and responsive (no input lag)
- [ ] Sensitivity feels appropriate for fast-paced action
- [ ] No vertical look (Wolf3D style — horizontal only)

### US-03: Door Interaction
**As a** player, **I want to** open doors by pressing an interaction key (E or Space) **so that** I can progress through the level.

**Acceptance Criteria:**
- [ ] Pressing interaction key opens doors within range
- [ ] Doors have an opening animation (sliding open)
- [ ] Doors are visually distinct from walls
- [ ] Player can only open doors when facing them and within interaction range

### US-04: Wall Collision
**As a** player, **I want** solid wall collision **so that** I can't clip through geometry and the level feels physical.

**Acceptance Criteria:**
- [ ] Player slides along walls when moving into them at an angle
- [ ] No clipping through corners or thin walls
- [ ] Collision feels natural, not sticky

---

## Epic 2: Combat System

### US-05: Weapon Attack (Wooden Spoon)
**As a** player, **I want to** attack with the wooden spoon by clicking the mouse **so that** I can stun enemies.

**Acceptance Criteria:**
- [ ] Left mouse click triggers attack animation
- [ ] Attack has a short range (melee weapon)
- [ ] Attack plays a satisfying swing animation on the HUD weapon display
- [ ] Attack has a brief cooldown between swings (no spam-clicking for instant kills)

### US-06: Enemy Stun Mechanic
**As a** player, **I want to** see enemies react when I hit them **so that** I know my attacks are landing.

**Acceptance Criteria:**
- [ ] Enemies flash or stagger when hit
- [ ] A hit sound plays on successful contact
- [ ] After enough hits, enemy plays a "dispersed" animation and disappears
- [ ] Enemy stun threshold feels fair for the frantic arcade pacing (2-3 hits for Red Tape)

### US-07: Enemy Attack
**As a** player, **I want** enemies to attack me **so that** there is challenge and tension.

**Acceptance Criteria:**
- [ ] Red Tape enemies deal damage when they reach the player
- [ ] Player receives clear feedback when hit (screen flash, sound, face portrait change)
- [ ] Damage amount is balanced — individual hits are small but swarms are dangerous
- [ ] Player has time to react before being overwhelmed

### US-08: Enemy AI (Red Tape)
**As a** player, **I want** enemies to pursue me when they detect me **so that** combat feels active and threatening.

**Acceptance Criteria:**
- [ ] Red Tape enemies patrol a small area when unaware of player
- [ ] Enemies detect the player within a certain range/line-of-sight
- [ ] Once alerted, enemies move toward the player
- [ ] Enemy movement is fast enough to feel threatening but slow enough to outrun
- [ ] Multiple enemies approaching creates the "swarming" feel

---

## Epic 3: Level Design & Rendering

### US-09: Raycaster Rendering
**As a** player, **I want to** see a 3D first-person view of the level **so that** I feel immersed in the Icelandic parliament building.

**Acceptance Criteria:**
- [ ] Walls render with correct perspective (closer walls taller, farther walls shorter)
- [ ] Textured walls at 128x128 or 256x256 pixel art resolution
- [ ] Floor and ceiling are rendered (solid color or textured)
- [ ] Consistent 60fps on modern browsers
- [ ] Distinct visual styles for lobby section vs. committee corridor section
- [ ] Visual style is architecturally faithful to Alþingishúsið and Icelandic government buildings (see US-25)

### US-10: Sprite Rendering
**As a** player, **I want to** see enemies and pickups as sprites in the 3D view **so that** I can identify and interact with them.

**Acceptance Criteria:**
- [ ] Enemy sprites render at correct scale based on distance
- [ ] Sprites always face the player (billboard rendering)
- [ ] Sprites are sorted correctly (no rendering behind walls)
- [ ] Pickup items are visible and recognizable

### US-11: Level Loading from JSON
**As a** developer, **I want** levels to load from JSON map files **so that** I can edit and iterate on level design without recompiling.

**Acceptance Criteria:**
- [ ] Level loads from a JSON file defining grid, walls, entities, and spawns
- [ ] Map format supports: wall types, door positions, entity placements, player spawn
- [ ] Invalid map files produce a clear error message
- [ ] Level renders correctly after loading

### US-12: Push-Wall Secret
**As an** explorer, **I want to** discover a hidden push-wall **so that** I feel rewarded for paying attention to the environment.

**Acceptance Criteria:**
- [ ] At least 1 push-wall in the prototype level
- [ ] Push-wall activates on interaction (same key as doors)
- [ ] Wall slides back to reveal a hidden room
- [ ] Hidden room contains a reward (health pickup or score bonus)
- [ ] Subtle visual hint that this wall is different (slightly off-color texture)

---

## Epic 4: HUD & Feedback

### US-13: Health Display
**As a** player, **I want to** see my current health (patience) on screen **so that** I know how close I am to losing.

**Acceptance Criteria:**
- [ ] Health bar or numeric value displayed in Wolf3D-style bottom HUD
- [ ] Health updates immediately when taking damage or picking up health items
- [ ] Visual warning when health is critically low (flashing, color change)

### US-14: Weapon Display
**As a** player, **I want to** see my current weapon on the HUD **so that** I have visual feedback during combat.

**Acceptance Criteria:**
- [ ] Wooden spoon sprite displayed at bottom-center of screen
- [ ] Attack animation plays on the weapon sprite when attacking
- [ ] Weapon display is clear and doesn't obstruct gameplay view

### US-15: Face Portrait
**As a** player, **I want to** see a face portrait that reacts to game events **so that** I get personality feedback from the protagonist.

**Acceptance Criteria:**
- [ ] Face portrait displayed in the HUD (classic Wolf3D position)
- [ ] Face reacts to damage (pained expression)
- [ ] Face shows neutral/determined expression during normal gameplay
- [ ] At least 2-3 expression states (normal, hurt, critical health)

### US-16: Connections Counter
**As a** player, **I want to** see my "connections" score on screen **so that** I can track my progress.

**Acceptance Criteria:**
- [ ] Connections counter displayed in the HUD
- [ ] Counter increments when enemies are dispersed
- [ ] Counter increments when secrets are discovered
- [ ] Display is readable and positioned consistently

---

## Epic 5: Audio

### US-17: Weapon Sound Effects
**As a** player, **I want to** hear sound effects when I attack **so that** combat feels impactful.

**Acceptance Criteria:**
- [ ] Swing sound plays on attack
- [ ] Hit sound plays on successful enemy contact (distinct from miss)
- [ ] Sounds are short and punchy (no long audio clips blocking action)

### US-18: Enemy Sound Effects
**As a** player, **I want to** hear enemies **so that** I'm aware of threats and combat feels lively.

**Acceptance Criteria:**
- [ ] Enemy alert sound when they detect the player
- [ ] Enemy attack/contact sound
- [ ] Enemy "dispersed" sound (comedic poof/pop)
- [ ] Ambient enemy chatter/noise when nearby (optional for prototype)

### US-19: Environmental Audio
**As a** player, **I want to** hear environmental sounds **so that** the space feels alive.

**Acceptance Criteria:**
- [ ] Door opening sound
- [ ] Secret discovery sound (satisfying revelation)
- [ ] Pickup collection sound
- [ ] Background ambient sound (minimal — building hum or distant commotion)

---

## Epic 6: Game Flow

### US-20: Level Start
**As a** player, **I want** a brief intro when the level starts **so that** I understand the context.

**Acceptance Criteria:**
- [ ] Brief text overlay at level start ("You just need to file one form...")
- [ ] Text dismisses on keypress or after a few seconds
- [ ] Player spawns at designated spawn point after intro
- [ ] All enemies and pickups are in their starting positions

### US-21: Death / Game Over
**As a** player, **I want** a comedic death sequence **so that** losing feels funny rather than frustrating.

**Acceptance Criteria:**
- [ ] When health reaches zero, brief "give up and go home" animation/text plays
- [ ] Tone is comedic (protagonist just gives up, not dramatic death)
- [ ] After animation, player can restart the level immediately
- [ ] Restart is fast (no long loading)

### US-22: Level Complete
**As a** player, **I want to** know when I've beaten the level **so that** I feel accomplished.

**Acceptance Criteria:**
- [ ] Level complete triggers when all enemies are dispersed
- [ ] Victory message/screen displays with comedic flair
- [ ] End-of-level stats shown: enemies dispersed, secrets found, connections score
- [ ] Clear "play again" or "you win the prototype" option

---

## Epic 7: Pickups

### US-23: Health Pickup
**As a** player, **I want to** collect coffee/kleinur to restore patience (health) **so that** I can survive longer.

**Acceptance Criteria:**
- [ ] Health pickups are visible sprites in the level
- [ ] Walking over a pickup collects it automatically
- [ ] Health is restored by a set amount (does not exceed max)
- [ ] Collection sound plays
- [ ] Pickup disappears after collection

### US-24: Enemy Taunts (Minimal Narrative)
**As a** player, **I want** enemies to display brief taunts **so that** the satirical tone is maintained during gameplay.

**Acceptance Criteria:**
- [ ] Red Tape enemies occasionally display a brief text taunt when alerted (e.g., "I'm telling your mother!")
- [ ] Taunts appear as floating text or brief UI popup
- [ ] Taunts are short (under 5 words) and don't obstruct gameplay
- [ ] Taunts rotate from a small pool (3-5 different lines)

---

## Epic 8: Visual Authenticity (Icelandic Parliament Architecture)

### US-25: Architecturally Accurate Environment Textures
**As a** player, **I want** the level to visually evoke real Icelandic parliament and government buildings **so that** the satire feels grounded in a recognizable setting.

**Acceptance Criteria:**
- [ ] **Exterior/Structural Walls**: Dark hewn dolerite (basalt) stone texture — the iconic near-black rough-cut stone of Alþingishúsið's exterior, used for structural/outer corridor walls
- [ ] **Interior Walls**: Smooth white/cream plastered walls (reflecting Alþingishúsið's interior finish), with subtle wainscoting or chair-rail detail where appropriate
- [ ] **Floors**: Dark polished stone or dark wood parquet patterns (consistent with 19th-century Nordic institutional buildings)
- [ ] **Doors**: Dark-stained wooden doors with simple neoclassical panel detailing and brass/bronze hardware
- [ ] **Committee Corridor Section**: Repeating identical doorways along cream-plastered walls (the "endless committee rooms" joke grounded in real architecture)
- [ ] **Lobby/Entry Section**: Taller ceilings implied through texture scale, exposed dark stone accents, neoclassical archways or pilasters
- [ ] **Ceiling**: Ornate plaster ceiling details (coffered or molded patterns) rendered as ceiling texture
- [ ] **Windows**: Tall, narrow windows with volcanic landscape/erupting volcano visible through them (per the brief's recurring gag — everyone inside ignores it)
- [ ] **Decorative Elements**: Period-appropriate wall sconces, portrait frames (satirical — portraits of "nobody in particular"), Icelandic coat of arms motifs
- [ ] **Color Palette**: Muted institutional tones — dark basalt gray, cream/off-white plaster, dark wood browns, brass accents, deep blue carpet (Alþingi chamber color)
- [ ] **Annex Transition**: Visual shift when entering "committee wing" — slightly more modern materials (the 1908 Kringlan rotunda and 2002 Skálinn extension as inspiration for newer bureaucratic areas)

**Visual Reference Notes** (for texture artists/generation):
The primary architectural references are:
1. **Alþingishúsið** (Parliament House, 1881): Neoclassical, dark Icelandic dolerite exterior, plastered interiors, designed by Ferdinand Meldahl
2. **Stjórnarráðshúsið** (Government House/PM Office): 18th-century converted building, similar plastered interiors with formal character
3. **Surrounding Austurvöllur government district**: Mix of 19th-century stone buildings and 20th-century functional annexes

The game should read as "clearly this is an Icelandic government building" through:
- The distinctive dark volcanic stone (unique to Iceland)
- Nordic neoclassical restraint (not ornate like British parliament, not modernist — somewhere in between)
- Small-country scale (intimate rooms, not grand halls)
- Specific details: the 1881 date motif, stars pattern, simple but dignified furnishings

---

## INVEST Criteria Validation

| Story | Independent | Negotiable | Valuable | Estimable | Small | Testable |
|-------|:-----------:|:----------:|:--------:|:---------:|:-----:|:--------:|
| US-01 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-02 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-03 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-04 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-05 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-06 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-07 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-08 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-09 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-10 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-11 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-12 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-13 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-14 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-15 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-16 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-17 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-18 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-19 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-20 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-21 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-22 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-23 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-24 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| US-25 | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

All 25 stories meet INVEST criteria.
