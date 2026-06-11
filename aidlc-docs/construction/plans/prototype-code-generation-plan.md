# Code Generation Plan — "Pots & Parliament" Prototype

**Unit**: prototype (single greenfield unit)
**Project type**: Greenfield, single unit — code at workspace root (`src/`, `tests/`, config at root)
**Source of truth**: This plan governs Code Generation for the prototype unit.

## Context

- **Stack**: TypeScript ~5.5, Vite ~6, Vitest ~3, fast-check ~3, Browser Canvas 2D + Web Audio.
- **Assets**: Generated **procedurally in code** (textures + sprites) to keep the prototype
  self-contained (no binary PNGs required). Background music uses the existing
  `music/Loftsöngur - 8bit.mp3`; SFX synthesized via Web Audio.
- **Scope**: Story = playable single-level Wolf3D-style nonlethal raycaster: move/look,
  melee (wooden spoon), Red Tape enemy AI, doors, one push-wall secret, pickups
  (coffee/kleinur), HUD (face/health/score/weapon), win/lose/restart, intro + volcano gag.

## Story Coverage

- Movement & collision (sliding) — player.ts
- Mouse-look + pointer lock — input.ts
- Raycasting walls (DDA, textured, shaded) — raycaster.ts
- Sprite rendering (z-buffered, sorted) — sprites.ts
- Melee combat (arc/range, single closest target) — combat.ts + weapon.ts
- Enemy AI state machine (idle→alert→pursue→attack→stunned→dispersed) — enemies.ts
- Doors (slide open) + push-wall secret — mapState.ts
- Pickups (auto-collect heal) — game.ts
- HUD (face expression, health, connections, weapon) — hud.ts
- Game flow (loading/intro/playing/gameOver/victory/restart) — game.ts
- Enemy taunts (Icelandic), volcano window gag — sprites/textures + hud

## Steps

### Step 1: Project Structure Setup (greenfield)
- [x] `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `index.html`, `.gitignore`

### Step 2: Constants & Types (business logic foundation)
- [x] `src/constants.ts` — all balance/rendering constants from business-rules.md
- [x] `src/types.ts` — domain entity interfaces from domain-entities.md

### Step 3: Math utilities (PBT target)
- [x] `src/math/vector.ts` — angle normalization, vector ops, distance, ray helpers

### Step 4: Map data, loader/validation, runtime state (PBT target)
- [x] `src/map/mapData.ts` — MapJSON type, validation, level0 procedural map
- [x] `src/map/mapState.ts` — runtime grid, doors, push-walls, solidity queries, animations

### Step 5: Procedural assets
- [x] `src/assets/textures.ts` — generate wall textures (dolerite, plaster, window+volcano, etc.)
- [x] `src/assets/spriteGfx.ts` — generate enemy/pickup/decoration/weapon/face sprites

### Step 6: Player, weapon, combat
- [x] `src/player.ts` — movement, rotation, sliding collision, damage
- [x] `src/weapon.ts` — wooden spoon swing state machine
- [x] `src/combat.ts` — melee hit detection (arc + range + closest target)

### Step 7: Enemy AI
- [x] `src/enemies.ts` — Red Tape state machine, LOS, pursuit, attack, taunts

### Step 8: Rendering
- [x] `src/raycaster.ts` — DDA wall casting with texture sampling + z-buffer
- [x] `src/sprites.ts` — billboard sprite renderer (sorted, z-buffered)
- [x] `src/hud.ts` — face portrait, health bar, connections, weapon, overlays

### Step 9: Input, audio, loop, entry
- [x] `src/input.ts` — keyboard + mouse + pointer lock
- [x] `src/audio.ts` — Web Audio SFX + looping music
- [x] `src/game.ts` — GameWorldState, update orchestration, pickups, flow
- [x] `src/main.ts` — bootstrap, asset load, requestAnimationFrame loop

### Step 10: Property-based tests
- [x] `tests/vector.test.ts` — angle normalization, vector invariants
- [x] `tests/map.test.ts` — map validation accepts valid / rejects invalid
- [x] `tests/collision.test.ts` — collision/solidity invariants
- [x] `tests/combat.test.ts` — combat/weapon/stun invariants (added)

### Step 11: Build & verify
- [x] `npm install`, `npm run test` (36/36 pass), `npm run build` (succeeds, 36KB JS)

### Step 12: Documentation
- [x] `README.md` (root) + `aidlc-docs/construction/prototype/code/code-summary.md`
