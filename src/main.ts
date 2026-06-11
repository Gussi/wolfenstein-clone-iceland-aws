/**
 * Entry point — wires all systems together, loads assets with a progress bar,
 * and shows a click-to-play overlay (required for Pointer Lock + AudioContext).
 *
 * Stories: integration of all systems; US-20 loading/intro flow.
 */
import { AssetLoader } from "./asset-loader";
import { AudioSystem } from "./audio-system";
import { CombatSystem } from "./combat-system";
import { EntitySystem } from "./entity-system";
import { GameLoop } from "./game-loop";
import { HUDRenderer } from "./hud-renderer";
import { InputSystem } from "./input-system";
import { MapSystem } from "./map-system";
import { Player } from "./player";
import { Renderer } from "./renderer";
import type { AssetManifest } from "./types";

// ---------------------------------------------------------------------------
// Asset manifest — paths are relative to the served root. Missing textures fall
// back to procedural placeholders; missing sounds play silently. See ASSETS.md.
// ---------------------------------------------------------------------------
const WALL_IDS = [
  "dolerite_dark",
  "plaster_cream",
  "plaster_wainscot",
  "committee_door",
  "window_volcano",
  "portrait_wall",
  "bookshelf",
  "dolerite_arch",
  "plaster_sconce",
  "carpet_blue",
];

const SPRITE_IDS = [
  "redTape_idle_0",
  "redTape_idle_1",
  "redTape_walk_0",
  "redTape_walk_1",
  "redTape_walk_2",
  "redTape_walk_3",
  "redTape_attack_0",
  "redTape_attack_1",
  "redTape_stunned_0",
  "redTape_stunned_1",
  "redTape_dispersed_0",
  "redTape_dispersed_1",
  "redTape_dispersed_2",
  "coffee",
  "kleinur",
  "desk",
  "plant",
  "coat_of_arms",
];

const HUD_IDS = [
  "face_normal",
  "face_hurt",
  "face_critical",
  "face_victory",
  "spoon_swing_1",
  "spoon_swing_2",
  "spoon_swing_3",
];

function buildManifest(): AssetManifest {
  const textures: Record<string, string> = {};
  for (const id of WALL_IDS) textures[id] = `assets/textures/walls/${id}.png`;
  for (const id of SPRITE_IDS)
    textures[id] = `assets/textures/sprites/${id}.png`;
  for (const id of HUD_IDS) textures[id] = `assets/textures/hud/${id}.png`;
  // The wooden spoon idle frame uses the provided pan art.
  textures["spoon_idle"] = "assets/textures/hud/pan.png";

  const sounds: Record<string, string> = {
    swing: "assets/audio/sfx/swing.mp3",
    hit: "assets/audio/sfx/hit.mp3",
    pickup: "assets/audio/sfx/pickup.mp3",
    door: "assets/audio/sfx/door.mp3",
    secret: "assets/audio/sfx/secret.mp3",
    enemy_alert: "assets/audio/sfx/enemy_alert.mp3",
    enemy_attack: "assets/audio/sfx/enemy_attack.mp3",
    enemy_dispersed: "assets/audio/sfx/enemy_dispersed.mp3",
    player_hurt: "assets/audio/sfx/player_hurt.mp3",
    music: "assets/audio/music/loftsongur.mp3",
  };

  const maps: Record<string, string> = {
    level1: "assets/maps/level1.json",
  };

  return { textures, sounds, maps };
}

async function bootstrap(): Promise<void> {
  const canvas = document.getElementById("screen") as HTMLCanvasElement;
  const loadingEl = document.getElementById("loading")!;
  const loadingFill = document.getElementById("loading-bar-fill")!;
  const overlayEl = document.getElementById("overlay")!;

  // Size the display canvas to the window (kept 16:10 by CSS letterboxing).
  const resize = () => {
    const aspect = 640 / 400;
    let w = window.innerWidth;
    let h = Math.round(w / aspect);
    if (h > window.innerHeight) {
      h = window.innerHeight;
      w = Math.round(h * aspect);
    }
    canvas.width = w;
    canvas.height = h;
  };
  resize();
  window.addEventListener("resize", resize);

  // --- Construct systems ---
  const assets = new AssetLoader();
  const input = new InputSystem();
  const map = new MapSystem();
  const player = new Player();
  const entities = new EntitySystem();
  const combat = new CombatSystem();
  const audio = new AudioSystem(assets);
  const renderer = new Renderer(assets);
  const hud = new HUDRenderer(assets);

  renderer.init(canvas);
  input.init(canvas);

  // --- Load assets with progress ---
  assets.onProgress((loaded, total) => {
    const pct = total > 0 ? Math.round((loaded / total) * 100) : 100;
    (loadingFill as HTMLElement).style.width = `${pct}%`;
  });

  const manifest = buildManifest();

  try {
    await assets.loadAll(manifest);
  } catch (err) {
    loadingEl.textContent = `Failed to load level: ${(err as Error).message}`;
    return;
  }

  const mapData = assets.getMap("level1");

  const game = new GameLoop(
    { assets, input, map, player, entities, combat, audio, renderer, hud },
    mapData,
  );

  // Loading complete → show click-to-play overlay.
  loadingEl.classList.add("hidden");
  overlayEl.classList.remove("hidden");

  const beginPlay = async () => {
    overlayEl.classList.add("hidden");
    // Init audio + decode sounds now that we have a user gesture.
    const ctx = audio.init();
    if (ctx) {
      assets.setAudioContext(ctx);
      await audio.resume();
      // Decode sounds now (best-effort; failures are silent).
      try {
        await assets.loadAll({
          textures: {},
          sounds: manifest.sounds,
          maps: {},
        });
      } catch {
        /* silent audio */
      }
    }
    input.requestPointerLock();
    game.startLevel();
    game.start();
  };

  overlayEl.addEventListener("click", beginPlay, { once: true });
}

bootstrap();
