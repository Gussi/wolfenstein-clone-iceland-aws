# Requirements Document — "Pots & Parliament"

## Intent Analysis

- **User Request**: Build a Wolfenstein 3D-style raycaster shooter satirizing Icelandic institutional dysfunction
- **Request Type**: New Project (Greenfield)
- **Scope**: System-wide (full game with multiple systems)
- **Complexity**: Complex (raycaster engine, AI, level design, audio, multiple game mechanics)
- **Initial Deliverable**: Playable prototype — 1 level demonstrating core mechanics

---

## Technical Decisions

| Decision | Choice |
|----------|--------|
| Platform | Web browser only (HTML5) |
| Language | TypeScript |
| Framework | Lightweight game library (Phaser or PixiJS) |
| Textures | Pixel art at 128x128 or 256x256 resolution |
| Audio | Icelandic-influenced soundtrack + sound effects |
| Map Format | JSON/YAML files loaded at runtime |
| Hosting | No specific cloud requirement (no AWS services) |
| Testing | Partial property-based testing (pure functions, serialization) |
| Security | Not enforced (prototype-grade) |

---

## Functional Requirements

### FR-01: Raycaster Rendering Engine
- Grid-based raycasting renderer (DDA algorithm or equivalent)
- Wall rendering with textured surfaces at 128x128 or 256x256 pixel art resolution
- Floor and ceiling rendering
- Sprite rendering for enemies, pickups, and decorations
- Push-wall secret mechanic (walls that slide open when interacted with)
- Consistent frame rate targeting 60fps in modern browsers

### FR-02: Player Movement and Controls
- Classic FPS movement: forward, backward, strafe left, strafe right
- Mouse look (horizontal rotation only, Wolf3D style)
- Keyboard + mouse input scheme
- Interaction key for doors, push-walls, and pickups
- Fast arcade-style movement speed

### FR-03: Combat System (Nonlethal Slapstick)
- Weapons stun, disperse, and humiliate — no killing, no gore
- Weapon progression for full game: wooden spoon → frying pan → pot-and-ladle (area stun) → Búsáhöld Barrage (crowd summon)
- **Prototype scope**: 1 weapon (wooden spoon)
- Hit feedback: visual stun effect on enemies
- Enemies are "dispersed" (disappear with comedic effect) when stunned enough

### FR-04: Enemy System
- Enemy types for full game: Red Tape (swarm), Form-Pushers (ranged), Spin Doctors (debuff), Lobbyist-blobs (spawner), Útrás-men (elite)
- **Prototype scope**: 1 enemy type (Red Tape — basic swarming cannon fodder)
- Basic AI: patrol, detect player, pursue, attack
- Stun mechanic: enemies have a "stun threshold" rather than health

### FR-05: Level System
- Grid-based maze levels
- Doors between rooms
- Push-wall secrets hiding "cronyism back rooms"
- JSON/YAML map format supporting: wall types, floor types, entity placement, door positions, secret walls, spawn points
- **Prototype scope**: 1 complete level
- **Full game**: 3 levels (one per boss encounter)

### FR-06: Boss Encounters (Full Game)
- **Quota-Kraken**: Net-monster hoarding fish (specific mechanics TBD during design)
- **Offshore Vault**: Teleports health bar to hidden rooms player must find
- **The Establishment**: Splits into 3 coalition versions that fight each other when defeated

### FR-07: HUD
- Classic Wolf3D-style bottom HUD bar
- Health display (patience meter thematically)
- Current weapon display
- Face portrait (protagonist reacting to damage/events)
- "Connections" score counter

### FR-08: Pickups and Scoring
- Health pickups: coffee and kleinur (Icelandic pastry)
- Score system: "connections" counter
- Secret rooms contribute to score
- **Prototype scope**: Basic health pickup + connections counter

### FR-09: Audio
- Icelandic-influenced soundtrack
- Sound effects for: weapon use, enemy stun, pickup collection, door opening, secret discovery
- **Prototype scope**: Basic sound effects (weapon hit, enemy reaction, pickup)

### FR-10: Map Data Format
- JSON or YAML format
- Defines: grid dimensions, wall tiles, floor tiles, entity placements, door positions, push-wall positions, player spawn, enemy spawns, pickup locations
- Loaded at runtime (not compiled into code)

---

## Non-Functional Requirements

### NFR-01: Performance
- Target 60fps on modern browsers (Chrome, Firefox, Safari, Edge)
- Responsive to window resizing
- Render resolution can be lower than display resolution (scaled up for retro effect)

### NFR-02: Browser Compatibility
- Chrome (latest 2 versions)
- Firefox (latest 2 versions)
- Safari (latest 2 versions)
- Edge (latest 2 versions)

### NFR-03: Code Quality
- TypeScript strict mode
- Modular architecture (separate rendering, game logic, input, audio)
- Property-based tests for pure functions and serialization (map loading, math utilities)

### NFR-04: Content Rules (Hard Constraint)
- Every political reference stays at archetype/structural level
- No real person (living or dead) identifiable
- No real party identifiable by name, likeness, slogan, or unmistakable detail
- Satire targets systems, not individuals

---

## Prototype Scope (Initial Deliverable)

The first deliverable is a playable prototype demonstrating:

1. Working raycaster with textured walls
2. Player movement (WASD + mouse)
3. 1 weapon (wooden spoon) with stun mechanic
4. 1 enemy type (Red Tape) with basic AI
5. 1 complete level loaded from JSON/YAML
6. Basic HUD (health, weapon, connections counter)
7. Doors and at least 1 push-wall secret
8. Basic sound effects
9. Health pickup (coffee/kleinur)

---

## Out of Scope for Prototype

- Boss encounters
- Weapons beyond wooden spoon
- Enemy types beyond Red Tape
- Multiple levels
- Full soundtrack
- Leaderboards or online features
- Save/load system
- Level editor
