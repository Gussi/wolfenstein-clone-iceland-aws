/**
 * GameLoop — master orchestrator. Runs the requestAnimationFrame cycle, manages
 * game status transitions, and drives the fixed frame pipeline:
 *   input → player → entities → combat → map → interactions → render → HUD → reset
 *
 * Stories: US-20 (intro), US-21 (game over), US-22 (victory)
 */
import {
  GAMEOVER_ANIM_DURATION,
  INTRO_DURATION,
  MAX_DELTA_TIME,
  SCORE_LEVEL_COMPLETE,
  SCORE_SECRET_FOUND,
  TAUNT_DURATION,
} from "./constants";
import { AssetLoader } from "./asset-loader";
import { AudioSystem } from "./audio-system";
import { CombatSystem } from "./combat-system";
import { EntitySystem } from "./entity-system";
import { HUDRenderer } from "./hud-renderer";
import { InputSystem } from "./input-system";
import { MapSystem } from "./map-system";
import { Player } from "./player";
import { Renderer } from "./renderer";
import type {
  FaceExpression,
  GameStatus,
  HUDState,
  LevelStats,
  MapJSON,
} from "./types";

export interface GameSystems {
  assets: AssetLoader;
  input: InputSystem;
  map: MapSystem;
  player: Player;
  entities: EntitySystem;
  combat: CombatSystem;
  audio: AudioSystem;
  renderer: Renderer;
  hud: HUDRenderer;
}

export class GameLoop {
  private status: GameStatus = "loading";
  private running = false;
  private lastTime = 0;
  private introTimer = 0;
  private gameOverTimer = 0;
  private elapsed = 0;
  private mapData: MapJSON;
  private s: GameSystems;

  constructor(systems: GameSystems, mapData: MapJSON) {
    this.s = systems;
    this.mapData = mapData;
  }

