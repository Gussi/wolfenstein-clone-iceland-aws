/**
 * HUD rendering: the bottom status bar (face portrait, health/patience bar,
 * connections score, weapon label) plus full-screen overlays for intro,
 * pause, game-over, and victory states. Drawn at full canvas resolution.
 */

import type { SpriteRegistry } from './assets/spriteGfx';
import { textureToCanvas } from './renderUtils';
import type { GameWorldState, PlayerState } from './types';

const BAR_COLOR = '#1a1a22';
const ACCENT = '#d8b24a';
const TEXT = '#e8e0c8';

function faceKey(player: PlayerState, victory: boolean): string {
  if (victory) return 'face_victory';
  const pct = player.health / player.maxHealth;
  if (pct >= 0.75) return 'face_normal';
  if (pct >= 0.4) return 'face_hurt';
  return 'face_critical';
}

/** Draw the bottom HUD bar. `w`/`h` are the main canvas dimensions. */
export function drawHud(
  ctx: CanvasRenderingContext2D,
  state: GameWorldState,
  sprites: SpriteRegistry,
  w: number,
  h: number,
): void {
  const barH = Math.max(64, Math.floor(h * 0.16));
  const top = h - barH;

  // Bar background.
  ctx.fillStyle = BAR_COLOR;
  ctx.fillRect(0, top, w, barH);
  ctx.fillStyle = ACCENT;
  ctx.fillRect(0, top, w, 3);

  const pad = Math.floor(barH * 0.12);
  const faceSize = barH - pad * 2;

  // Face portrait (left).
  const face = sprites.get(faceKey(state.player, state.gameStatus === 'victory'));
  if (face) {
    const canvas = textureToCanvas(face);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, pad, top + pad, faceSize, faceSize);
  }

  // Health / "patience" bar.
  const barX = pad * 2 + faceSize;
  const barW = Math.floor(w * 0.28);
  const barY = top + pad;
  ctx.fillStyle = TEXT;
  ctx.font = `${Math.floor(barH * 0.18)}px "Courier New", monospace`;
  ctx.textBaseline = 'top';
  ctx.fillText('PATIENCE', barX, barY);
  const innerY = barY + Math.floor(barH * 0.22);
  const innerH = Math.floor(barH * 0.3);
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 2;
  ctx.strokeRect(barX, innerY, barW, innerH);
  const pct = Math.max(0, state.player.health / state.player.maxHealth);
  ctx.fillStyle = pct > 0.4 ? '#5aa84a' : '#c8462f';
  ctx.fillRect(barX + 2, innerY + 2, Math.floor((barW - 4) * pct), innerH - 4);
  ctx.fillStyle = TEXT;
  ctx.fillText(
    `${Math.ceil(state.player.health)} / ${state.player.maxHealth}`,
    barX,
    innerY + innerH + 4,
  );

  // Connections score + secrets (center-right).
  const scoreX = barX + barW + pad * 2;
  ctx.fillStyle = ACCENT;
  ctx.fillText('CONNECTIONS', scoreX, barY);
  ctx.fillStyle = TEXT;
  ctx.font = `bold ${Math.floor(barH * 0.34)}px "Courier New", monospace`;
  ctx.fillText(`${state.score.connections}`, scoreX, barY + Math.floor(barH * 0.2));

  ctx.font = `${Math.floor(barH * 0.16)}px "Courier New", monospace`;
  ctx.fillStyle = '#9aa0b0';
  ctx.fillText(
    `Dispersed ${state.player.enemiesDispersed}/${state.levelStats.totalEnemies}   Secrets ${state.player.secretsFound}/${state.levelStats.totalSecrets}`,
    scoreX,
    top + barH - Math.floor(barH * 0.24),
  );

  // Weapon label (right).
  ctx.textAlign = 'right';
  ctx.fillStyle = ACCENT;
  ctx.font = `${Math.floor(barH * 0.18)}px "Courier New", monospace`;
  ctx.fillText('FRYING PAN', w - pad, top + pad);
  ctx.textAlign = 'left';
}

/** Draw the weapon viewmodel into the world view (already-scaled region). */
export function drawWeaponViewmodel(
  ctx: CanvasRenderingContext2D,
  spriteKey: string,
  sprites: SpriteRegistry,
  viewW: number,
  viewH: number,
): void {
  const tex = sprites.get(spriteKey);
  if (!tex) return;
  const canvas = textureToCanvas(tex);
  const size = Math.floor(Math.min(viewW, viewH) * 0.6);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(canvas, Math.floor(viewW / 2 - size / 2), viewH - size, size, size);
}

/** Floating enemy taunt text, drawn at a projected screen position. */
export function drawTaunt(
  ctx: CanvasRenderingContext2D,
  text: string,
  screenX: number,
  screenY: number,
  alpha: number,
): void {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#000';
  ctx.strokeText(text, screenX, screenY);
  ctx.fillStyle = '#ffe9a8';
  ctx.fillText(text, screenX, screenY);
  ctx.restore();
  ctx.textAlign = 'left';
}

/** Centered full-screen overlay with a title and optional lines of text. */
export function drawCenterOverlay(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  title: string,
  lines: string[],
  dim = true,
): void {
  if (dim) {
    ctx.fillStyle = 'rgba(10,10,14,0.72)';
    ctx.fillRect(0, 0, w, h);
  }
  ctx.textAlign = 'center';
  ctx.fillStyle = ACCENT;
  ctx.font = `bold ${Math.floor(h * 0.07)}px "Courier New", monospace`;
  ctx.fillText(title, w / 2, h * 0.34);
  ctx.fillStyle = TEXT;
  ctx.font = `${Math.floor(h * 0.032)}px "Courier New", monospace`;
  let y = h * 0.46;
  for (const line of lines) {
    ctx.fillText(line, w / 2, y);
    y += h * 0.05;
  }
  ctx.textAlign = 'left';
}
