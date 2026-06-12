/**
 * Input handling: keyboard state, mouse-look via Pointer Lock, attack clicks,
 * and one-shot action edges (interact, pause, fullscreen).
 */

import type { MovementInput } from './player';

export class InputManager {
  private keys = new Set<string>();
  private mouseDeltaX = 0;
  private attackQueued = false;
  private interactQueued = false;
  private pauseQueued = false;
  private fullscreenQueued = false;
  private restartQueued = false;
  private readonly canvas: HTMLCanvasElement;
  pointerLocked = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.attach();
  }

  private attach(): void {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.canvas.addEventListener('mousedown', this.onMouseDown);
    document.addEventListener('mousemove', this.onMouseMove);
    document.addEventListener('pointerlockchange', this.onPointerLockChange);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.canvas.removeEventListener('mousedown', this.onMouseDown);
    document.removeEventListener('mousemove', this.onMouseMove);
    document.removeEventListener('pointerlockchange', this.onPointerLockChange);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const code = e.code;
    if (!this.keys.has(code)) {
      // Rising-edge one-shot actions.
      if (code === 'KeyE' || code === 'Space') this.interactQueued = true;
      if (code === 'Escape') this.pauseQueued = true;
      if (code === 'KeyF') this.fullscreenQueued = true;
      if (code === 'KeyR') this.restartQueued = true;
    }
    this.keys.add(code);
    // Prevent the page from scrolling on movement / space.
    if (
      ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(
        code,
      )
    ) {
      e.preventDefault();
    }
  };

  private onKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private onMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) this.attackQueued = true;
  };

  private onMouseMove = (e: MouseEvent): void => {
    if (this.pointerLocked) this.mouseDeltaX += e.movementX;
  };

  private onPointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
  };

  /** Request pointer lock (must be called from a user gesture). */
  requestPointerLock(): void {
    this.canvas.requestPointerLock();
  }

  /** Build this frame's movement input and reset the accumulated mouse delta. */
  consumeMovement(): MovementInput {
    const input: MovementInput = {
      forward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      backward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      strafeLeft: this.keys.has('KeyA'),
      strafeRight: this.keys.has('KeyD'),
      turnLeft: this.keys.has('ArrowLeft'),
      turnRight: this.keys.has('ArrowRight'),
      mouseDeltaX: this.mouseDeltaX,
    };
    this.mouseDeltaX = 0;
    return input;
  }

  /** True once per attack click. */
  consumeAttack(): boolean {
    const v = this.attackQueued;
    this.attackQueued = false;
    return v;
  }

  consumeInteract(): boolean {
    const v = this.interactQueued;
    this.interactQueued = false;
    return v;
  }

  consumePause(): boolean {
    const v = this.pauseQueued;
    this.pauseQueued = false;
    return v;
  }

  consumeFullscreen(): boolean {
    const v = this.fullscreenQueued;
    this.fullscreenQueued = false;
    return v;
  }

  consumeRestart(): boolean {
    const v = this.restartQueued;
    this.restartQueued = false;
    return v;
  }
}
