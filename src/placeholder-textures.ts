/**
 * Procedural placeholder textures — generated at runtime when a real PNG asset
 * is missing. Themed to evoke Alþingishúsið (dark dolerite, cream plaster, dark
 * wood, brass, deep-blue carpet) so the prototype reads correctly before real
 * art is dropped in. Replace any of these by adding the matching PNG to
 * assets/textures/ (see ASSETS.md).
 *
 * Stories: US-09, US-10, US-25
 */
import { TEXTURE_SIZE } from "./constants";
import type { LoadedTexture } from "./types";

const SIZE = TEXTURE_SIZE;
const TRANSPARENT = 0x00000000;

function pack(r: number, g: number, b: number, a = 255): number {
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function make(painter: (px: Uint32Array) => void): LoadedTexture {
  const pixels = new Uint32Array(SIZE * SIZE);
  painter(pixels);
  return { width: SIZE, height: SIZE, pixels };
}

/** Deterministic pseudo-random noise from coordinates (no RNG state). */
function noise(x: number, y: number, scale: number): number {
  const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return ((n - Math.floor(n)) * 2 - 1) * scale;
}

// ---------------------------------------------------------------------------
// Wall painters (keyed by texture id from domain-entities.md)
// ---------------------------------------------------------------------------

function paintDoleriteDark(px: Uint32Array): void {
  // Dark hewn basalt — near-black with rough cut blocks
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const blockH = 32;
      const blockW = 42;
      const row = Math.floor(y / blockH);
      const offset = (row % 2) * (blockW / 2);
      const mortar = y % blockH < 3 || (x + offset) % blockW < 3;
      const n = noise(x, y, 14);
      const base = 26 + n;
      px[y * SIZE + x] = mortar
        ? pack(12, 12, 14)
        : pack(base, base + 2, base + 5);
    }
  }
}

function paintPlasterCream(px: Uint32Array): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 8);
      px[y * SIZE + x] = pack(214 + n, 204 + n, 182 + n);
    }
  }
}

function paintPlasterWainscot(px: Uint32Array): void {
  const railY = Math.floor(SIZE * 0.62);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 6);
      if (y > railY) {
        // dark wood wainscoting with vertical panel lines
        const panel = x % 24 < 2 ? -20 : 0;
        px[y * SIZE + x] = pack(82 + n + panel, 54 + n + panel, 32 + n + panel);
      } else if (y >= railY - 4 && y <= railY) {
        px[y * SIZE + x] = pack(120, 86, 50); // chair rail
      } else {
        px[y * SIZE + x] = pack(214 + n, 204 + n, 182 + n);
      }
    }
  }
}

function paintCommitteeDoor(px: Uint32Array): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 6);
      const border = x < 8 || x > SIZE - 9 || y < 8 || y > SIZE - 9;
      // two recessed panels
      const inPanel =
        x > 18 && x < SIZE - 18 && ((y > 16 && y < 56) || (y > 72 && y < 112));
      let r = 74 + n;
      let g = 48 + n;
      let b = 28 + n;
      if (border) {
        r -= 20;
        g -= 14;
        b -= 8;
      }
      if (inPanel) {
        r -= 14;
        g -= 10;
        b -= 6;
      }
      px[y * SIZE + x] = pack(r, g, b);
      // brass knob
      if ((x - 104) ** 2 + (y - 64) ** 2 < 10)
        px[y * SIZE + x] = pack(190, 150, 60);
    }
  }
}

function paintWindowVolcano(px: Uint32Array): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const frame =
        x < 12 ||
        x > SIZE - 13 ||
        y < 12 ||
        y > SIZE - 13 ||
        (x > 60 && x < 68);
      if (frame) {
        px[y * SIZE + x] = pack(70, 46, 28); // wood frame
        continue;
      }
      // sky gradient
      const t = y / SIZE;
      let r = 60 + t * 40;
      let g = 70 + t * 30;
      let b = 110 - t * 20;
      // distant volcano cone in lower half
      const coneCenter = 90;
      const coneBaseY = SIZE - 16;
      const coneTopY = 80;
      const coneHalfWidth = ((coneBaseY - y) / (coneBaseY - coneTopY)) * 28;
      if (y > coneTopY && Math.abs(x - coneCenter) < coneHalfWidth) {
        r = 40;
        g = 32;
        b = 34;
        // glowing lava at the peak
        if (y < coneTopY + 14 && Math.abs(x - coneCenter) < 6) {
          r = 230;
          g = 90;
          b = 30;
        }
      }
      px[y * SIZE + x] = pack(r, g, b);
    }
  }
}