  /** Load the level and enter the intro state. */
  startLevel(): void {
    this.s.map.loadMap(this.mapData);
    const spawn = this.s.map.getPlayerSpawn();
    this.s.player.spawn(spawn.x + 0.5, spawn.y + 0.5, spawn.angle, 0);
    this.s.entities.spawnFromMap(this.mapData);
    this.s.hud.reset();
    this.elapsed = 0;
    this.introTimer = INTRO_DURATION;
    this.gameOverTimer = 0;
    this.setStatus("intro");
    this.s.hud.showText(
      "You just need to file one form.\nHow hard could it be?",
      INTRO_DURATION,
    );
    this.s.audio.playMusic("music");
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame);
  }

  stop(): void {
    this.running = false;
  }

  getStatus(): GameStatus {
    return this.status;
  }

  private setStatus(status: GameStatus): void {
    this.status = status;
  }

  private frame = (now: number): void => {
    if (!this.running) return;
    const deltaTime = Math.min((now - this.lastTime) / 1000, MAX_DELTA_TIME);
    this.lastTime = now;

    this.tick(deltaTime);

    requestAnimationFrame(this.frame);
  };

  private tick(deltaTime: number): void {
    const input = this.s.input.getInput();

    switch (this.status) {
      case "intro":
        this.tickIntro(input, deltaTime);
        break;
      case "playing":
        this.tickPlaying(input, deltaTime);
        break;
      case "paused":
        this.tickPaused(input);
        break;
      case "gameOver":
        this.tickGameOver(input, deltaTime);
        break;
      case "victory":
        this.tickVictory(input);
        break;
    }

    this.s.input.reset();
  }

  // -------------------------------------------------------------------------
  // States
  // -------------------------------------------------------------------------

  private tickIntro(
    input: ReturnType<InputSystem["getInput"]>,
    deltaTime: number,
  ): void {
    this.introTimer -= deltaTime;
    this.renderWorld();
    this.s.hud.update(deltaTime);
    this.s.hud.render(this.buildHUDState(), this.s.renderer.getContext());

    if (this.introTimer <= 0 || input.dismiss || input.attack) {
      this.s.hud.clearText();
      this.setStatus("playing");
    }
  }

  private tickPlaying(
    input: ReturnType<InputSystem["getInput"]>,
    deltaTime: number,
  ): void {
    // Pause if pointer lock was lost (player alt-tabbed / pressed Esc).
    if (!this.s.input.isPointerLocked()) {
      this.setStatus("paused");
      return;
    }

    this.elapsed += deltaTime;

    // 1-3. Player + rotation + movement
    this.s.player.update(input, this.s.map, deltaTime);

    // 4. Entities (AI ticks, pickups)
    const events = this.s.entities.update(this.s.player, this.s.map, deltaTime);
    this.applyEntityEvents(events);

    // 5. Combat
    if (input.attack && this.s.combat.startAttack()) {
      this.s.audio.play("swing");
    }
    const attack = this.s.combat.update(
      this.s.player.getState(),
      this.s.entities,
      deltaTime,
    );
    if (attack.swung && attack.hit) {
      this.s.audio.play("hit");
      if (attack.dispersed) {
        this.s.audio.play("enemy_dispersed");
        this.s.player.addConnections(attack.scoreAwarded);
        this.s.player.getState().enemiesDispersed++;
      }
    }

    // 6. Map (door / pushwall animation)
    this.s.map.update(deltaTime);

    // 7. Interactions
    if (input.interact) this.handleInteraction();

    // 8. Win / lose checks
    if (this.s.player.isDead()) {
      this.beginGameOver();
      return;
    }
    if (this.s.entities.getAliveEnemyCount() === 0) {
      this.beginVictory();
      return;
    }

    // 9-10. Render world + HUD
    this.renderWorld();
    this.s.hud.update(deltaTime);
    this.s.hud.render(this.buildHUDState(), this.s.renderer.getContext());
  }

  private tickPaused(input: ReturnType<InputSystem["getInput"]>): void {
    this.renderWorld();
    this.s.hud.render(this.buildHUDState(), this.s.renderer.getContext());
    this.s.hud.showText("Paused\nClick to resume", 9999);
    this.s.hud.render(this.buildHUDState(), this.s.renderer.getContext());

    if (this.s.input.isPointerLocked()) {
      this.s.hud.clearText();
      this.setStatus("playing");
    }
    // dismiss is read to avoid stale latch but does not resume (pointer lock does)
    void input;
  }

  private tickGameOver(
    input: ReturnType<InputSystem["getInput"]>,
    deltaTime: number,
  ): void {
    this.gameOverTimer += deltaTime;
    this.renderWorld();

    const ctx = this.s.renderer.getContext();
    if (this.gameOverTimer < GAMEOVER_ANIM_DURATION) {
      this.s.hud.showText(
        "Ah, forget it.\nYou go home.",
        GAMEOVER_ANIM_DURATION,
      );
      this.s.hud.update(deltaTime);
      this.s.hud.render(this.buildHUDState(), ctx);
    } else {
      this.s.hud.showStats(
        this.buildStats(),
        "GAVE UP",
        "The form remains unfiled.",
        ctx,
      );
      if (input.dismiss || input.attack) this.startLevel();
    }
  }

  private tickVictory(input: ReturnType<InputSystem["getInput"]>): void {
    this.renderWorld();
    this.s.hud.showStats(
      this.buildStats(),
      "FORM FILED!",
      "Democracy prevails. Probably.",
      this.s.renderer.getContext(),
    );
    if (input.dismiss || input.attack) this.startLevel();
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  private beginGameOver(): void {
    this.gameOverTimer = 0;
    this.s.audio.stopMusic();
    this.s.hud.clearText();
    this.setStatus("gameOver");
  }

  private beginVictory(): void {
    this.s.player.addConnections(SCORE_LEVEL_COMPLETE);
    this.s.audio.stopMusic();
    this.s.audio.play("secret"); // celebratory chime stand-in
    this.s.hud.clearText();
    this.setStatus("victory");
  }

  private handleInteraction(): void {
    const target = this.s.player.getInteractionTarget();
    if (!this.s.player.canInteract(target.x, target.y)) return;
    const angle = this.s.player.getState().angle;
    const outcome = this.s.map.interactAt(target.x, target.y, angle);
    if (outcome === "door") {
      this.s.audio.play("door");
    } else if (outcome === "secret") {
      this.s.audio.play("secret");
      this.s.player.addConnections(SCORE_SECRET_FOUND);
      this.s.player.getState().secretsFound++;
    }
  }

  private applyEntityEvents(events: ReturnType<EntitySystem["update"]>): void {
    for (const p of events.pickupsCollected) {
      this.s.player.heal(p.healAmount);
      this.s.audio.play("pickup");
    }
    if (events.enemyAttacks > 0) {
      this.s.player.takeDamage(events.enemyAttacks);
      this.s.audio.play("player_hurt");
    }
    for (let i = 0; i < events.alertsTriggered; i++) {
      this.s.audio.play("enemy_alert");
    }
    if (events.newTaunts.length > 0) {
      this.s.hud.showTaunt(events.newTaunts[0].text, TAUNT_DURATION);
    }
  }

  private renderWorld(): void {
    const playerState = this.s.player.getState();
    const visible = this.s.entities.getVisibleEntities(playerState);
    this.s.renderer.render(playerState, this.s.map, visible);
  }

  private buildHUDState(): HUDState {
    const p = this.s.player.getState();
    return {
      health: p.health,
      maxHealth: p.maxHealth,
      connections: p.connections,
      weaponState: this.s.combat.getWeaponState(),
      faceExpression: this.faceExpression(),
    };
  }

  private faceExpression(): FaceExpression {
    if (this.status === "victory") return "victory";
    const pct = this.s.player.getHealth() / this.s.player.getMaxHealth();
    if (pct >= 0.75) return "normal";
    if (pct >= 0.4) return "hurt";
    return "critical";
  }

  private buildStats(): LevelStats {
    const p = this.s.player.getState();
    return {
      enemiesDispersed: p.enemiesDispersed,
      totalEnemies: this.s.entities.getTotalEnemies(),
      secretsFound: p.secretsFound,
      totalSecrets: this.s.map.getTotalSecrets(),
      connections: p.connections,
      timeSeconds: this.elapsed,
    };
  }
}
