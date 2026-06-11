# NFR Requirements Plan — "Pots & Parliament" Prototype

## Plan Overview
Define performance targets, browser compatibility strategy, rendering optimizations, and finalize tech stack specifics (TypeScript config, Vite setup, testing framework).

---

## Clarifying Questions

### Question 1
What TypeScript strictness level do you prefer?

A) Maximum strict (strict: true, noUncheckedIndexedAccess, exactOptionalPropertyTypes — catches the most bugs but more type annotations needed)
B) Standard strict (strict: true only — good balance of safety and ergonomics)
C) Relaxed (no strict — fastest to write, fewer type guarantees)
D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 2
What testing framework for property-based tests?

A) Vitest + fast-check (Vitest is Vite-native, fast-check is the standard PBT library for JS/TS)
B) Jest + fast-check (Jest is more established but slower with Vite projects)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 3
Should the game support mobile/touch input in this prototype?

A) No — desktop keyboard+mouse only (simplest, matches Wolf3D)
B) Yes — add basic touch controls (virtual joystick + tap to attack)
C) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Artifacts to Generate

- [x] nfr-requirements.md — Performance targets, browser compatibility, rendering strategy
- [x] tech-stack-decisions.md — Final tech stack with versions and configuration
