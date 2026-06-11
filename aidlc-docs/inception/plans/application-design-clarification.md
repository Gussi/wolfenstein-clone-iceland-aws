# Application Design — Clarification Questions

I need to clarify one point from your answers. You selected C (pure TypeScript, no library) and added "but we are going with 3D."

---

## Clarification Question 1
What do you mean by "going with 3D"?

A) Classic Wolf3D raycaster pseudo-3D — renders a 3D-looking perspective using the Canvas 2D API (draws textured vertical strips calculated via raycasting). This is how the original Wolfenstein 3D works and what "raycaster" typically implies. No WebGL needed.

B) Actual 3D rendering using WebGL directly (writing vertex/fragment shaders, 3D geometry for walls/floors). True 3D but significantly more complex to build from scratch without a library.

C) Actual 3D with a lightweight 3D library (e.g., Three.js or Babylon.js) — lets you build the level as real 3D geometry with textures, first-person camera. More visually flexible than raycasting but changes the architecture substantially.

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

**Context**: The original concept brief says "Wolfenstein 3D style raycaster" which is traditionally approach A — a pseudo-3D technique rendering on a 2D canvas. It gives the classic retro FPS look with hard constraints (no looking up/down, grid-based walls, no true 3D geometry). Approaches B and C would allow more visual freedom (angled walls, true 3D objects) but are architecturally different projects.
