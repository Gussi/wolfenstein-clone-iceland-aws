// Procedurally generates placeholder textures in the Icelandic parliament
// palette so the prototype is immediately playable without art assets.
// Real PNGs in assets/textures/ can replace these later (same texture ids).

import { TEXTURE_SIZE } from './constants';
import type { AssetLoader } from './asset-loader';
import type { Texture } from './types';

interface RGB {
  r: number;
  g: number;
  b: number;
}

const PALETTE = {
  doleriteDark: { r: 38, g: 36, b: 42 },
  doleriteLight: { r: 58, g: 55, b: 62 },
  plasterCream: { r: 222, g: 214, b: 196 },
  plasterShadow: { r: 196, g: 188, b: 168 },
  wood: { r: 86, g: 58, b: 38 },
  woodDark: { r: 60, g: 40, b: 26 },
  brass: { r: 201, g: 168, b: 74 },
  blue: { r: 42, g: 60, b: 110 },
  volcanoSky: { r: 70, g: 60, b: 80 },
  volcanoGlow: { r: 200, g: 90, b: 40 },
  redTape: { r: 178, g: 50, b: 50 },
  coffee: { r: 90, g: 60, b: 40 },
  kleinur: { r: 200, g: 160, b: 90 },
  skin: { r: 224, g: 188, b: 156 },
};

/** Create a blank RGBA texture. */
function blank(size = TEXTURE_SIZE): Texture {
  return {
    width: size,
    height: size,
    data: new Uint8ClampedArray(size * size * 4),
  };
}

function setPixel(tex: Texture, x: number, y: number, c: RGB, a = 255): void {
  if (x < 0 || x >= tex.width || y < 0 || y >= tex.height) return;
  const idx = (y * tex.width + x) * 4;
  tex.data[idx] = c.r;
  tex.data[idx + 1] = c.g;
  tex.data[idx + 2] = c.b;
  tex.data[idx + 3] = a;
}

function fill(tex: Texture, c: RGB, a = 255): void {
  for (let y = 0; y < tex.height; y++) {
    for (let x = 0; x < tex.width; x++) setPixel(tex, x, y, c, a);
  }
}

// Deterministic pseudo-random for stable noise.
function noise(x: number, y: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return n - Math.floor(n);
}

function shade(c: RGB, factor: number): RGB {
  return {
    r: Math.max(0, Math.min(255, c.r * factor)),
    g: Math.max(0, Math.min(255, c.g * factor)),
    b: Math.max(0, Math.min(255, c.b * factor)),
  };
}

// --- Wall textures -------------------------------------------------------

function doleriteTexture(): Texture {
  // Dark hewn basalt: rough blocks with mortar lines.
  const tex = blank();
  const block = TEXTURE_SIZE / 4;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const row = Math.floor(y / block);
      const offset = row % 2 === 0 ? 0 : block / 2;
      const inMortar =
        y % block < 3 || (x + offset) % block < 3;
      const base = inMortar
        ? PALETTE.doleriteDark
        : shade(PALETTE.doleriteLight, 0.85 + noise(x, y) * 0.3);
      setPixel(tex, x, y, base);
    }
  }
  return tex;
}

function plasterTexture(shadowBand = false): Texture {
  // Smooth cream plaster with subtle noise; optional wainscot band.
  const tex = blank();
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const n = 0.96 + noise(x, y) * 0.06;
      let c = shade(PALETTE.plasterCream, n);
      if (shadowBand && y > TEXTURE_SIZE * 0.7) {
        // Dark wood wainscoting along the bottom.
        c = y > TEXTURE_SIZE * 0.72 ? PALETTE.wood : PALETTE.woodDark;
      }
      setPixel(tex, x, y, c);
    }
  }
  return tex;
}

function doorTexture(): Texture {
  // Dark wood paneled door with brass handle.
  const tex = blank();
  fill(tex, PALETTE.wood);
  // Panel insets.
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const margin = 14;
      const inPanel =
        x > margin &&
        x < TEXTURE_SIZE - margin &&
        ((y > margin && y < TEXTURE_SIZE / 2 - 6) ||
          (y > TEXTURE_SIZE / 2 + 6 && y < TEXTURE_SIZE - margin));
      if (inPanel) setPixel(tex, x, y, PALETTE.woodDark);
      // Frame edge.
      if (x < 4 || x >= TEXTURE_SIZE - 4) setPixel(tex, x, y, PALETTE.woodDark);
    }
  }
  // Brass handle.
  for (let y = TEXTURE_SIZE / 2 - 4; y < TEXTURE_SIZE / 2 + 4; y++) {
    for (let x = TEXTURE_SIZE - 26; x < TEXTURE_SIZE - 18; x++) {
      setPixel(tex, x, y, PALETTE.brass);
    }
  }
  return tex;
}

