# Assets

Trunk copies this entire `assets/` directory into the build output (`dist/`), so
files are served at `assets/...` at runtime.

## Current status

The game runs **today** with **programmatic placeholder textures**
(`TextureSet::placeholder()` in `src/boundary.rs`) — distinct flat colours with
grout lines for walls and coloured blobs for sprites/HUD. Audio is **optional**:
the game is fully playable in silence, and any missing file below is skipped
gracefully at load time.

Replacing the placeholders with real pixel art is a follow-up asset-production
task. When art exists, decode it in `src/platform/assets.rs` and build the
`TextureSet` from the decoded RGBA instead of `TextureSet::placeholder()`.

## Required final art (128×128 PNG, pixel art)

### Wall textures — one per `WallTexture` (see `src/domain/map.rs`)
Architectural references in US-25 (Alþingishúsið / Stjórnarráðshúsið):

| File (suggested) | WallTexture | Notes |
|---|---|---|
| `textures/walls/dolerite_dark.png` | DoleriteDark | near-black hewn basalt, exterior/structural |
| `textures/walls/plaster_cream.png` | PlasterCream | smooth cream interior plaster |
| `textures/walls/plaster_wainscot.png` | PlasterWainscot | cream plaster + dark wood wainscot |
| `textures/walls/committee_door.png` | CommitteeDoor | dark wood panel door, brass hardware |
| `textures/walls/window_volcano.png` | WindowVolcano | tall window, erupting volcano outside |
| `textures/walls/portrait_wall.png` | PortraitWall | cream wall + satirical portrait frame |
| `textures/walls/bookshelf.png` | Bookshelf | built-in bookshelf |
| `textures/walls/dolerite_arch.png` | DoleriteArch | dolerite + neoclassical arch |
| `textures/walls/plaster_sconce.png` | PlasterSconce | cream wall + brass sconce |
| `textures/walls/carpet_blue.png` | CarpetBlue | deep blue Alþingi chamber tone |

### Sprites — one per `SpriteId` (transparent background)
`textures/sprites/`: red_tape_idle, red_tape_walk, red_tape_attack,
red_tape_stunned, red_tape_dispersed, coffee, kleinur, desk, plant, coat_of_arms.

### HUD — one per `HudId`
`textures/hud/`: face_normal, face_hurt, face_critical, face_victory,
spoon_0, spoon_1, spoon_2, spoon_3.

## Audio (MP3, optional)

URLs are defined in `src/entry.rs`:

- Music: `assets/audio/music/loftsongur-8bit.mp3`
  (place the existing `music/Loftsöngur - 8bit.mp3` here, renamed)
- SFX in `assets/audio/sfx/`: `swing.mp3`, `hit.mp3`, `disperse.mp3`,
  `alert.mp3`, `pickup.mp3`, `door.mp3`, `secret.mp3`, `hurt.mp3`

## Maps

- `maps/level1.json` — the prototype level (32×32). Schema: see
  `src/domain/map.rs` (`MapFile`). Editable without recompiling (US-11).
