# Assets Guide — "Pots & Parliament"

The game runs immediately with **procedurally generated placeholder art**. Any
missing texture falls back to a themed placeholder, and any missing sound plays
silently. To use real art, drop a PNG/MP3 at the matching path below — no code
changes needed.

- **Texture format**: PNG, **128×128** pixels (resized automatically if not).
- **Sprite transparency**: use a transparent background (alpha = 0).
- **Audio format**: MP3 (OGG also works in most browsers).

---

## Wall Textures — `assets/textures/walls/`

| File                   | Used for                                                 |
| ---------------------- | -------------------------------------------------------- |
| `dolerite_dark.png`    | Dark basalt structural/exterior walls                    |
| `plaster_cream.png`    | Smooth cream interior walls                              |
| `plaster_wainscot.png` | Cream plaster with dark wood wainscoting                 |
| `committee_door.png`   | Wood paneled door texture                                |
| `window_volcano.png`   | Tall window with erupting volcano outside                |
| `portrait_wall.png`    | Wall with satirical portrait frame                       |
| `bookshelf.png`        | Built-in bookshelf                                       |
| `dolerite_arch.png`    | Dolerite with neoclassical arch                          |
| `plaster_sconce.png`   | Cream wall with brass sconce (also the secret-wall hint) |
| `carpet_blue.png`      | Deep blue Alþingi chamber carpet                         |

## Sprites — `assets/textures/sprites/`

Enemy frames (Red Tape):
`redTape_idle_0..1`, `redTape_walk_0..3`, `redTape_attack_0..1`,
`redTape_stunned_0..1`, `redTape_dispersed_0..2` (all `.png`).

Pickups & decorations:
`coffee.png`, `kleinur.png`, `desk.png`, `plant.png`, `coat_of_arms.png`.

## HUD — `assets/textures/hud/`

| File                                      | Used for                                                  |
| ----------------------------------------- | --------------------------------------------------------- |
| `pan.png`                                 | Wooden spoon idle frame (currently your provided pan art) |
| `spoon_swing_1.png` … `spoon_swing_3.png` | Weapon swing frames                                       |
| `face_normal.png`                         | Face portrait, 75–100% health                             |
| `face_hurt.png`                           | Face portrait, 40–74% health                              |
| `face_critical.png`                       | Face portrait, 1–39% health                               |
| `face_victory.png`                        | Face portrait on victory                                  |

## Audio — `assets/audio/`

SFX in `assets/audio/sfx/`:
`swing.mp3`, `hit.mp3`, `pickup.mp3`, `door.mp3`, `secret.mp3`,
`enemy_alert.mp3`, `enemy_attack.mp3`, `enemy_dispersed.mp3`, `player_hurt.mp3`.

Music in `assets/audio/music/`:
`loftsongur.mp3` (currently your provided 8-bit Loftsöngur track).

## Maps — `assets/maps/`

`level1.json` — the prototype level. Regenerate with `node scripts/gen-level.mjs`.

---

## Note on the sprite sheets in `assets/images/`

`doors-sprite-64x64.png`, `face-sprite-32x32.png`, and `walls-sprite-64x64.png`
are sprite **sheets** (multiple frames in one image). The current loader expects
one image per texture id. To use these sheets, either slice them into the
individual files listed above, or extend `AssetLoader` to slice sheets by frame.
Until then, those ids use procedural placeholders.
