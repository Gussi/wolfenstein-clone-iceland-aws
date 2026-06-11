# Application Design Plan — "Pots & Parliament"

## Plan Overview
Define the high-level component architecture for the prototype: identify modules, their responsibilities, interfaces, and communication patterns. This is a TypeScript browser game using a lightweight game library.

---

## Design Questions

### Question 1
Which game library do you prefer for this project?

A) Phaser 3 (full-featured game framework: scene management, physics, input, audio, loader — all batteries included)
B) PixiJS (rendering-only library: fast WebGL/Canvas renderer, you build game systems yourself)
C) No library — pure TypeScript + Canvas 2D API (maximum control, most code to write)
D) Other (please describe after [Answer]: tag below)

[Answer]: C, but we are going with 3D

---

### Question 2
How should the raycaster interact with the game library?

A) Custom raycaster renders to an offscreen canvas, composited into the library's scene (raycaster is independent of library renderer)
B) Custom raycaster implemented entirely within the library's rendering pipeline (e.g., Phaser custom pipeline or PixiJS shader)
C) Let me decide based on your recommendation
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 3
What module/build system do you prefer?

A) Vite (fast dev server, ESM-native, TypeScript out of the box)
B) Webpack (mature, lots of plugins, heavier config)
C) esbuild (fastest builds, minimal config)
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 4
How should game state be managed?

A) Simple global state object passed between systems (straightforward, easy to debug)
B) Entity-Component-System (ECS) pattern (entities are IDs, components are data, systems process them)
C) Event-driven with pub/sub messaging between components
D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 5
How should assets (textures, sounds, map files) be organized?

A) Flat directory with type prefixes (assets/wall-stone.png, assets/sfx-hit.wav, assets/map-level1.json)
B) Nested by type (assets/textures/, assets/audio/, assets/maps/)
C) Nested by feature (assets/level1/, assets/enemies/, assets/weapons/)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Design Artifacts to Generate

After questions are answered, I will create:

- [x] components.md — Component definitions and responsibilities
- [x] component-methods.md — Method signatures and interfaces
- [x] services.md — Service layer and orchestration
- [x] component-dependency.md — Dependency relationships and data flow
- [x] application-design.md — Consolidated design overview