function paintPortraitWall(px: Uint32Array): void {
  paintPlasterCream(px);
  // gilt frame with a vague figure
  for (let y = 24; y < 104; y++) {
    for (let x = 36; x < 92; x++) {
      const onFrame = x < 42 || x > 85 || y < 30 || y > 98;
      if (onFrame) {
        px[y * SIZE + x] = pack(150, 116, 50); // gilt
      } else {
        const n = noise(x, y, 10);
        // a dim portrait of "nobody in particular"
        const head = (x - 64) ** 2 + (y - 56) ** 2 < 180;
        px[y * SIZE + x] = head
          ? pack(96 + n, 80 + n, 70 + n)
          : pack(48, 40, 44);
      }
    }
  }
}

function paintBookshelf(px: Uint32Array): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const shelfH = 30;
      const onShelf = y % shelfH > shelfH - 5;
      if (onShelf) {
        px[y * SIZE + x] = pack(60, 40, 24);
        continue;
      }
      // book spines with varied colors
      const book = Math.floor(x / 11);
      const r = 60 + ((book * 53) % 120);
      const g = 40 + ((book * 29) % 90);
      const b = 30 + ((book * 71) % 80);
      px[y * SIZE + x] = pack(r, g, b);
    }
  }
}

function paintDoleriteArch(px: Uint32Array): void {
  paintDoleriteDark(px);
  // a lighter neoclassical arch outline
  for (let x = 0; x < SIZE; x++) {
    const dx = x - SIZE / 2;
    const archY = 30 + (dx * dx) / 90;
    const yy = Math.floor(archY);
    for (let t = 0; t < 5; t++) {
      if (yy + t >= 0 && yy + t < SIZE)
        px[(yy + t) * SIZE + x] = pack(70, 70, 78);
    }
  }
}

function paintPlasterSconce(px: Uint32Array): void {
  paintPlasterCream(px);
  // brass wall sconce with a warm glow
  const cx = 64;
  const cy = 56;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d2 = (x - cx) ** 2 + (y - cy) ** 2;
      if (d2 < 50) px[y * SIZE + x] = pack(200, 160, 70);
      else if (d2 < 400) {
        const idx = y * SIZE + x;
        const c = px[idx];
        const r = Math.min(255, (c & 0xff) + 40);
        const g = Math.min(255, ((c >> 8) & 0xff) + 28);
        const b = (c >> 16) & 0xff;
        px[idx] = pack(r, g, b);
      }
    }
  }
}

function paintCarpetBlue(px: Uint32Array): void {
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const n = noise(x, y, 10);
      px[y * SIZE + x] = pack(28 + n, 40 + n, 88 + n);
    }
  }
}

// ---------------------------------------------------------------------------
// Sprite painters (transparent background)
// ---------------------------------------------------------------------------

function fillTransparent(px: Uint32Array): void {
  px.fill(TRANSPARENT);
}

/** A roll of red tape with googly bureaucratic eyes — the enemy. */
function paintRedTape(px: Uint32Array, frame: number): void {
  fillTransparent(px);
  const cx = SIZE / 2;
  const bob = Math.sin(frame * 1.4) * 4;
  const cy = SIZE / 2 + bob;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < 40) {
        // red spool body
        const ring = Math.floor(d / 5) % 2 === 0;
        px[y * SIZE + x] = ring ? pack(190, 40, 40) : pack(150, 28, 28);
      }
    }
  }
  // eyes
  const eyeY = Math.floor(cy - 6);
  for (const ex of [cx - 12, cx + 12]) {
    for (let y = -6; y <= 6; y++) {
      for (let x = -6; x <= 6; x++) {
        if (x * x + y * y < 30) {
          const px2 = Math.floor(ex) + x;
          const py2 = eyeY + y;
          if (px2 >= 0 && px2 < SIZE && py2 >= 0 && py2 < SIZE) {
            px[py2 * SIZE + px2] =
              x * x + y * y < 6 ? pack(20, 20, 20) : pack(240, 240, 240);
          }
        }
      }
    }
  }
}

