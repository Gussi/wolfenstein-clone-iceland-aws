/**
 * Procedurally generated sprite graphics (enemies, pickups, decorations,
 * weapon viewmodel, and HUD face portraits). All sprites use a transparent
 * background; the sprite renderer skips fully-transparent pixels.
 */

import type { Texture } from './textures';

const SPRITE_SIZE = 128;

function makeCtx(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Failed to acquire 2D context for sprite generation');
  ctx.clearRect(0, 0, size, size);
  return ctx;
}

function pack(ctx: CanvasRenderingContext2D, size: number): Texture {
  const img = ctx.getImageData(0, 0, size, size);
  const pixels = new Uint32Array(img.data.buffer.slice(0));
  return { size, pixels };
}

// --- Red Tape enemy ---------------------------------------------------------

function paintRedTape(
  ctx: CanvasRenderingContext2D,
  s: number,
  opts: { bob: number; tilt: number; armUp: boolean; dispersePhase?: number },
): void {
  const cx = s / 2;
  const bodyTop = s * 0.28 + opts.bob;
  ctx.save();
  ctx.translate(cx, s * 0.55);
  ctx.rotate(opts.tilt);
  ctx.translate(-cx, -s * 0.55);

  if (opts.dispersePhase !== undefined) {
    // "Poof" — scattered paper scraps, fading.
    const n = 18;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const r = opts.dispersePhase * s * 0.45;
      const px = cx + Math.cos(a) * r;
      const py = s * 0.5 + Math.sin(a) * r;
      ctx.fillStyle = `rgba(220,60,60,${1 - opts.dispersePhase})`;
      ctx.fillRect(px - 4, py - 5, 8, 10);
    }
    ctx.restore();
    return;
  }

  // Body: a fat roll of red tape.
  ctx.fillStyle = '#c8322f';
  ctx.fillRect(s * 0.3, bodyTop, s * 0.4, s * 0.42);
  ctx.fillStyle = '#a82724';
  // Tape windings.
  for (let y = bodyTop; y < bodyTop + s * 0.42; y += 8) {
    ctx.fillRect(s * 0.3, y, s * 0.4, 3);
  }
  // Loose tape end flapping.
  ctx.fillStyle = '#e05552';
  ctx.beginPath();
  ctx.moveTo(s * 0.68, bodyTop + 6);
  ctx.lineTo(s * 0.84, bodyTop + 2 + opts.bob);
  ctx.lineTo(s * 0.84, bodyTop + 14 + opts.bob);
  ctx.closePath();
  ctx.fill();

  // Head: a stamp/seal with grumpy face.
  ctx.fillStyle = '#e8e0c8';
  ctx.beginPath();
  ctx.arc(cx, bodyTop - s * 0.02, s * 0.13, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#7a1f1d';
  ctx.lineWidth = 3;
  ctx.stroke();
  // Eyes.
  ctx.fillStyle = '#222';
  ctx.fillRect(cx - 10, bodyTop - s * 0.05, 4, 6);
  ctx.fillRect(cx + 6, bodyTop - s * 0.05, 4, 6);
  // Frown (or open mouth if attacking).
  ctx.strokeStyle = '#222';
  ctx.lineWidth = 2;
  ctx.beginPath();
  if (opts.armUp) {
    ctx.arc(cx, bodyTop + 6, 5, 0, Math.PI * 2);
  } else {
    ctx.arc(cx, bodyTop + 10, 6, Math.PI * 1.15, Math.PI * 1.85);
  }
  ctx.stroke();

  // Arms holding a rejection stamp / forms.
  ctx.fillStyle = '#c8322f';
  const armY = opts.armUp ? bodyTop + s * 0.06 : bodyTop + s * 0.16;
  ctx.fillRect(s * 0.22, armY, s * 0.1, 8);
  ctx.fillRect(s * 0.68, armY, s * 0.1, 8);
  // Form/paper in hand.
  ctx.fillStyle = '#f4f0e0';
  ctx.fillRect(s * 0.2, armY - 10, 14, 18);
  ctx.strokeStyle = '#aa3030';
  ctx.lineWidth = 1;
  ctx.strokeRect(s * 0.2 + 3, armY - 6, 8, 3);

  // Little legs.
  ctx.fillStyle = '#6a1d1b';
  ctx.fillRect(s * 0.38, bodyTop + s * 0.42, 8, s * 0.1);
  ctx.fillRect(s * 0.54, bodyTop + s * 0.42, 8, s * 0.1);

  ctx.restore();
}

// --- Pickups ----------------------------------------------------------------

