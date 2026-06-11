// Captures keyboard and mouse input, normalizes to action flags.
// Mouse look uses Pointer Lock.

import type { InputState } from './types';

export class InputSystem {
  private keys = new Set<string>();
  private accumulatedTurn = 0;
  private interactPressed = false;
  private attackPressed = false;
  private pausePressed = false;
  private canvas: HTMLCanvasElement | null = null;
  private pointerLocked = false;
  private onPointerLockChange: ((locked: boolean) => void) | null = null;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
    canvas.addEventListener('mousedown', this.handleMouseDown);
    document.addEventListener('mousemove', this.handleMouseMove);
    document.addEventListener('pointerlockchange', this.handlePointerLockChange);
  }

  dispose(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
    this.canvas?.removeEventListener('mousedown', this.handleMouseDown);
    document.removeEventListener('mousemove', this.handleMouseMove);
    document.removeEventListener(
      'pointerlockchange',
      this.handlePointerLockChange,
    );
  }

  requestPointerLock(): void {
    this.canvas?.requestPointerLock();
  }

  isPointerLocked(): boolean {
    return this.pointerLocked;
  }

  setPointerLockChangeHandler(handler: (locked: boolean) => void): void {
    this.onPointerLockChange = handler;
  }

  getInput(): InputState {
    return {
      moveForward: this.keys.has('KeyW') || this.keys.has('ArrowUp'),
      moveBackward: this.keys.has('KeyS') || this.keys.has('ArrowDown'),
      strafeLeft: this.keys.has('KeyA'),
      strafeRight: this.keys.has('KeyD'),
      turnDelta: this.accumulatedTurn,
      interact: this.interactPressed,
      attack: this.attackPressed,
      pause: this.pausePressed,
    };
  }

  /** Clear per-frame accumulators and one-shot flags. Call at end of frame. */
  reset(): void {
    this.accumulatedTurn = 0;
    this.interactPressed = false;
    this.attackPressed = false;
    this.pausePressed = false;
  }

  private handleKeyDown = (e: KeyboardEvent): void => {
    this.keys.add(e.code);
    if (e.code === 'KeyE' || e.code === 'Space') {
      this.interactPressed = true;
    }
    if (e.code === 'Escape') {
      this.pausePressed = true;
    }
    // Prevent space/arrow scrolling the page.
    if (
      e.code === 'Space' ||
      e.code === 'ArrowUp' ||
      e.code === 'ArrowDown' ||
      e.code === 'ArrowLeft' ||
      e.code === 'ArrowRight'
    ) {
      e.preventDefault();
    }
  };

  private handleKeyUp = (e: KeyboardEvent): void => {
    this.keys.delete(e.code);
  };

  private handleMouseDown = (e: MouseEvent): void => {
    if (e.button === 0) {
      this.attackPressed = true;
    }
  };

  private handleMouseMove = (e: MouseEvent): void => {
    if (this.pointerLocked) {
      this.accumulatedTurn += e.movementX;
    }
  };

  private handlePointerLockChange = (): void => {
    this.pointerLocked = document.pointerLockElement === this.canvas;
    this.onPointerLockChange?.(this.pointerLocked);
  };
}
