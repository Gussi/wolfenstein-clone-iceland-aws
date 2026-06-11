// Draws the Wolf3D-style bottom HUD bar plus text overlays (intro, taunts,
// game over, victory stats). Renders directly to the full-resolution canvas.

import {
  FACE_CRITICAL_THRESHOLD,
  FACE_HURT_THRESHOLD,
} from './constants';
import type { AssetLoader } from './asset-loader';
import type {
  FaceExpression,
  LevelStats,
  WeaponState,
} from './types';

export interface HUDState {
  health: number;
  maxHealth: number;
  connections: number;
  weapon: WeaponState;
}

interface FloatingTaunt {
  text: string;
  timer: number;
}

const HUD_HEIGHT_FRACTION = 0.18;
const PALETTE = {
  brass: '#c9a84a',
  cream: '#e8e0d0',
  darkStone: '#1a1a1e',
  blood: '#a83232',
  panel: '#2b2620',
};

export class HUDRenderer {
  private overlayText: string | null = null;
  private overlayTimer = 0;
  private taunts: FloatingTaunt[] = [];

  constructor(private assets: AssetLoader) {}

  showText(text: string, durationSeconds: number): void {
    this.overlayText = text;
    this.overlayTimer = durationSeconds;
  }

  clearText(): void {
    this.overlayText = null;
    this.overlayTimer = 0;
  }

  showTaunt(text: string): void {
    this.taunts.push({ text, timer: 1.5 });
  }

  update(deltaTime: number): void {
    if (this.overlayTimer > 0) {
      this.overlayTimer -= deltaTime;
      if (this.overlayTimer <= 0) this.overlayText = null;
    }
    this.taunts = this.taunts.filter((t) => {
      t.timer -= deltaTime;
      return t.timer > 0;
    });
  }

  render(
    ctx: CanvasRenderingContext2D,
    canvasWidth: number,
    canvasHeight: number,
    state: HUDState,
  ): void {
    const hudHeight = Math.floor(canvasHeight * HUD_HEIGHT_FRACTION);
    const hudY = canvasHeight - hudHeight;

    // HUD background bar.
    ctx.fillStyle = PALETTE.panel;
    ctx.fillRect(0, hudY, canvasWidth, hudHeight);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, hudY);
    ctx.lineTo(canvasWidth, hudY);
    ctx.stroke();

    this.drawHealth(ctx, canvasWidth, hudY, hudHeight, state);
    this.drawFace(ctx, canvasWidth, hudY, hudHeight, state);
    this.drawConnections(ctx, canvasWidth, hudY, hudHeight, state);
    this.drawWeapon(ctx, canvasWidth, hudY, state.weapon);

