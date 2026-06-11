/**
 * HUDRenderer — draws the Wolf3D-style bottom bar (health, face, weapon,
 * connections) plus text overlays (intro, taunts, game over, victory, stats)
 * directly onto the full-resolution display canvas.
 *
 * Stories: US-13 (health), US-14 (weapon), US-15 (face), US-16 (score),
 *          US-20 (intro), US-22 (victory/stats), US-24 (taunts)
 */
import { TEXTURE_SIZE } from "./constants";
import { AssetLoader } from "./asset-loader";
import type { FaceExpression, HUDState, LevelStats } from "./types";

interface ActiveText {
  text: string;
  remaining: number;
}

export class HUDRenderer {
  private assets: AssetLoader;
  private textureCanvasCache = new Map<string, HTMLCanvasElement>();
  private overlayText: ActiveText | null = null;
  private taunt: ActiveText | null = null;

  constructor(assets: AssetLoader) {
    this.assets = assets;
  }

  /** Convert a LoadedTexture (pixel array) into a cached drawable canvas. */
  private getTextureCanvas(id: string): HTMLCanvasElement {
    const cached = this.textureCanvasCache.get(id);
    if (cached) return cached;

    const tex = this.assets.getTexture(id);
    const canvas = document.createElement("canvas");
    canvas.width = tex.width;
    canvas.height = tex.height;
    const ctx = canvas.getContext("2d")!;
    const imageData = ctx.createImageData(tex.width, tex.height);
    const buf = new Uint32Array(imageData.data.buffer);
    buf.set(tex.pixels);
    ctx.putImageData(imageData, 0, 0);
    this.textureCanvasCache.set(id, canvas);
    return canvas;
  }

  /** Advance timed overlays. */
  update(deltaTime: number): void {
    if (this.overlayText) {
      this.overlayText.remaining -= deltaTime;
      if (this.overlayText.remaining <= 0) this.overlayText = null;
    }
    if (this.taunt) {
      this.taunt.remaining -= deltaTime;
      if (this.taunt.remaining <= 0) this.taunt = null;
    }
  }

  showText(text: string, durationSeconds: number): void {
    this.overlayText = { text, remaining: durationSeconds };
  }

  clearText(): void {
    this.overlayText = null;
  }

  showTaunt(text: string, durationSeconds: number): void {
    this.taunt = { text, remaining: durationSeconds };
  }

  /** Draw the in-game HUD (weapon + bottom bar). */
  render(state: HUDState, ctx: CanvasRenderingContext2D): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    this.drawWeapon(state, ctx, W, H);
    this.drawBottomBar(state, ctx, W, H);

