# Texture Assets

The prototype generates **procedural placeholder textures** at runtime (see
`src/placeholder-textures.ts`) in the Icelandic parliament colour palette, so
the game is immediately playable without any image files.

To replace a placeholder with real pixel art, add a PNG here and register it in
the asset manifest (`MANIFEST.textures` in `src/main.ts`) using the matching
texture id. Real textures override placeholders of the same id.

## Texture IDs (walls)

| ID | Placeholder | Real art guidance |
|----|-------------|-------------------|
| `wall-dolerite` | Dark hewn basalt blocks | Near-black volcanic stone, Alþingishúsið exterior |
| `wall-plaster` | Smooth cream plaster | Interior plastered wall |
| `wall-wainscot` | Cream + dark wood wainscot | Plaster above, wood panelling below |
| `wall-door` | Dark wood panelled door | Neoclassical door, brass handle |
| `wall-window` | Window + erupting volcano | Tall window, volcano always visible outside |
| `wall-portrait` | Framed portrait (nobody) | Gilt frame, vague official silhouette |
| `wall-bookshelf` | Bookshelf | Committee archive shelving |
| `wall-arch` | Dolerite + arch | Neoclassical archway detail |
| `wall-sconce` | Plaster + brass sconce | Wall light with warm glow |
| `wall-carpet` | Deep blue weave | Alþingi chamber blue |

## Texture IDs (sprites)

`sprite-redTape-idle`, `sprite-redTape-walk-0..3`, `sprite-redTape-attack`,
`sprite-redTape-stunned`, `sprite-redTape-dispersed-0..2`,
`sprite-coffee`, `sprite-kleinur`, `sprite-desk`, `sprite-plant`,
`sprite-coat_of_arms`.

## Texture IDs (HUD)

`hud-face-normal`, `hud-face-hurt`, `hud-face-critical`, `hud-face-victory`,
`hud-spoon-idle`, `hud-spoon-swing-0..2`.

Recommended sprite/texture size: 128x128 (or 256x256), per the design.
Sprites use a transparent background (alpha) for billboard rendering.
