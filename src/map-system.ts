/**
 * MapSystem — owns the runtime grid, door states, and push-wall states.
 * Provides raycaster-friendly queries (isSolid, getTile) and animates
 * doors and push-walls each frame.
 *
 * Stories: US-03 (doors), US-11 (level loading), US-12 (push-wall secret)
 */
import {
  DOOR_OPEN_DURATION,
  PUSHWALL_SLIDE_CELLS,
  PUSHWALL_SLIDE_DURATION,
} from "./constants";
import type {
  DoorState,
  MapJSON,
  MapState,
  PushWallState,
  TileState,
} from "./types";

/** Maps wall-type numeric ID (from grid) to a texture id string. */
export const WALL_TEXTURE_BY_ID: Record<number, string> = {
  1: "dolerite_dark",
  2: "plaster_cream",
  3: "plaster_wainscot",
  4: "committee_door",
  5: "window_volcano",
  6: "portrait_wall",
  7: "bookshelf",
  8: "dolerite_arch",
  9: "plaster_sconce",
  10: "carpet_blue",
};

export class MapSystem {
  private state: MapState | null = null;
  private playerSpawn = { x: 1.5, y: 1.5, angle: 0 };
  private secretsRevealed = 0;

  loadMap(json: MapJSON): void {
    const grid: TileState[][] = [];
    for (let y = 0; y < json.height; y++) {
      const row: TileState[] = [];
      for (let x = 0; x < json.width; x++) {
        const wallType = json.grid[y][x];
        row.push({
          wallType,
          solid: wallType > 0,
          isDoor: false,
          isPushWall: false,
        });
      }
      grid.push(row);
    }

    // Doors: start closed (solid)
    const doors: DoorState[] = json.doors.map((d) => {
      grid[d.y][d.x].isDoor = true;
      grid[d.y][d.x].solid = true;
      return {
        id: d.id,
        x: d.x,
        y: d.y,
        state: "closed",
        openAmount: 0,
        textureId: d.textureId,
        orientation: d.orientation,
      };
    });

    // Push-walls: start hidden (solid, look like surrounding wall)
    const pushWalls: PushWallState[] = json.pushWalls.map((p) => {
      grid[p.y][p.x].isPushWall = true;
      grid[p.y][p.x].solid = true;
      return {
        id: p.id,
        x: p.x,
        y: p.y,
        state: "hidden",
        offset: 0,
        slideDirection: p.slideDirection,
        textureId: p.textureId,
        hintTextureId: p.hintTextureId,
        originX: p.x,
        originY: p.y,
      };
    });

    this.state = {
      name: json.name,
      width: json.width,
      height: json.height,
      grid,
      doors,
      pushWalls,
    };
    this.playerSpawn = { ...json.playerSpawn };
    this.secretsRevealed = 0;
  }

  private get s(): MapState {
    if (!this.state) throw new Error("MapSystem: no map loaded");
    return this.state;
  }

  getWidth(): number {
    return this.s.width;
  }

  getHeight(): number {
    return this.s.height;
  }

  getName(): string {
    return this.s.name;
  }

  getTile(gridX: number, gridY: number): TileState {
    if (
      gridX < 0 ||
      gridY < 0 ||
      gridX >= this.s.width ||
      gridY >= this.s.height
    ) {
      return { wallType: 1, solid: true, isDoor: false, isPushWall: false };
    }
    return this.s.grid[gridY][gridX];
  }

  /** Texture id for a wall cell, resolving doors and push-walls. */
  getWallTextureId(gridX: number, gridY: number): string {
    const tile = this.getTile(gridX, gridY);
    if (tile.isDoor) {
      const door = this.s.doors.find((d) => d.x === gridX && d.y === gridY);
      if (door) return door.textureId;
    }
    if (tile.isPushWall) {
      const pw = this.s.pushWalls.find(
        (p) => p.x === gridX && p.y === gridY && p.state !== "open",
      );
      // Subtle hint texture so attentive players can spot the secret (US-12).
      if (pw) return pw.hintTextureId;
    }
    return WALL_TEXTURE_BY_ID[tile.wallType] ?? "dolerite_dark";
  }

  isSolid(gridX: number, gridY: number): boolean {
    return this.getTile(Math.floor(gridX), Math.floor(gridY)).solid;
  }

  getDoors(): DoorState[] {
    return this.s.doors;
  }

  getPushWalls(): PushWallState[] {
    return this.s.pushWalls;
  }

  getPlayerSpawn(): { x: number; y: number; angle: number } {
    return { ...this.playerSpawn };
  }

  /** Number of push-wall secrets in the level (for level stats). */
  getTotalSecrets(): number {
    return this.s.pushWalls.length;
  }

  getSecretsRevealed(): number {
    return this.secretsRevealed;
  }

  /**
   * Attempt to interact with a door or push-wall at the given grid cell.
   * Returns a tag describing what happened so the caller can play audio / award score.
   */
  interactAt(
    gridX: number,
    gridY: number,
    facingAngle: number,
  ): "door" | "secret" | null {
    const tile = this.getTile(gridX, gridY);

    if (tile.isDoor) {
      const door = this.s.doors.find((d) => d.x === gridX && d.y === gridY);
      if (door && door.state === "closed") {
        door.state = "opening";
        return "door";
      }
      return null;
    }

    if (tile.isPushWall) {
      const pw = this.s.pushWalls.find((p) => p.x === gridX && p.y === gridY);
      if (pw && pw.state === "hidden") {
        pw.state = "sliding";
        pw.offset = 0;
        pw.slideDirection = this.snapDirection(facingAngle);
        this.secretsRevealed++;
        return "secret";
      }
    }

    return null;
  }

  private snapDirection(angle: number): "north" | "south" | "east" | "west" {
    // angle: 0 = east, PI/2 = south (y grows downward), PI = west, 3PI/2 = north
    const a = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
    if (a < Math.PI / 4 || a >= (7 * Math.PI) / 4) return "east";
    if (a < (3 * Math.PI) / 4) return "south";
    if (a < (5 * Math.PI) / 4) return "west";
    return "north";
  }

  /** Animate doors and push-walls. */
  update(deltaTime: number): void {
    if (!this.state) return;

    // Doors
    for (const door of this.s.doors) {
      if (door.state === "opening") {
        door.openAmount += deltaTime / DOOR_OPEN_DURATION;
        if (door.openAmount >= 1) {
          door.openAmount = 1;
          door.state = "open";
          this.s.grid[door.y][door.x].solid = false;
        }
      }
    }

    // Push-walls
    for (const pw of this.s.pushWalls) {
      if (pw.state === "sliding") {
        pw.offset +=
          (deltaTime / PUSHWALL_SLIDE_DURATION) * PUSHWALL_SLIDE_CELLS;
        if (pw.offset >= PUSHWALL_SLIDE_CELLS) {
          pw.offset = PUSHWALL_SLIDE_CELLS;
          pw.state = "open";
          // Original cell becomes empty/passable.
          const origin = this.s.grid[pw.originY][pw.originX];
          origin.solid = false;
          origin.isPushWall = false;
          origin.wallType = 0;
        }
      }
    }
  }
}
