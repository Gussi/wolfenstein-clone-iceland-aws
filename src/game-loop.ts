// Master game loop: orchestrates the frame pipeline, manages game states,
// handles interactions and win/lose conditions.

import {
  GAME_OVER_DURATION,
  INTRO_DURATION,
  INTERACTION_RANGE,
  LEVEL_COMPLETE_BONUS,
  PICKUP_RADIUS,
  SCORE_PER_SECRET,
  SCREEN_HEIGHT,
  SCREEN_WIDTH,
} from './constants';
import { AudioSystem } from './audio-system';
import { CombatSystem } from './combat-system';
import { EnemyAI } from './enemy-ai';
import { EntitySystem } from './entity-system';
import { HUDRenderer } from './hud-renderer';
import { InputSystem } from './input-system';
import { MapSystem } from './map-system';
import { Player } from './player';
import { Renderer } from './renderer';
import type { AssetLoader } from './asset-loader';
import type { GameStatus, LevelStats, MapJSON } from './types';

export interface GameSystems {
  assets: AssetLoader;
  input: InputSystem;
  audio: AudioSystem;
  renderer: Renderer;
  hud: HUDRenderer;
  mainCtx: CanvasRenderingContext2D;
  offscreenCanvas: HTMLCanvasElement;
  displayCanvas: HTMLCanvasElement;
}

export class GameLoop {
  private status: GameStatus = 'loading';
  private map = new MapSystem();
  private entities = new EntitySystem();
  private enemyAI = new EnemyAI();
  private combat: CombatSystem;
  private player!: Player;

  private mapData: MapJSON;
  private rafId = 0;
  private lastTime = 0;
  private elapsedTime = 0;
  private gameOverTimer = 0;
  private connections = 0;
  private secretsFound = 0;
  private running = false;

  constructor(
    private systems: GameSystems,
    mapData: MapJSON,
  ) {
    this.mapData = mapData;
    this.combat = new CombatSystem(this.enemyAI);
    this.loadLevel();
  }

  private loadLevel(): void {
    this.map.loadMap(this.mapData);
    this.entities.spawnFromMap(this.mapData);
    const spawn = this.mapData.playerSpawn;
    this.player = new Player(spawn.x + 0.5, spawn.y + 0.5, spawn.angle);
    this.combat.reset();
    this.elapsedTime = 0;
    this.gameOverTimer = 0;
    this.connections = 0;
    this.secretsFound = 0;
  }

  restart(): void {
    this.loadLevel();
    this.systems.hud.clearText();
    this.setStatus('intro');
    this.systems.hud.showText(
      'You just need to file one form...',
      INTRO_DURATION,
    );
  }