    this.drawTaunts(ctx, canvasWidth, canvasHeight);
    this.drawOverlayText(ctx, canvasWidth, canvasHeight, hudY);
  }

  private drawHealth(
    ctx: CanvasRenderingContext2D,
    w: number,
    hudY: number,
    hudHeight: number,
    state: HUDState,
  ): void {
    const fraction = Math.max(0, state.health / state.maxHealth);
    const label = 'PATIENCE';
    const barX = w * 0.05;
    const barY = hudY + hudHeight * 0.5;
    const barW = w * 0.22;
    const barH = hudHeight * 0.28;

    ctx.fillStyle = PALETTE.cream;
    ctx.font = `${Math.floor(hudHeight * 0.22)}px 'Courier New', monospace`;
    ctx.textAlign = 'left';
    ctx.fillText(label, barX, barY - hudHeight * 0.12);

    // Bar track.
    ctx.fillStyle = PALETTE.darkStone;
    ctx.fillRect(barX, barY, barW, barH);
    // Bar fill (color shifts toward blood as it drops).
    const fillColor =
      fraction > FACE_HURT_THRESHOLD
        ? '#5a9e4a'
        : fraction > FACE_CRITICAL_THRESHOLD
          ? PALETTE.brass
          : PALETTE.blood;
    ctx.fillStyle = fillColor;
    ctx.fillRect(barX, barY, barW * fraction, barH);
    ctx.strokeStyle = PALETTE.brass;
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    ctx.fillStyle = PALETTE.cream;
    ctx.fillText(`${Math.ceil(state.health)}`, barX + barW + 10, barY + barH);
  }

  private drawFace(
    ctx: CanvasRenderingContext2D,
    w: number,
    hudY: number,
    hudHeight: number,
    state: HUDState,
  ): void {
    const expression = this.faceExpression(state.health / state.maxHealth);
    const faceId = `hud-face-${expression}`;
    const size = hudHeight * 0.8;
    const fx = w / 2 - size / 2;
    const fy = hudY + hudHeight * 0.1;

    if (this.assets.hasTexture(faceId)) {
      this.blitTexture(ctx, faceId, fx, fy, size, size);
    } else {
      // Fallback: simple colored box.
      ctx.fillStyle = PALETTE.cream;
      ctx.fillRect(fx, fy, size, size);
    }
  }

  private drawConnections(
    ctx: CanvasRenderingContext2D,
    w: number,
    hudY: number,
    hudHeight: number,
    state: HUDState,
  ): void {
    ctx.fillStyle = PALETTE.cream;
    ctx.textAlign = 'right';
    ctx.font = `${Math.floor(hudHeight * 0.22)}px 'Courier New', monospace`;
    ctx.fillText('CONNECTIONS', w * 0.95, hudY + hudHeight * 0.38);
    ctx.fillStyle = PALETTE.brass;
    ctx.font = `bold ${Math.floor(hudHeight * 0.35)}px 'Courier New', monospace`;
    ctx.fillText(`${state.connections}`, w * 0.95, hudY + hudHeight * 0.8);
    ctx.textAlign = 'left';
  }

  private drawWeapon(
    ctx: CanvasRenderingContext2D,
    w: number,
    hudY: number,
    weapon: WeaponState,
  ): void {
    const frame =
      weapon.phase === 'swinging'
        ? `hud-spoon-swing-${weapon.frameIndex}`
        : 'hud-spoon-idle';
    const id = this.assets.hasTexture(frame) ? frame : 'hud-spoon-idle';
    const size = hudY * 0.5;
    const wx = w / 2 - size / 2;
    const wy = hudY - size;
    if (this.assets.hasTexture(id)) {
      this.blitTexture(ctx, id, wx, wy, size, size);
    }
  }

  private drawTaunts(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
  ): void {
    if (this.taunts.length === 0) return;
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(h * 0.03)}px 'Courier New', monospace`;
    let y = h * 0.2;
    for (const taunt of this.taunts) {
      const alpha = Math.min(1, taunt.timer);
      ctx.fillStyle = `rgba(232, 224, 208, ${alpha})`;
      ctx.fillText(`"${taunt.text}"`, w / 2, y);
      y += h * 0.05;
    }
    ctx.textAlign = 'left';
  }

  private drawOverlayText(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    hudY: number,
  ): void {
    if (!this.overlayText) return;
    ctx.fillStyle = 'rgba(10, 10, 10, 0.7)';
    const boxH = h * 0.12;
    const boxY = hudY / 2 - boxH / 2;
    ctx.fillRect(0, boxY, w, boxH);
    ctx.fillStyle = PALETTE.cream;
    ctx.textAlign = 'center';
    ctx.font = `${Math.floor(h * 0.035)}px 'Courier New', monospace`;
    ctx.fillText(this.overlayText, w / 2, boxY + boxH * 0.6);
    ctx.textAlign = 'left';
  }

  renderStats(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    stats: LevelStats,
    title: string,
  ): void {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.9)';
    ctx.fillRect(0, 0, w, h);

    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.brass;
    ctx.font = `bold ${Math.floor(h * 0.07)}px 'Courier New', monospace`;
    ctx.fillText(title, w / 2, h * 0.25);

    ctx.fillStyle = PALETTE.cream;
    ctx.font = `${Math.floor(h * 0.035)}px 'Courier New', monospace`;
    const lines = [
      `Red Tape dispersed: ${stats.enemiesDispersed} / ${stats.totalEnemies}`,
      `Secrets found: ${stats.secretsFound} / ${stats.totalSecrets}`,
      `Time: ${stats.timeSeconds.toFixed(1)}s`,
      `Connections: ${stats.connections}`,
    ];
    let y = h * 0.4;
    for (const line of lines) {
      ctx.fillText(line, w / 2, y);
      y += h * 0.07;
    }

    ctx.fillStyle = PALETTE.brass;
    ctx.font = `${Math.floor(h * 0.03)}px 'Courier New', monospace`;
    ctx.fillText('Press R to play again', w / 2, h * 0.85);
    ctx.textAlign = 'left';
  }

  renderGameOver(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    showPrompt: boolean,
  ): void {
    ctx.fillStyle = 'rgba(10, 10, 10, 0.85)';
    ctx.fillRect(0, 0, w, h);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `${Math.floor(h * 0.05)}px 'Courier New', monospace`;
    ctx.fillText('You give up and go home.', w / 2, h * 0.45);
    ctx.font = `${Math.floor(h * 0.03)}px 'Courier New', monospace`;
    ctx.fillStyle = PALETTE.brass;
    ctx.fillText('The form remains unfiled.', w / 2, h * 0.55);
    if (showPrompt) {
      ctx.fillText('Press R to try again', w / 2, h * 0.7);
    }
    ctx.textAlign = 'left';
  }

  private faceExpression(fraction: number): FaceExpression {
    if (fraction > FACE_HURT_THRESHOLD) return 'normal';
    if (fraction > FACE_CRITICAL_THRESHOLD) return 'hurt';
    return 'critical';
  }

  private blitTexture(
    ctx: CanvasRenderingContext2D,
    id: string,
    x: number,
    y: number,
    w: number,
    h: number,
  ): void {
    const texture = this.assets.getTexture(id);
    // Render texture pixels via a temporary canvas (cached per texture would be
    // an optimization; for HUD-sized elements this is fine).
    const tmp = document.createElement('canvas');
    tmp.width = texture.width;
    tmp.height = texture.height;
    const tctx = tmp.getContext('2d');
    if (!tctx) return;
    const imgData = new ImageData(
      new Uint8ClampedArray(texture.data),
      texture.width,
      texture.height,
    );
    tctx.putImageData(imgData, 0, 0);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(tmp, x, y, w, h);
  }
}