function paintCoffee(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  const cy = s * 0.55;
  // Cup.
  ctx.fillStyle = '#f0ece0';
  ctx.fillRect(cx - 22, cy - 14, 44, 34);
  ctx.fillStyle = '#e0d8c4';
  ctx.fillRect(cx - 22, cy + 16, 44, 6);
  // Coffee surface.
  ctx.fillStyle = '#4a2c14';
  ctx.fillRect(cx - 18, cy - 10, 36, 8);
  // Handle.
  ctx.strokeStyle = '#f0ece0';
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(cx + 24, cy + 2, 10, -Math.PI / 2, Math.PI / 2);
  ctx.stroke();
  // Steam.
  ctx.strokeStyle = 'rgba(220,220,220,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 18);
  ctx.quadraticCurveTo(cx - 12, cy - 28, cx - 4, cy - 36);
  ctx.moveTo(cx + 8, cy - 18);
  ctx.quadraticCurveTo(cx + 2, cy - 28, cx + 10, cy - 36);
  ctx.stroke();
}

function paintKleinur(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  const cy = s * 0.55;
  // Twisted Icelandic doughnut — a knotted golden loop.
  ctx.strokeStyle = '#9a5a26';
  ctx.lineWidth = 16;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 14);
  ctx.bezierCurveTo(cx + 28, cy - 24, cx - 28, cy + 24, cx + 22, cy + 14);
  ctx.stroke();
  ctx.strokeStyle = '#c98a44';
  ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.moveTo(cx - 22, cy - 14);
  ctx.bezierCurveTo(cx + 28, cy - 24, cx - 28, cy + 24, cx + 22, cy + 14);
  ctx.stroke();
}

// --- Decorations ------------------------------------------------------------

function paintDesk(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  ctx.fillStyle = '#5a3d24';
  ctx.fillRect(cx - 40, s * 0.45, 80, 12); // top
  ctx.fillStyle = '#4a2f1c';
  ctx.fillRect(cx - 36, s * 0.45 + 12, 14, s * 0.3); // legs
  ctx.fillRect(cx + 22, s * 0.45 + 12, 14, s * 0.3);
  // Stacks of paper.
  ctx.fillStyle = '#f0ece0';
  ctx.fillRect(cx - 30, s * 0.4, 22, 14);
  ctx.fillStyle = '#e2dccb';
  ctx.fillRect(cx + 6, s * 0.41, 22, 12);
}

function paintPlant(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  ctx.fillStyle = '#7a4a28';
  ctx.fillRect(cx - 16, s * 0.6, 32, s * 0.22); // pot
  ctx.fillStyle = '#2f6b34';
  for (let i = -3; i <= 3; i++) {
    ctx.save();
    ctx.translate(cx, s * 0.6);
    ctx.rotate((i / 6) * 1.2);
    ctx.fillRect(-4, -s * 0.32, 8, s * 0.34);
    ctx.restore();
  }
}

function paintCoatOfArms(ctx: CanvasRenderingContext2D, s: number): void {
  const cx = s / 2;
  const cy = s * 0.5;
  // A generic small-nation shield with four guardian shapes (abstract).
  ctx.fillStyle = '#1f5fa8';
  ctx.beginPath();
  ctx.moveTo(cx - 30, cy - 36);
  ctx.lineTo(cx + 30, cy - 36);
  ctx.lineTo(cx + 30, cy + 14);
  ctx.quadraticCurveTo(cx, cy + 50, cx - 30, cy + 14);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#d8b24a';
  ctx.lineWidth = 4;
  ctx.stroke();
  ctx.fillStyle = '#e8e0c8';
  ctx.fillRect(cx - 4, cy - 30, 8, 60);
  ctx.fillRect(cx - 26, cy - 4, 52, 8);
}

// --- Weapon viewmodel (wooden spoon) ---------------------------------------

