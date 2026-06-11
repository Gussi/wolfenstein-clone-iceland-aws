/**
 * InputSystem — captures keyboard + mouse and normalizes to an InputState.
 * Handles pointer lock for mouse-look. One-shot actions (interact, attack,
 * dismiss) are latched until reset() is called at the end of each frame.
 *
 * Stories: US-01 (movement), US-02 (mouse look), US-03 (interact), US-05 (attack)
 */
import type { InputState } from "./types";

export class InputSystem {
  private keys: Record<string, boolean> = {};
  private turnAccum = 0;
  private interactLatch = false;
  private attackLatch = false;
  private dismissLatch = false;
  private pointerLocked = false;
  private canvas: HTMLCanvasElement | null = null;

  // Bound handlers (kept as fields so they can be removed if needed)
  private onKeyDown = (e: KeyboardEvent) => {
    const key = e.key.toLowerCase();
    if (!this.keys[key]) {
      // rising edge
      if (key === "e" || key === " ") this.interactLatch = true;
      this.dismissLatch = true;
    }
    this.keys[key] = true;
    // Prevent space/arrows from scrolling the page
    if (key === " " || key.startsWith("arrow")) e.preventDefault();
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys[e.key.toLowerCase()] = false;
  };

  private onMouseMove = (e: MouseEvent) => {
    if (this.pointerLocked) this.turnAccum += e.movementX;
  };

  private onMouseDown = (e: MouseEvent) => {
    if (e.button === 0 && this.pointerLocked) {
      this.attackLatch = true;
    }
  };

  private onPointerLockChange = () => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousemove", this.onMouseMove);
    window.addEventListener("mousedown", this.onMouseDown);
    document.addEventListener("pointerlockchange", this.onPointerLockChange);
  }

  /** Request pointer lock — must be called from a user gesture. */
  requestPointerLock(): void {
    this.canvas?.requestPointerLock?.();
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  getInput(): InputState {
    const k = this.keys;
    const input: InputState = {
      moveForward: !!(k["w"] || k["arrowup"]),
      moveBackward: !!(k["s"] || k["arrowdown"]),
      strafeLeft: !!k["a"],
      strafeRight: !!k["d"],
      turnDelta: this.turnAccum,
      interact: this.interactLatch,
      attack: this.attackLatch,
      dismiss: this.dismissLatch,
    };
    // Keyboard turning fallback when not using the mouse (arrow left/right)
    if (k["arrowleft"]) input.turnDelta -= 6;
    if (k["arrowright"]) input.turnDelta += 6;
    return input;
  }

  /** Clear per-frame accumulators and one-shot latches. */
  reset(): void {
    this.turnAccum = 0;
    this.interactLatch = false;
    this.attackLatch = false;
    this.dismissLatch = false;
  }
}
