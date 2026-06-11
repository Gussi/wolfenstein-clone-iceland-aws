# Code Summary — "Pots & Parliament" Prototype

**Stage**: CONSTRUCTION → Code Generation (prototype unit)
**Status**: Complete. `npm test` → 36/36 passing. `npm run build` → succeeds (36.3 KB JS, gzip 12.9 KB).

## Overview

A self-contained, browser-based Wolfenstein-3D-style raycaster implementing the
prototype scope: a single playable level with movement, mouse-look, nonlethal
melee combat (wooden spoon), Red Tape enemy AI, doors, one push-wall secret,
pickups, a full HUD, and win/lose/restart flow. All art is generated
procedurally at load time — there are no binary image assets to ship.

## Source Layout (workspace root)

```
index.html                 Canvas host + click-to-play overlay
src/
  constants.ts             All balance/rendering constants (from business-rules.md)
  types.ts                 Domain entity interfaces (from domain-entities.md)
  math/vector.ts           Pure angle/vector math (primary PBT target)
  map/
    mapData.ts             MapJSON, validateMap(), procedural buildLevel0()
    mapState.ts            Runtime grid, doors, push-walls, solidity, animation
  assets/
    textures.ts            Procedural wall textures → packed Uint32 pixels
    spriteGfx.ts           Procedural enemy/pickup/decor/weapon/face sprites
  collision.ts             Circle-vs-grid blocking + axis-sliding movement
  player.ts                Spawn, movement, rotation, damage/heal, interaction
  weapon.ts                Wooden-spoon swing/recover state machine
  combat.ts                Melee hit resolution (arc + range + closest target)
  enemies.ts               Red Tape AI state machine, LOS, pursuit, taunts
  raycaster.ts             DDA wall casting + framebuffer + z-buffer
  sprites.ts               Billboard sprite renderer (sorted, z-buffered)
  renderUtils.ts           Packed-texture → drawable canvas (cached)
  hud.ts                   Status bar, weapon viewmodel, taunts, overlays
  input.ts                 Keyboard + mouse + pointer lock
  audio.ts                 Web Audio synthesized SFX + looping music
  game.ts                  World state, per-frame update, full-frame render
  main.ts                  Bootstrap, asset gen, pointer-lock UI, game loop
tests/
  vector.test.ts           Angle/vector invariants
  map.test.ts              Validation + generated-level invariants
  collision.test.ts        Movement never resolves into a wall
  combat.test.ts           Stun/melee/weapon-swing invariants
public/music/              Background music (served in dev + bundled in build)
```

## How It Maps to the Design

- **Constants** (`constants.ts`) are a 1:1 transcription of `business-rules.md`
  (speeds, ranges, damage, durations, scoring, taunt pool).
- **Entities** (`types.ts`) follow `domain-entities.md`. Two pragmatic deltas:
  door/push-wall `textureId` are numeric (grid-compatible), and a few runtime
  fields were added (`attackCooldown`, `animationTimer`, `weapon.hitPending`,
  `pushWall.counted`).
- **Algorithms** (`raycaster.ts`, `sprites.ts`, `player.ts`, `enemies.ts`,
  `combat.ts`, `mapState.ts`) implement the DDA raycasting, billboard sprite
  projection, sliding collision, AI state machine, melee cone, and door/
  push-wall animations described in `business-logic-model.md`.

## Rendering Pipeline

1. Walls cast via DDA into a 640×400 `Uint32Array` framebuffer; per-column
   perpendicular distance stored in a z-buffer.
2. Sprites (enemies, pickups, decorations) sorted far-to-near and drawn with
   per-column z-buffer occlusion; transparent pixels skipped.
3. Framebuffer blitted (`image-rendering: pixelated`) and scaled to the window.
4. Weapon viewmodel, floating enemy taunts, HUD bar, and status overlays drawn
   at full resolution on top.

## Satire / Content Compliance

All references stay at the archetype/structural level per the hard content rule:
Red Tape enemies, an anonymous portrait silhouette, a generic small-nation
coat of arms, the perpetual erupting-volcano window gag, Icelandic taunts
("I'm telling your mother!"), "connections" scoring vs. "everyone's cousins,"
and a hidden cronyism back room. No real person or party is named or depicted.

## Verification

- `npm install` — 53 packages, 0 vulnerabilities.
- `npm test` — 36 tests across 4 files, all passing (Vitest + fast-check).
- `npm run build` — `tsc --noEmit` (strict, `noUnusedLocals`/`noUnusedParameters`)
  + `vite build` succeed. Bundle 36.3 KB JS (gzip 12.9 KB), under the 50 KB target.

## Known Prototype Simplifications

- Decorations render as billboards but do not block movement (kept non-solid to
  avoid raycaster artifacts); the `blocking` flag is carried in data for later.
- Door/push-wall open instantly-passable only at animation end (no partial
  sliding collision).
- Line-of-sight uses fixed-step ray marching rather than grid DDA (adequate at
  32×32).
- Single enemy type (Red Tape) and single level, per prototype scope.