function paintSpoon(ctx: CanvasRenderingContext2D, s: number, swing: number): void {
  // swing: 0 = idle (bottom right), 1 = full swing (center, raised).
  const baseX = s * 0.72 - swing * s * 0.22;
  const baseY = s * 0.95 - swing * s * 0.3;
  ctx.save();
  ctx.translate(baseX, baseY);
  ctx.rotate(-0.5 - swing * 0.6);
  // Handle.
  ctx.fillStyle = '#b98a4a';
  ctx.fillRect(-7, 0, 14, s * 0.6);
  ctx.fillStyle = '#a5763a';
  ctx.fillRect(-7, 0, 4, s * 0.6);
  // Bowl of the spoon.
  ctx.fillStyle = '#c89a5a';
  ctx.beginPath();
  ctx.ellipse(0, -6, 20, 28, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#a5763a';
  ctx.beginPath();
  ctx.ellipse(0, -6, 12, 18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

// --- HUD face portraits -----------------------------------------------------

function paintFace(ctx: CanvasRenderingContext2D, s: number, mood: 'normal' | 'hurt' | 'critical' | 'victory'): void {
  const cx = s / 2;
  const cy = s / 2;
  // Head.
  ctx.fillStyle = mood === 'critical' ? '#c9a88a' : '#e0bf9a';
  ctx.beginPath();
  ctx.arc(cx, cy, s * 0.32, 0, Math.PI * 2);
  ctx.fill();
  // Hair (woolly Icelandic everyman).
  ctx.fillStyle = '#7a6a52';
  ctx.beginPath();
  ctx.arc(cx, cy - s * 0.12, s * 0.33, Math.PI, 2 * Math.PI);
  ctx.fill();
  // Eyes.
  ctx.fillStyle = '#222';
  const eyeY = cy - 4;
  if (mood === 'critical') {
    ctx.fillRect(cx - 22, eyeY, 12, 3);
    ctx.fillRect(cx + 10, eyeY, 12, 3);
  } else {
    ctx.fillRect(cx - 20, eyeY - 4, 8, 8);
    ctx.fillRect(cx + 12, eyeY - 4, 8, 8);
  }
  // Brows convey worry as health drops.
  ctx.strokeStyle = '#5a4a32';
  ctx.lineWidth = 3;
  ctx.beginPath();
  if (mood === 'hurt' || mood === 'critical') {
    ctx.moveTo(cx - 24, eyeY - 12);
    ctx.lineTo(cx - 8, eyeY - 6);
    ctx.moveTo(cx + 24, eyeY - 12);
    ctx.lineTo(cx + 8, eyeY - 6);
  } else {
    ctx.moveTo(cx - 24, eyeY - 10);
    ctx.lineTo(cx - 8, eyeY - 10);
    ctx.moveTo(cx + 8, eyeY - 10);
    ctx.lineTo(cx + 24, eyeY - 10);
  }
  ctx.stroke();
  // Mouth.
  ctx.strokeStyle = '#7a2a2a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  const my = cy + s * 0.16;
  if (mood === 'victory') {
    ctx.arc(cx, my - 6, 14, 0.1 * Math.PI, 0.9 * Math.PI);
  } else if (mood === 'critical') {
    ctx.arc(cx, my + 10, 12, 1.15 * Math.PI, 1.85 * Math.PI);
  } else if (mood === 'hurt') {
    ctx.moveTo(cx - 12, my);
    ctx.lineTo(cx + 12, my);
  } else {
    ctx.moveTo(cx - 12, my);
    ctx.lineTo(cx + 12, my - 2);
  }
  ctx.stroke();
  // Sweat bead when critical.
  if (mood === 'critical') {
    ctx.fillStyle = '#9ad0ff';
    ctx.beginPath();
    ctx.arc(cx + s * 0.26, cy - s * 0.08, 5, 0, Math.PI * 2);
    ctx.fill();
  }
}

/**
 * Generate the full sprite set keyed by string. Must run in a browser context.
 */
export type SpriteRegistry = Map<string, Texture>;

/** Generate all string-keyed sprites for entities, weapon, and HUD faces. */
export function generateSpriteRegistry(): SpriteRegistry {
  const s = SPRITE_SIZE;
  const reg: SpriteRegistry = new Map();
  const add = (key: string, painter: (ctx: CanvasRenderingContext2D) => void) => {
    const ctx = makeCtx(s);
    painter(ctx);
    reg.set(key, pack(ctx, s));
  };

  // Enemy walk cycle (two frames with a vertical bob).
  add('redTape_walk0', (ctx) => paintRedTape(ctx, s, { bob: 0, tilt: 0, armUp: false }));
  add('redTape_walk1', (ctx) => paintRedTape(ctx, s, { bob: -4, tilt: 0.04, armUp: false }));
  add('redTape_attack', (ctx) => paintRedTape(ctx, s, { bob: -2, tilt: -0.05, armUp: true }));
  add('redTape_stunned', (ctx) => paintRedTape(ctx, s, { bob: 6, tilt: 0.25, armUp: false }));
  add('redTape_dispersed0', (ctx) => paintRedTape(ctx, s, { bob: 0, tilt: 0, armUp: false, dispersePhase: 0.33 }));
  add('redTape_dispersed1', (ctx) => paintRedTape(ctx, s, { bob: 0, tilt: 0, armUp: false, dispersePhase: 0.66 }));
  add('redTape_dispersed2', (ctx) => paintRedTape(ctx, s, { bob: 0, tilt: 0, armUp: false, dispersePhase: 0.95 }));

  // Pickups.
  add('coffee', (ctx) => paintCoffee(ctx, s));
  add('kleinur', (ctx) => paintKleinur(ctx, s));

  // Decorations.
  add('desk', (ctx) => paintDesk(ctx, s));
  add('plant', (ctx) => paintPlant(ctx, s));
  add('coat_of_arms', (ctx) => paintCoatOfArms(ctx, s));

  // Weapon viewmodel frames.
  add('spoon_idle', (ctx) => paintSpoon(ctx, s, 0));
  add('spoon_swing0', (ctx) => paintSpoon(ctx, s, 0.4));
  add('spoon_swing1', (ctx) => paintSpoon(ctx, s, 0.8));
  add('spoon_swing2', (ctx) => paintSpoon(ctx, s, 1));

  // HUD faces.
  add('face_normal', (ctx) => paintFace(ctx, s, 'normal'));
  add('face_hurt', (ctx) => paintFace(ctx, s, 'hurt'));
  add('face_critical', (ctx) => paintFace(ctx, s, 'critical'));
  add('face_victory', (ctx) => paintFace(ctx, s, 'victory'));

  return reg;
}