function windowTexture(): Texture {
  // Tall window with a distant erupting volcano (the recurring gag).
  const tex = plasterTexture();
  const wx0 = TEXTURE_SIZE * 0.2;
  const wx1 = TEXTURE_SIZE * 0.8;
  const wy0 = TEXTURE_SIZE * 0.1;
  const wy1 = TEXTURE_SIZE * 0.7;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      if (x > wx0 && x < wx1 && y > wy0 && y < wy1) {
        // Sky.
        let c = PALETTE.volcanoSky;
        // Volcano triangle.
        const cx = TEXTURE_SIZE / 2;
        const baseY = wy1 - 4;
        const mountainHeight = (wy1 - wy0) * 0.5;
        const slope = Math.abs(x - cx);
        if (y > baseY - mountainHeight + slope * 0.8 && y < baseY) {
          c = shade(PALETTE.doleriteDark, 1.2);
        }
        // Glowing eruption at the peak.
        const peakY = baseY - mountainHeight;
        if (y > peakY - 12 && y < peakY + 6 && slope < 8) {
          c = PALETTE.volcanoGlow;
        }
        setPixel(tex, x, y, c);
      }
      // Window frame.
      const onFrame =
        (Math.abs(x - wx0) < 3 || Math.abs(x - wx1) < 3 || Math.abs(y - wy0) < 3 || Math.abs(y - wy1) < 3) &&
        x >= wx0 - 3 && x <= wx1 + 3 && y >= wy0 - 3 && y <= wy1 + 3;
      if (onFrame) setPixel(tex, x, y, PALETTE.woodDark);
    }
  }
  return tex;
}

function portraitTexture(): Texture {
  // Cream wall with a framed portrait of "nobody in particular".
  const tex = plasterTexture();
  const m = TEXTURE_SIZE * 0.22;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const inFrame = x > m && x < TEXTURE_SIZE - m && y > m && y < TEXTURE_SIZE - m;
      const onBorder =
        inFrame &&
        (x < m + 5 || x > TEXTURE_SIZE - m - 5 || y < m + 5 || y > TEXTURE_SIZE - m - 5);
      if (onBorder) setPixel(tex, x, y, PALETTE.brass);
      else if (inFrame) {
        // Vague silhouette.
        const cx = TEXTURE_SIZE / 2;
        const cy = TEXTURE_SIZE * 0.45;
        const head = (x - cx) ** 2 + (y - cy) ** 2 < (TEXTURE_SIZE * 0.12) ** 2;
        setPixel(tex, x, y, head ? shade(PALETTE.skin, 0.7) : shade(PALETTE.blue, 0.6));
      }
    }
  }
  return tex;
}

function bookshelfTexture(): Texture {
  const tex = blank();
  fill(tex, PALETTE.woodDark);
  const shelfH = TEXTURE_SIZE / 4;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      if (y % shelfH < 4) {
        setPixel(tex, x, y, PALETTE.wood);
      } else {
        // Book spines (vary colour by column).
        const bookW = 8;
        const bi = Math.floor(x / bookW);
        const tint = 0.5 + noise(bi, Math.floor(y / shelfH)) * 0.7;
        const c =
          bi % 3 === 0
            ? shade(PALETTE.redTape, tint)
            : bi % 3 === 1
              ? shade(PALETTE.blue, tint)
              : shade(PALETTE.brass, tint);
        if (x % bookW > 0) setPixel(tex, x, y, c);
      }
    }
  }
  return tex;
}

function archTexture(): Texture {
  // Dolerite with a neoclassical arch.
  const tex = doleriteTexture();
  const cx = TEXTURE_SIZE / 2;
  const r = TEXTURE_SIZE * 0.34;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const d = Math.sqrt((x - cx) ** 2 + (y - TEXTURE_SIZE) ** 2);
      if (Math.abs(d - r) < 4 && y < TEXTURE_SIZE) {
        setPixel(tex, x, y, PALETTE.plasterCream);
      }
    }
  }
  return tex;
}