function paintCoffee(px: Uint32Array): void {
  fillTransparent(px);
  // white cup with dark coffee and a handle
  for (let y = 50; y < 100; y++) {
    for (let x = 44; x < 84; x++) {
      px[y * SIZE + x] = y < 58 ? pack(60, 36, 20) : pack(230, 230, 224);
    }
  }
  for (let y = 60; y < 84; y++) {
    for (let x = 84; x < 96; x++) {
      const d = (x - 84) ** 2 + (y - 72) ** 2;
      if (d > 30 && d < 120) px[y * SIZE + x] = pack(230, 230, 224);
    }
  }
}

function paintKleinur(px: Uint32Array): void {
  fillTransparent(px);
  // a twisted Icelandic doughnut — golden brown knot
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dx = x - cx;
      const dy = y - cy;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 16 && d < 36) {
        const n = noise(x, y, 20);
        px[y * SIZE + x] = pack(176 + n, 120 + n, 56 + n);
      }
    }
  }
}

function paintDesk(px: Uint32Array): void {
  fillTransparent(px);
  for (let y = 60; y < 110; y++) {
    for (let x = 20; x < 108; x++) {
      px[y * SIZE + x] = y < 70 ? pack(96, 64, 36) : pack(70, 46, 26);
    }
  }
}

function paintPlant(px: Uint32Array): void {
  fillTransparent(px);
  // pot
  for (let y = 86; y < 116; y++)
    for (let x = 50; x < 78; x++) px[y * SIZE + x] = pack(120, 70, 40);
  // fronds
  for (let y = 30; y < 90; y++) {
    for (let x = 40; x < 88; x++) {
      const dx = x - 64;
      if (Math.abs(dx) < (90 - y) / 2) {
        const n = noise(x, y, 20);
        px[y * SIZE + x] = pack(30 + n, 90 + n, 40 + n);
      }
    }
  }
}