    if (this.taunt) this.drawTaunt(this.taunt.text, ctx, W);
    if (this.overlayText)
      this.drawCenteredBanner(this.overlayText.text, ctx, W, H);
  }

  private drawWeapon(
    state: HUDState,
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    const phase = state.weaponState.animationPhase;
    const frame = state.weaponState.frameIndex;
    const id =
      phase === "swinging" ? `spoon_swing_${Math.max(1, frame)}` : "spoon_idle";
    const canvas = this.getTextureCanvas(id);
    const barH = Math.floor(H * 0.16);
    const size = Math.min(W * 0.42, (H - barH) * 0.9);
    const x = (W - size) / 2;
    const y = H - barH - size + Math.floor(size * 0.15);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(canvas, 0, 0, TEXTURE_SIZE, TEXTURE_SIZE, x, y, size, size);
  }

  private drawBottomBar(
    state: HUDState,
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    const barH = Math.floor(H * 0.16);
    const barY = H - barH;

    // Bar background — dark dolerite with a brass top edge
    ctx.fillStyle = "#1a1712";
    ctx.fillRect(0, barY, W, barH);
    ctx.fillStyle = "#8a7440";
    ctx.fillRect(0, barY, W, 3);

    const pad = Math.floor(W * 0.03);
    const fontBig = Math.floor(barH * 0.42);
    const fontSmall = Math.floor(barH * 0.24);

    // --- Health (left) with low-health warning ---
    const healthPct = state.health / state.maxHealth;
    const critical = healthPct <= 0.39;
    ctx.font = `${fontSmall}px 'Courier New', monospace`;
    ctx.fillStyle = "#b8a878";
    ctx.textBaseline = "top";
    ctx.textAlign = "left";
    ctx.fillText("PATIENCE", pad, barY + barH * 0.18);

    // Flash red when critical
    const flash = critical && Math.floor(performance.now() / 250) % 2 === 0;
    ctx.font = `bold ${fontBig}px 'Courier New', monospace`;
    ctx.fillStyle = critical ? (flash ? "#ff5a5a" : "#aa3030") : "#e8e2d4";
    ctx.fillText(`${Math.ceil(state.health)}`, pad, barY + barH * 0.45);

    // --- Face portrait (center) ---
    const faceId = `face_${state.faceExpression}`;
    const faceCanvas = this.getTextureCanvas(faceId);
    const faceSize = Math.floor(barH * 0.82);
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(
      faceCanvas,
      0,
      0,
      TEXTURE_SIZE,
      TEXTURE_SIZE,
      Math.floor(W / 2 - faceSize / 2),
      barY + Math.floor((barH - faceSize) / 2),
      faceSize,
      faceSize,
    );

    // --- Connections score (right) ---
    ctx.textAlign = "right";
    ctx.font = `${fontSmall}px 'Courier New', monospace`;
    ctx.fillStyle = "#b8a878";
    ctx.fillText("CONNECTIONS", W - pad, barY + barH * 0.18);
    ctx.font = `bold ${fontBig}px 'Courier New', monospace`;
    ctx.fillStyle = "#e8e2d4";
    ctx.fillText(`${state.connections}`, W - pad, barY + barH * 0.45);

    ctx.textAlign = "left";
  }

  private drawTaunt(
    text: string,
    ctx: CanvasRenderingContext2D,
    W: number,
  ): void {
    const fontSize = Math.floor(W * 0.022);
    ctx.font = `italic ${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";
    const y = ctx.canvas.height * 0.12;
    // shadow for readability
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.fillText(text, W / 2 + 2, y + 2);
    ctx.fillStyle = "#ffd98a";
    ctx.fillText(text, W / 2, y);
    ctx.textAlign = "left";
  }

  private drawCenteredBanner(
    text: string,
    ctx: CanvasRenderingContext2D,
    W: number,
    H: number,
  ): void {
    const fontSize = Math.floor(W * 0.028);
    ctx.font = `${fontSize}px 'Courier New', monospace`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const lines = text.split("\n");
    const lineH = fontSize * 1.4;
    const blockH = lines.length * lineH;
    const startY = H / 2 - blockH / 2;

    // Backing panel
    ctx.fillStyle = "rgba(10,10,14,0.78)";
    ctx.fillRect(0, startY - lineH, W, blockH + lineH * 1.5);

    lines.forEach((line, i) => {
      ctx.fillStyle = "rgba(0,0,0,0.8)";
      ctx.fillText(line, W / 2 + 2, startY + i * lineH + 2);
      ctx.fillStyle = "#e8e2d4";
      ctx.fillText(line, W / 2, startY + i * lineH);
    });
    ctx.textAlign = "left";
  }

  /** Full-screen victory / game-over stats screen (US-22). */
  showStats(
    stats: LevelStats,
    title: string,
    subtitle: string,
    ctx: CanvasRenderingContext2D,
  ): void {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;

    ctx.fillStyle = "rgba(8,8,12,0.92)";
    ctx.fillRect(0, 0, W, H);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";

    const titleSize = Math.floor(W * 0.05);
    ctx.font = `bold ${titleSize}px 'Courier New', monospace`;
    ctx.fillStyle = "#e8e2d4";
    ctx.fillText(title, W / 2, H * 0.22);

    const subSize = Math.floor(W * 0.022);
    ctx.font = `italic ${subSize}px 'Courier New', monospace`;
    ctx.fillStyle = "#b8a878";
    ctx.fillText(subtitle, W / 2, H * 0.32);

    const lineSize = Math.floor(W * 0.026);
    ctx.font = `${lineSize}px 'Courier New', monospace`;
    ctx.fillStyle = "#d8d2c4";
    const lines = [
      `Bureaucrats dispersed:  ${stats.enemiesDispersed} / ${stats.totalEnemies}`,
      `Secrets found:          ${stats.secretsFound} / ${stats.totalSecrets}`,
      `Connections:            ${stats.connections}`,
      `Time:                   ${stats.timeSeconds.toFixed(1)}s`,
    ];
    const lineH = lineSize * 1.6;
    lines.forEach((line, i) => {
      ctx.fillText(line, W / 2, H * 0.46 + i * lineH);
    });

    ctx.font = `${subSize}px 'Courier New', monospace`;
    ctx.fillStyle = "#ffd98a";
    ctx.fillText("Press any key to file another form", W / 2, H * 0.82);
    ctx.textAlign = "left";
  }

  /** Loading-screen progress (used before assets are ready). */
  reset(): void {
    this.overlayText = null;
    this.taunt = null;
  }
}