function sconceTexture(): Texture {
  // Plaster with a brass wall sconce and glow.
  const tex = plasterTexture();
  const cx = TEXTURE_SIZE / 2;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      // Sconce body.
      if (Math.abs(x - cx) < 5 && y > TEXTURE_SIZE * 0.35 && y < TEXTURE_SIZE * 0.6) {
        setPixel(tex, x, y, PALETTE.brass);
      }
      // Glow halo.
      const d = Math.sqrt((x - cx) ** 2 + (y - TEXTURE_SIZE * 0.35) ** 2);
      if (d < 16) {
        const g = 1 - d / 16;
        const base = PALETTE.plasterCream;
        setPixel(tex, x, y, {
          r: base.r + g * 40,
          g: base.g + g * 30,
          b: base.b + g * 5,
        });
      }
    }
  }
  return tex;
}

function carpetWallTexture(): Texture {
  // Deep blue panel (Alþingi chamber colour) with subtle weave.
  const tex = blank();
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const weave = (x + y) % 4 < 2 ? 1 : 0.9;
      setPixel(tex, x, y, shade(PALETTE.blue, weave * (0.9 + noise(x, y) * 0.2)));
    }
  }
  return tex;
}

// --- Sprite textures (transparent background) ----------------------------

function transparentSprite(): Texture {
  const tex = blank();
  // alpha already 0 everywhere
  return tex;
}

function redTapeSprite(variant: 'idle' | 'walk' | 'attack' | 'stunned', frame = 0): Texture {
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  // Body: a bundle of red tape (rounded blob with wrap lines).
  const bob = variant === 'walk' ? (frame % 2 === 0 ? -3 : 3) : 0;
  const lean = variant === 'attack' ? 6 : variant === 'stunned' ? -6 : 0;
  const top = TEXTURE_SIZE * 0.25 + bob;
  const bottom = TEXTURE_SIZE * 0.92;
  const halfW = TEXTURE_SIZE * 0.22;

  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      if (y < top || y > bottom) continue;
      const t = (y - top) / (bottom - top);
      const w = halfW * (0.7 + 0.3 * Math.sin(t * Math.PI));
      const centerX = cx + lean * t;
      if (Math.abs(x - centerX) < w) {
        // Tape wrap stripes.
        const stripe = Math.floor((y - top) / 6) % 2 === 0;
        const c = stripe ? PALETTE.redTape : shade(PALETTE.redTape, 0.7);
        setPixel(tex, x, y, c);
      }
    }
  }
  // Googly eyes (so it reads as a character, not gore).
  if (variant !== 'stunned') {
    drawEye(tex, cx - 8, top + 14, 4);
    drawEye(tex, cx + 8, top + 14, 4);
  } else {
    // Dizzy spirals: simple X eyes.
    drawX(tex, cx - 8, top + 14);
    drawX(tex, cx + 8, top + 14);
  }
  return tex;
}

function drawEye(tex: Texture, x: number, y: number, r: number): void {
  for (let dy = -r; dy <= r; dy++) {
    for (let dx = -r; dx <= r; dx++) {
      if (dx * dx + dy * dy <= r * r) {
        const c = dx * dx + dy * dy <= 1 ? { r: 20, g: 20, b: 20 } : { r: 245, g: 245, b: 245 };
        setPixel(tex, x + dx, y + dy, c);
      }
    }
  }
}

function drawX(tex: Texture, x: number, y: number): void {
  for (let i = -4; i <= 4; i++) {
    setPixel(tex, x + i, y + i, { r: 20, g: 20, b: 20 });
    setPixel(tex, x + i, y - i, { r: 20, g: 20, b: 20 });
  }
}

function redTapeDispersedSprite(frame: number): Texture {
  // Puff of papers scattering — more spread per frame.
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE / 2;
  const spread = 10 + frame * 16;
  for (let i = 0; i < 30; i++) {
    const a = (i / 30) * Math.PI * 2;
    const dist = spread * (0.4 + noise(i, frame) * 0.6);
    const px = Math.floor(cx + Math.cos(a) * dist);
    const py = Math.floor(cy + Math.sin(a) * dist);
    // Little paper squares.
    for (let dy = 0; dy < 5; dy++) {
      for (let dx = 0; dx < 5; dx++) {
        setPixel(tex, px + dx, py + dy, PALETTE.plasterCream, 255 - frame * 70);
      }
    }
  }
  return tex;
}