function paintCoatOfArms(px: Uint32Array): void {
  fillTransparent(px);
  // simple shield with cross motif
  const cx = SIZE / 2;
  for (let y = 30; y < 100; y++) {
    for (let x = 40; x < 88; x++) {
      const dx = x - cx;
      const taper = y > 78 ? (y - 78) * 1.4 : 0;
      if (Math.abs(dx) < 24 - taper) {
        const cross = Math.abs(dx) < 4 || (y > 56 && y < 64);
        px[y * SIZE + x] = cross ? pack(210, 200, 60) : pack(60, 80, 150);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// HUD painters
// ---------------------------------------------------------------------------

function paintFace(px: Uint32Array, expression: string): void {
  fillTransparent(px);
  // round determined face; mouth/brows vary by expression
  const cx = SIZE / 2;
  const cy = SIZE / 2;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d < 44 * 44) px[y * SIZE + x] = pack(224, 180, 150);
    }
  }
  // eyes
  for (const ex of [cx - 16, cx + 16]) {
    for (let y = -4; y <= 4; y++)
      for (let x = -4; x <= 4; x++) {
        if (x * x + y * y < 14)
          px[(cy - 8 + y) * SIZE + (Math.floor(ex) + x)] = pack(30, 30, 40);
      }
  }
  // mouth shape per expression
  const mouthY = cy + 18;
  for (let x = -16; x <= 16; x++) {
    let dy = 0;
    if (expression === "normal") dy = 0;
    else if (expression === "hurt")
      dy = Math.floor((x * x) / 40); // slight frown
    else if (expression === "critical")
      dy = Math.floor((x * x) / 24); // big frown
    else if (expression === "victory") dy = -Math.floor((x * x) / 40); // smile
    const py = mouthY + dy;
    if (py >= 0 && py < SIZE) px[py * SIZE + (cx + x)] = pack(120, 40, 40);
  }
}

function paintSpoon(px: Uint32Array, swing: number): void {
  fillTransparent(px);
  // a wooden spoon swung from bottom-right; swing 0..1 tilts it
  const angle = -0.6 + swing * 0.9;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const baseX = 92;
  const baseY = 124;
  // handle
  for (let t = 0; t < 90; t++) {
    const hx = Math.floor(baseX + -sin * t);
    const hy = Math.floor(baseY + -cos * t);
    for (let w = -4; w <= 4; w++) {
      const xx = hx + w;
      if (xx >= 0 && xx < SIZE && hy >= 0 && hy < SIZE)
        px[hy * SIZE + xx] = pack(150, 102, 54);
    }
  }
  // bowl of the spoon
  const bx = Math.floor(baseX + -sin * 96);
  const by = Math.floor(baseY + -cos * 96);
  for (let y = -16; y <= 16; y++)
    for (let x = -12; x <= 12; x++) {
      if ((x * x) / 144 + (y * y) / 256 < 1) {
        const xx = bx + x;
        const yy = by + y;
        if (xx >= 0 && xx < SIZE && yy >= 0 && yy < SIZE)
          px[yy * SIZE + xx] = pack(176, 122, 64);
      }
    }
}

// ---------------------------------------------------------------------------
// Dispatch table
// ---------------------------------------------------------------------------

const WALL_PAINTERS: Record<string, (px: Uint32Array) => void> = {
  dolerite_dark: paintDoleriteDark,
  plaster_cream: paintPlasterCream,
  plaster_wainscot: paintPlasterWainscot,
  committee_door: paintCommitteeDoor,
  window_volcano: paintWindowVolcano,
  portrait_wall: paintPortraitWall,
  bookshelf: paintBookshelf,
  dolerite_arch: paintDoleriteArch,
  plaster_sconce: paintPlasterSconce,
  carpet_blue: paintCarpetBlue,
};

/**
 * Generate a placeholder texture for the given asset id. Recognizes wall ids,
 * sprite ids (including animation frames like "redTape_walk_2"), and HUD ids.
 * Falls back to a magenta/black checker for unknown ids (clearly "missing").
 */
export function generatePlaceholderTexture(id: string): LoadedTexture {
  // Wall textures
  const wallPainter = WALL_PAINTERS[id];
  if (wallPainter) return make(wallPainter);

  // Red Tape enemy frames: "redTape_<state>_<frame>" or "redTape_<state>"
  if (id.startsWith("redTape")) {
    const frameMatch = id.match(/_(\d+)$/);
    const frame = frameMatch ? parseInt(frameMatch[1], 10) : 0;
    return make((px) => paintRedTape(px, frame));
  }

  // Pickups & decorations
  if (id === "coffee") return make(paintCoffee);
  if (id === "kleinur") return make(paintKleinur);
  if (id === "desk") return make(paintDesk);
  if (id === "plant") return make(paintPlant);
  if (id === "coat_of_arms") return make(paintCoatOfArms);

  // HUD faces
  if (id.startsWith("face_")) {
    const expr = id.slice("face_".length);
    return make((px) => paintFace(px, expr));
  }

  // HUD weapon
  if (id === "spoon_idle") return make((px) => paintSpoon(px, 0));
  if (id.startsWith("spoon_swing")) {
    const frameMatch = id.match(/_(\d+)$/);
    const frame = frameMatch ? parseInt(frameMatch[1], 10) : 1;
    return make((px) => paintSpoon(px, frame / 3));
  }

  // Unknown — obvious "missing texture" checker
  return make((px) => {
    for (let y = 0; y < SIZE; y++)
      for (let x = 0; x < SIZE; x++) {
        const c = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 === 0;
        px[y * SIZE + x] = c ? pack(220, 0, 220) : pack(20, 20, 20);
      }
  });
}
