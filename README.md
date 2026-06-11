# Pots & Parliament

A nonlethal, Wolfenstein-3D-style raycaster prototype satirizing Icelandic
institutional and political dysfunction — at the level of archetype and
historical structure only, never real people or parties. You are a bewildered
everyman trying to file one form after "the Hrun," fighting your way up a
bloating ministry with escalating kitchenware. This prototype ships the first
weapon (the wooden spoon) and the first enemy (Red Tape).

## Controls

| Action | Input |
|--------|-------|
| Move | `W` `A` `S` `D` |
| Look | Mouse (pointer lock) |
| Attack (spoon) | Left click |
| Open door / push-wall | `E` or `Space` |
| Pause | `Esc` |
| Fullscreen | `F` |
| Restart (after end) | `R` |

Click **Click to Play** to lock the pointer and start. Losing pointer lock
(`Esc`) pauses the game.

## Run it

```bash
npm install
npm run dev      # start the dev server (opens the browser)
npm test         # run the property-based test suite
npm run build    # type-check + production build to dist/
npm run preview  # serve the production build
```

## Tech

TypeScript + Vite, Canvas 2D rendering, Web Audio for sound. All textures and
sprites are generated procedurally at load (no image files). Tests use Vitest +
fast-check. See `aidlc-docs/construction/prototype/code/code-summary.md` for an
architecture overview and `aidlc-docs/` for the full AI-DLC design trail.

## Content note

Every political reference is an abstraction (Red Tape, an anonymous portrait, a
generic coat of arms, the ever-ignored erupting volcano outside every window).
No real person, living or dead, and no real party is named or depicted.