function coffeeSprite(): Texture {
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  const top = TEXTURE_SIZE * 0.45;
  const bottom = TEXTURE_SIZE * 0.8;
  for (let y = top; y < bottom; y++) {
    for (let x = cx - 16; x < cx + 16; x++) {
      setPixel(tex, x, y, { r: 245, g: 245, b: 240 }); // cup
    }
  }
  // Coffee surface.
  for (let y = top + 2; y < top + 8; y++) {
    for (let x = cx - 14; x < cx + 14; x++) setPixel(tex, x, y, PALETTE.coffee);
  }
  // Handle.
  for (let y = top + 6; y < bottom - 8; y++) {
    setPixel(tex, cx + 17, y, { r: 245, g: 245, b: 240 });
    setPixel(tex, cx + 20, y, { r: 245, g: 245, b: 240 });
  }
  return tex;
}

function kleinurSprite(): Texture {
  // A twisted Icelandic doughnut (kleina).
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE * 0.6;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const dx = (x - cx) / 26;
      const dy = (y - cy) / 16;
      const d = dx * dx + dy * dy;
      if (d < 1 && d > 0.25) {
        const c = shade(PALETTE.kleinur, 0.8 + noise(x, y) * 0.4);
        setPixel(tex, x, y, c);
      }
    }
  }
  return tex;
}

function deskSprite(): Texture {
  const tex = transparentSprite();
  const top = TEXTURE_SIZE * 0.5;
  for (let y = top; y < TEXTURE_SIZE * 0.85; y++) {
    for (let x = TEXTURE_SIZE * 0.2; x < TEXTURE_SIZE * 0.8; x++) {
      setPixel(tex, x, y, y < top + 8 ? PALETTE.wood : PALETTE.woodDark);
    }
  }
  // Stack of forms on top.
  for (let y = top - 10; y < top; y++) {
    for (let x = TEXTURE_SIZE * 0.55; x < TEXTURE_SIZE * 0.72; x++) {
      setPixel(tex, x, y, PALETTE.plasterCream);
    }
  }
  return tex;
}

function plantSprite(): Texture {
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  // Pot.
  for (let y = TEXTURE_SIZE * 0.7; y < TEXTURE_SIZE * 0.85; y++) {
    for (let x = cx - 12; x < cx + 12; x++) setPixel(tex, x, y, PALETTE.wood);
  }
  // Leaves.
  for (let y = TEXTURE_SIZE * 0.4; y < TEXTURE_SIZE * 0.7; y++) {
    for (let x = cx - 18; x < cx + 18; x++) {
      if (noise(x, y) > 0.4) setPixel(tex, x, y, { r: 40, g: 90, b: 50 });
    }
  }
  return tex;
}

function coatOfArmsSprite(): Texture {
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE / 2;
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const dx = (x - cx) / 30;
      const dy = (y - cy) / 38;
      if (dx * dx + dy * dy < 1) {
        setPixel(tex, x, y, y < cy ? shade(PALETTE.blue, 1) : PALETTE.brass);
      }
    }
  }
  return tex;
}

// --- HUD textures --------------------------------------------------------

function faceSprite(expression: 'normal' | 'hurt' | 'critical' | 'victory'): Texture {
  const tex = transparentSprite();
  const cx = TEXTURE_SIZE / 2;
  const cy = TEXTURE_SIZE / 2;
  // Head.
  for (let y = 0; y < TEXTURE_SIZE; y++) {
    for (let x = 0; x < TEXTURE_SIZE; x++) {
      const dx = (x - cx) / 36;
      const dy = (y - cy) / 42;
      if (dx * dx + dy * dy < 1) {
        let skin = PALETTE.skin;
        if (expression === 'hurt') skin = shade(PALETTE.skin, 0.9);
        if (expression === 'critical') skin = { r: 210, g: 170, b: 160 };
        setPixel(tex, x, y, skin);
      }
    }
  }
  // Eyes.
  const eyeY = cy - 6;
  drawEye(tex, cx - 12, eyeY, 4);
  drawEye(tex, cx + 12, eyeY, 4);
  // Mouth varies by expression.
  const mouthY = cy + 16;
  for (let x = cx - 12; x <= cx + 12; x++) {
    let my = mouthY;
    if (expression === 'normal') my = mouthY;
    else if (expression === 'victory') my = mouthY + Math.floor(Math.sin(((x - cx) / 12) * Math.PI) * 5);
    else my = mouthY - Math.floor(Math.sin(((x - cx) / 12) * Math.PI) * 5); // frown
    setPixel(tex, x, my, { r: 90, g: 40, b: 40 });
  }
  // Sweat for critical.
  if (expression === 'critical') {
    for (let y = cy - 20; y < cy - 8; y++) setPixel(tex, cx + 24, y, { r: 120, g: 180, b: 230 });
  }
  return tex;
}

