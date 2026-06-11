# Integration & Manual Test Instructions — "Pots & Parliament"

This is a single-unit client-side game with no services to integrate. "Integration"
here means verifying the systems work together at runtime, plus the automated
level-integrity check and manual play testing.

## Automated Integration Check: Level Integrity

The level generator and game systems must agree. A flood-fill check confirms the
level is winnable (the win condition requires dispersing all enemies).

```bash
npm run level:verify
```

- **Expected**: `OK: spawn, all enemies, and all pickups are reachable.`
- **What it validates**:
  - Player spawn is on an open cell
  - Every enemy sits on an open (non-wall) cell
  - Every pickup sits on an open cell
  - All enemies and pickups are reachable from spawn (doors passable, secret
    push-wall treated as openable)
- **If it fails**: the win condition could be unreachable. Adjust enemy/pickup
  placement or walls in `tools/generate-level.mjs`, regenerate, re-verify.

## Manual Play Test Checklist

Run `npm run dev` and verify each system interaction. Maps to the user stories.

### Movement & Rendering (US-01, US-02, US-04, US-09, US-25)
- [ ] WASD moves forward/back/strafe; movement feels fast and smooth
- [ ] Mouse rotates the view horizontally (after clicking to lock pointer)
- [ ] Walls render with correct perspective and textures
- [ ] Cannot walk through walls; slides along them at angles
- [ ] Visual reads as an Icelandic parliament: dark dolerite, cream plaster,
      dark wood doors, blue carpet, volcano visible in windows

### Combat (US-05, US-06, US-07, US-08)
- [ ] Left-click swings the wooden spoon (HUD animation plays)
- [ ] Hitting a Red Tape staggers it; 3 hits disperses it (paper poof)
- [ ] Red Tape detect, pursue, and attack the player; swarms feel frantic
- [ ] Taking hits reduces the patience meter and triggers hurt feedback

### Level & Secrets (US-03, US-11, US-12)
- [ ] Doors open with E/Space when facing them
- [ ] The portrait push-wall opens with E/Space and reveals the kleinur alcove

### HUD & Feedback (US-13, US-14, US-15, US-16, US-24)
- [ ] Patience bar, weapon, face portrait, connections counter all display
- [ ] Face changes expression as health drops
- [ ] Connections increase on disperse (+10) and secret (+50)
- [ ] Enemy taunts (Icelandic) appear on first detection

### Pickups (US-23)
- [ ] Walking over coffee/kleinur restores patience and plays a sound

### Game Flow (US-20, US-21, US-22)
- [ ] Intro text shows at start and dismisses on key/click/timeout
- [ ] Patience to zero -> "You give up and go home" -> press R to retry
- [ ] Dispersing all enemies -> victory stats screen -> press R to replay
- [ ] ESC pauses and resumes

### Audio (US-17, US-18, US-19)
- [ ] With sound files present in `public/assets/audio/`, SFX play for swing,
      hit, disperse, door, secret, pickup; ambient music loops
- [ ] With no sound files, the game runs silently without errors (graceful)
