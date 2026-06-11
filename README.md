# Pots & Parliament

A Wolfenstein 3D-style raycaster shooter that satirizes Icelandic institutional and political dysfunction. You play a bewildered everyman in the aftermath of an unnamed financial Crash ("the Hrun"), climbing through a bloating parliament-ministry complex just trying to file one form.

Combat is **nonlethal slapstick** — you stun and disperse enemies with escalating kitchenware. No gore, no killing. The tone mocks systems and archetypes, never real people or parties.

## Status

**Prototype** — single playable level demonstrating core mechanics:

- Raycaster rendering (classic Wolf3D pseudo-3D on Canvas 2D)
- WASD + mouse movement
- Wooden spoon weapon with stun mechanic
- Red Tape enemies with swarming AI
- Doors and push-wall secrets
- Classic Wolf3D-style HUD
- Health pickups (coffee & kleinur)
- Icelandic enemy taunts

## Tech Stack

- **TypeScript** (strict mode)
- **Vite** (build + dev server)
- **Canvas 2D API** (no WebGL, no game framework)
- **Vitest + fast-check** (property-based tests)

## Getting Started

```bash
# Install dependencies
npm install

# Start the dev server (opens browser automatically)
npm run dev

# Run the test suite
npm run test

# Build for production
npm run build

# Preview the production build
npm run preview
```

## Controls

| Input | Action |
|-------|--------|
| W / A / S / D | Move forward / strafe left / back / strafe right |
| Mouse | Look (horizontal) |
| Left Click | Attack (wooden spoon) |
| E / Space | Interact (open doors, push secret walls) |
| ESC | Pause |

## Goal

Disperse all the Red Tape on the floor. Find the hidden push-wall secret for bonus connections. Ignore the erupting volcano in the windows — everyone else does.

## Project Structure

```
src/            TypeScript source (one file per system)
assets/
  textures/     Wall and sprite textures (procedural placeholders included)
  audio/        Sound effects and music
  maps/         Level JSON files
tests/          Property-based tests
aidlc-docs/     AI-DLC process documentation (design, requirements, etc.)
```

## Content Note

Every political reference stays at the level of archetype or historical structure. No real person, living or dead, and no real party identifiable by name, likeness, slogan, or unmistakable detail. The satire targets the Crash, bureaucratic sprawl, and abstract archetypes — nothing more.
