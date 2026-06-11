# Audio Assets

The game loads these sound files at startup. They are **optional** — if a file
is missing, the game logs a warning and continues silently (audio degrades
gracefully). Drop real files here to enable sound.

## Sound Effects (`sfx/`)

| File | Trigger | Suggested character |
|------|---------|--------------------|
| `swing.mp3` | Wooden spoon attack | Quick whoosh |
| `hit.mp3` | Spoon connects with enemy | Comedic bonk |
| `disperse.mp3` | Enemy fully dispersed | Paper-flutter poof |
| `player-hurt.mp3` | Player takes damage | Frustrated grunt / "ouch" |
| `door.mp3` | Door opens | Wooden creak |
| `secret.mp3` | Push-wall secret found | Satisfying rumble + chime |
| `pickup.mp3` | Coffee / kleinur collected | Slurp / crunch |
| `victory.mp3` | Floor cleared | Triumphant pots-and-pans clatter |

## Music (`music/`)

| File | Use | Suggested character |
|------|-----|--------------------|
| `ambient.mp3` | Background loop during play | Icelandic-influenced, low-key, slightly off-kilter bureaucratic muzak |

## Format Notes

- MP3 is used for broad browser compatibility.
- Keep SFX short (< 1s) and punchy so they don't block the fast arcade pace.
- Music should loop seamlessly (it is played with `loop: true`).
- Per the content rules: no real anthems, party jingles, or identifiable tunes.