function spoonSprite(swingFrame: number | null): Texture {
  const tex = transparentSprite();
  // Wooden spoon angled across the lower-right; swing rotates it.
  const baseAngle = swingFrame === null ? 0.5 : 0.5 - swingFrame * 0.35;
  const len = TEXTURE_SIZE * 0.7;
  const startX = TEXTURE_SIZE * 0.7;
  const startY = TEXTURE_SIZE * 0.95;
  for (let t = 0; t < len; t++) {
    const x = Math.floor(startX - Math.cos(baseAngle) * t);
    const y = Math.floor(startY - Math.sin(baseAngle) * t);
    for (let w = -3; w <= 3; w++) {
      setPixel(tex, x + w, y, PALETTE.wood);
    }
  }
  // Spoon bowl at the tip.
  const tipX = Math.floor(startX - Math.cos(baseAngle) * len);
  const tipY = Math.floor(startY - Math.sin(baseAngle) * len);
  for (let dy = -10; dy <= 10; dy++) {
    for (let dx = -8; dx <= 8; dx++) {
      if (dx * dx + dy * dy < 70) setPixel(tex, tipX + dx, tipY + dy, shade(PALETTE.wood, 1.2));
    }
  }
  return tex;
}

/**
 * Generate all placeholder textures and register them with the asset loader.
 */
export function generatePlaceholderTextures(assets: AssetLoader): void {
  // Walls.
  assets.registerTexture('wall-dolerite', doleriteTexture());
  assets.registerTexture('wall-plaster', plasterTexture());
  assets.registerTexture('wall-wainscot', plasterTexture(true));
  assets.registerTexture('wall-door', doorTexture());
  assets.registerTexture('wall-window', windowTexture());
  assets.registerTexture('wall-portrait', portraitTexture());
  assets.registerTexture('wall-bookshelf', bookshelfTexture());
  assets.registerTexture('wall-arch', archTexture());
  assets.registerTexture('wall-sconce', sconceTexture());
  assets.registerTexture('wall-carpet', carpetWallTexture());

  // Enemy sprites.
  assets.registerTexture('sprite-redTape-idle', redTapeSprite('idle'));
  assets.registerTexture('sprite-redTape-attack', redTapeSprite('attack'));
  assets.registerTexture('sprite-redTape-stunned', redTapeSprite('stunned'));
  for (let f = 0; f < 4; f++) {
    assets.registerTexture(`sprite-redTape-walk-${f}`, redTapeSprite('walk', f));
  }
  for (let f = 0; f < 3; f++) {
    assets.registerTexture(`sprite-redTape-dispersed-${f}`, redTapeDispersedSprite(f));
  }

  // Pickups + decorations.
  assets.registerTexture('sprite-coffee', coffeeSprite());
  assets.registerTexture('sprite-kleinur', kleinurSprite());
  assets.registerTexture('sprite-desk', deskSprite());
  assets.registerTexture('sprite-plant', plantSprite());
  assets.registerTexture('sprite-coat_of_arms', coatOfArmsSprite());

  // HUD.
  assets.registerTexture('hud-face-normal', faceSprite('normal'));
  assets.registerTexture('hud-face-hurt', faceSprite('hurt'));
  assets.registerTexture('hud-face-critical', faceSprite('critical'));
  assets.registerTexture('hud-face-victory', faceSprite('victory'));
  assets.registerTexture('hud-spoon-idle', spoonSprite(null));
  for (let f = 0; f < 3; f++) {
    assets.registerTexture(`hud-spoon-swing-${f}`, spoonSprite(f));
  }
}