  start(): void {
    this.running = true;
    this.setStatus('intro');
    this.systems.hud.showText(
      'You just need to file one form...',
      INTRO_DURATION,
    );
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  getStatus(): GameStatus {
    return this.status;
  }

  private setStatus(status: GameStatus): void {
    this.status = status;
  }

  private tick = (now: number): void => {
    if (!this.running) return;
    let dt = (now - this.lastTime) / 1000;
    this.lastTime = now;
    // Clamp delta to avoid spiral-of-death after tab switches.
    if (dt > 0.1) dt = 0.1;

    this.update(dt);
    this.render();

    this.systems.input.reset();
    this.rafId = requestAnimationFrame(this.tick);
  };

  private update(dt: number): void {
    const input = this.systems.input.getInput();
    this.systems.hud.update(dt);

    switch (this.status) {
      case 'intro':
        this.elapsedTime += dt;
        if (input.attack || input.interact || this.introTimedOut()) {
          this.systems.hud.clearText();
          this.setStatus('playing');
        }
        break;

      case 'playing':
        this.updatePlaying(input, dt);
        break;

      case 'paused':
        if (input.pause) this.setStatus('playing');
        break;

      case 'gameOver':
        this.gameOverTimer += dt;
        if (this.gameOverTimer >= GAME_OVER_DURATION && this.restartPressed(input)) {
          this.restart();
        }
        break;

      case 'victory':
        if (this.restartPressed(input)) {
          this.restart();
        }
        break;
    }
  }

  private updatePlaying(
    input: ReturnType<InputSystem['getInput']>,
    dt: number,
  ): void {
    if (input.pause) {
      this.setStatus('paused');
      return;
    }

    this.elapsedTime += dt;

    // 1. Player movement.
    this.player.update(input, this.map, dt);
    const playerState = this.player.getPosition();

    // 2. Enemy AI updates.
    for (const enemy of this.entities.getEnemies()) {
      const outcome = this.enemyAI.update(enemy, {
        player: playerState,
        map: this.map,
        deltaTime: dt,
      });
      if (outcome.dealtDamage > 0) {
        this.player.takeDamage(outcome.dealtDamage);
        this.systems.audio.play('sfx-player-hurt');
      }
      if (outcome.startedTaunt && enemy.tauntText) {
        this.systems.hud.showTaunt(enemy.tauntText);
      }
    }

    // 3. Combat / weapon.
    if (input.attack && this.combat.beginAttack()) {
      this.systems.audio.play('sfx-swing');
    }
    const attackResult = this.combat.update(dt, playerState, this.entities);
    if (attackResult?.hit) {
      this.systems.audio.play('sfx-hit');
      if (attackResult.dispersed) {
        this.systems.audio.play('sfx-disperse');
        this.connections += this.awardEnemyScore();
      }
    }

    // 4. Map animations.
    this.map.update(dt);

    // 5. Interactions (doors, pushwalls, pickups).
    if (input.interact) {
      this.handleInteraction();
    }
    this.handlePickups();

    // 6. Win/lose conditions.
    this.entities.removeInactive();
    if (this.player.isDead()) {
      this.setStatus('gameOver');
      this.gameOverTimer = 0;
      this.systems.audio.stopMusic();
    } else if (this.entities.getAliveEnemyCount() === 0) {
      this.connections += LEVEL_COMPLETE_BONUS;
      this.setStatus('victory');
      this.systems.audio.stopMusic();
      this.systems.audio.play('sfx-victory');
    }
  }

  private awardEnemyScore(): number {
    // SCORE_PER_ENEMY is added via combat hit result already at AI layer;
    // here we add the connections for the dispersed enemy.
    return 10;
  }

  private handleInteraction(): void {
    const p = this.player.getPosition();
    // Cell directly ahead of the player.
    const aheadX = Math.floor(p.x + p.dirX * INTERACTION_RANGE);
    const aheadY = Math.floor(p.y + p.dirY * INTERACTION_RANGE);

    const door = this.map.getDoorAt(aheadX, aheadY);
    if (door && this.map.openDoor(door)) {
      this.systems.audio.play('sfx-door');
      return;
    }

    const pushWall = this.map.getPushWallAt(aheadX, aheadY);
    if (pushWall && this.map.activatePushWall(pushWall)) {
      this.systems.audio.play('sfx-secret');
      this.secretsFound += 1;
      this.connections += SCORE_PER_SECRET;
    }
  }

  private handlePickups(): void {
    const p = this.player.getPosition();
    const pickups = this.entities.getPickupsInRange(p.x, p.y, PICKUP_RADIUS);
    for (const pickup of pickups) {
      this.player.heal(pickup.healAmount);
      pickup.active = false;
      this.systems.audio.play('sfx-pickup');
    }
  }

  private render(): void {
    const { renderer, hud, mainCtx, offscreenCanvas, displayCanvas } =
      this.systems;
    const playerState = this.player.getPosition();
    const sprites = this.entities.getVisibleSprites(
      playerState.x,
      playerState.y,
    );

    // Draw the 3D world to the offscreen buffer.
    renderer.render(playerState, this.map, sprites);

    // Scale offscreen to the display canvas.
    mainCtx.imageSmoothingEnabled = false;
    mainCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);
    mainCtx.drawImage(
      offscreenCanvas,
      0,
      0,
      SCREEN_WIDTH,
      SCREEN_HEIGHT,
      0,
      0,
      displayCanvas.width,
      displayCanvas.height,
    );

    // HUD overlay (full resolution).
    if (this.status === 'playing' || this.status === 'paused') {
      hud.render(mainCtx, displayCanvas.width, displayCanvas.height, {
        health: playerState.health,
        maxHealth: playerState.maxHealth,
        connections: this.connections,
        weapon: this.combat.getWeaponState(),
      });
    }

    if (this.status === 'paused') {
      this.drawCenteredBanner('PAUSED');
    } else if (this.status === 'gameOver') {
      hud.renderGameOver(
        mainCtx,
        displayCanvas.width,
        displayCanvas.height,
        this.gameOverTimer >= GAME_OVER_DURATION,
      );
    } else if (this.status === 'victory') {
      hud.renderStats(
        mainCtx,
        displayCanvas.width,
        displayCanvas.height,
        this.buildStats(),
        'FLOOR CLEARED',
      );
    }
  }

  private drawCenteredBanner(text: string): void {
    const { mainCtx, displayCanvas } = this.systems;
    mainCtx.fillStyle = 'rgba(10, 10, 10, 0.6)';
    mainCtx.fillRect(0, 0, displayCanvas.width, displayCanvas.height);
    mainCtx.fillStyle = '#e8e0d0';
    mainCtx.textAlign = 'center';
    mainCtx.font = `${Math.floor(displayCanvas.height * 0.08)}px 'Courier New', monospace`;
    mainCtx.fillText(text, displayCanvas.width / 2, displayCanvas.height / 2);
    mainCtx.textAlign = 'left';
  }

  private buildStats(): LevelStats {
    return {
      enemiesDispersed:
        this.entities.getTotalEnemyCount() -
        this.entities.getAliveEnemyCount(),
      totalEnemies: this.entities.getTotalEnemyCount(),
      secretsFound: this.secretsFound,
      totalSecrets: this.mapData.pushWalls.length,
      connections: this.connections,
      timeSeconds: this.elapsedTime,
    };
  }

  private introTimedOut(): boolean {
    return this.elapsedTime >= INTRO_DURATION;
  }

  private restartPressed(input: ReturnType<InputSystem['getInput']>): boolean {
    // 'R' is read via interact-agnostic check; map system uses keydown.
    return this.rKeyDown || input.interact;
  }

  // Track R key for restart.
  private rKeyDown = false;
  bindRestartKey(): void {
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyR') this.rKeyDown = true;
    });
    window.addEventListener('keyup', (e) => {
      if (e.code === 'KeyR') this.rKeyDown = false;
    });
  }
}
