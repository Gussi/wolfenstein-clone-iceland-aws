# Functional Design Plan — "Pots & Parliament" Prototype

## Plan Overview
Detail the core game algorithms, entity models, business rules (game rules), and data structures. This is the "how it works" layer between the component interfaces (Application Design) and the actual code (Code Generation).

---

## Clarifying Questions

### Question 1
What field-of-view (FOV) angle should the raycaster use?

A) 60 degrees (classic Wolf3D)
B) 66 degrees (slightly wider, common in modern retro FPS)
C) 75 degrees (wide angle, more peripheral vision)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 2
What screen resolution should the internal render target be?

A) 320x200 (original Wolf3D resolution, scaled up to fill screen — very chunky pixels)
B) 640x400 (2x Wolf3D — readable, still retro)
C) 480x300 (compromise — retro feel without being too blocky)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 3
How fast should the player move relative to the grid?

A) Fast — ~5 grid cells per second (frantic arcade feel, matches the brief)
B) Medium — ~3 grid cells per second (more deliberate, can still dodge)
C) Very fast — ~7 grid cells per second (Doom-speed, breakneck)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 4
How many hits should it take to disperse a Red Tape enemy?

A) 2 hits (very fast kills, swarms are the challenge)
B) 3 hits (standard, feels fair)
C) 4 hits (beefier enemies, fewer needed per encounter)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 5
How should the prototype level be structured in terms of size?

A) Small — ~20x20 grid (quick to play, ~2-3 minutes)
B) Medium — ~32x32 grid (classic Wolf3D level size, ~5 minutes)
C) Large — ~48x48 grid (exploration-heavy, ~8-10 minutes)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 6
How many enemies should the prototype level have?

A) 10-15 enemies (manageable swarms, quick to clear)
B) 20-25 enemies (dense, frequent encounters throughout)
C) 30+ enemies (overwhelmingly frantic from start to finish)
D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Design Artifacts to Generate

After questions are answered, I will create:

- [x] business-logic-model.md — Core algorithms (raycasting, movement, collision, AI state machine)
- [x] business-rules.md — Game rules (damage values, speeds, timings, balance constants)
- [x] domain-entities.md — Data structures (player, enemy, map, pickup definitions)
