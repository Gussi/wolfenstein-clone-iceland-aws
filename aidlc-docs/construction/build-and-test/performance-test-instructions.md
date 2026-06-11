# Performance Test Instructions — "Pots & Parliament"

## Purpose
Validate the game holds the 60fps target with the full prototype scene (32
enemies, sprites, raycasting at 640x400).

## Performance Requirements (from NFR)
- **Frame rate**: 60fps target (16.67ms/frame); 30fps minimum worst case
- **Frame budget**: < 14ms total (see nfr-requirements.md for breakdown)
- **Load time**: assets loaded in < 3s on broadband
- **Bundle size**: < 50 kB JS (achieved: ~38 kB raw, ~13 kB gzip)

## How to Measure

### 1. In-Browser FPS (manual)
- Run `npm run dev`, open the game, click to play.
- Open browser DevTools > Performance/Rendering.
- Enable the browser's built-in FPS meter:
  - Chrome/Edge: DevTools > Rendering > "Frame Rendering Stats"
  - Firefox: `about:config` -> performance tools, or use the Performance panel
- Walk into the largest enemy swarm (committee wing) and confirm the frame rate
  stays at/near 60fps.

### 2. Profiling Hotspots
- Use DevTools Performance recording during a dense fight.
- Expected hottest function: `Renderer.castWalls` (640 rays/frame) and
  `Renderer.drawSprites`. These should dominate but stay within budget.

### 3. Load Time
- Reload with the Network panel open. Confirm assets (JS + map) load quickly.
  Procedural textures are generated synchronously at startup (no network).

## If Performance Is Below Target
1. Lower the internal resolution (`SCREEN_WIDTH`/`SCREEN_HEIGHT` in
   `src/constants.ts`) — fewer rays per frame.
2. Reduce `MAX_SPRITE_DISTANCE` to cull distant sprites sooner.
3. Cache HUD texture canvases (currently rebuilt per blit) if HUD drawing shows
   up in profiles.
4. Reduce the number of simultaneously active enemies.

## Notes
This is a single-player, single-tab game. There is no server load, throughput,
or concurrency dimension to test — performance is purely client-side rendering
and update-loop cost.
