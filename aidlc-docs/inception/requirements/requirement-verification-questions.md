# Requirements Verification Questions

Please answer the following questions to help clarify the requirements for "Pots & Parliament." Fill in the letter choice after each `[Answer]:` tag. If none of the options fit, choose the last option (Other) and describe your preference.

---

## Question 1
What is the target platform for the game?

A) Web browser only (HTML5 Canvas / WebGL)
B) Desktop native (Windows/Mac/Linux executable)
C) Web browser primary, with potential desktop build later
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 2
What programming language/framework should be used for the game engine?

A) TypeScript with HTML5 Canvas (pure raycaster, no framework)
B) TypeScript with a lightweight game library (e.g., Phaser, PixiJS)
C) Rust compiled to WebAssembly
D) JavaScript (vanilla) with HTML5 Canvas
E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 3
How many levels should the initial release include?

A) 3 levels (one per boss encounter — Quota-Kraken, Offshore Vault, The Establishment)
B) 5-6 levels (intro level + mid-levels + 3 boss levels)
C) 9-10 levels (full Wolf3D-style episode with variety)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 4
What does "AWS" in the project name mean for this project?

A) The game will be hosted/deployed on AWS (static site hosting via S3/CloudFront)
B) The game needs AWS backend services (leaderboards, user accounts, multiplayer)
C) AWS infrastructure for CI/CD pipeline and deployment only
D) Full AWS stack: hosting + backend services (leaderboards, analytics, etc.)
E) Other (please describe after [Answer]: tag below)

[Answer]: Nothing, ignore it

---

## Question 5
What is the intended visual style for the raycaster?

A) Classic low-res pixelated textures (64x64 like original Wolf3D)
B) Slightly higher resolution pixel art (128x128 or 256x256)
C) Stylized flat/vector art (clean lines, bold colors)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 6
Should the game include audio/music?

A) Yes — retro chiptune soundtrack + sound effects
B) Yes — Icelandic-influenced soundtrack + sound effects
C) Sound effects only, no music initially
D) No audio in initial release (add later)
E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 7
What is the target for the minimap/HUD?

A) Classic Wolf3D-style HUD (health bar, weapon, face portrait at bottom)
B) Modern minimal HUD (small health indicator, ammo/weapon icon)
C) Retro HUD with satirical twist (health = "patience meter," weapon display, connections counter)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 8
How should level design/maps be authored?

A) Hardcoded grid arrays in code (simplest, classic Wolf3D approach)
B) JSON/YAML map files loaded at runtime (data-driven, editable)
C) Custom level editor tool built alongside the game
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 9
What is the priority for the initial deliverable?

A) Playable prototype with 1 level demonstrating core mechanics (movement, raycasting, 1 weapon, 1 enemy type)
B) Vertical slice with all weapon types and all enemy types in 1 complete level
C) Full game with all levels, all enemies, all bosses
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 10
Should the game have a scoring/progression system beyond the "connections" counter?

A) Just the "connections" counter as described in the brief
B) Connections counter + time-based score + secret discovery percentage
C) Full arcade scoring (combo multipliers, par times, rankings)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Question 11: Security Extensions
Should security extension rules be enforced for this project?

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications)
B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)
C) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Question 12: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced for this project?

A) Yes — enforce all PBT rules as blocking constraints (recommended for projects with business logic, data transformations, serialization, or stateful components)
B) Partial — enforce PBT rules only for pure functions and serialization round-trips (suitable for projects with limited algorithmic complexity)
C) No — skip all PBT rules (suitable for simple CRUD applications, UI-only projects, or thin integration layers with no significant business logic)
D) Other (please describe after [Answer]: tag below)

[Answer]: B
