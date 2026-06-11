//! wasm bootstrap: wire up the browser boundaries, load the level, and drive
//! the `requestAnimationFrame` loop (US-20).

use crate::app::App;
use crate::boundary::{AssetSource, Sound, TextureSet};
use crate::platform::{BrowserAssets, BrowserInput, CanvasSurface, WebAudio};
use crate::world::World;
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use web_sys::HtmlCanvasElement;

const MUSIC_URL: &str = "assets/audio/music/loftsongur-8bit.mp3";

/// Sound-effect manifest. Files are optional — missing ones load silently.
const SFX: &[(Sound, &str)] = &[
    (Sound::WeaponSwing, "assets/audio/sfx/swing.mp3"),
    (Sound::EnemyHit, "assets/audio/sfx/hit.mp3"),
    (Sound::EnemyDispersed, "assets/audio/sfx/disperse.mp3"),
    (Sound::EnemyAlert, "assets/audio/sfx/alert.mp3"),
    (Sound::Pickup, "assets/audio/sfx/pickup.mp3"),
    (Sound::DoorOpen, "assets/audio/sfx/door.mp3"),
    (Sound::Secret, "assets/audio/sfx/secret.mp3"),
    (Sound::PlayerHurt, "assets/audio/sfx/hurt.mp3"),
];

#[wasm_bindgen(start)]
pub fn start() {
    wasm_bindgen_futures::spawn_local(async {
        if let Err(e) = run().await {
            web_sys::console::error_1(&e);
        }
    });
}

async fn run() -> Result<(), JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let document = window
        .document()
        .ok_or_else(|| JsValue::from_str("no document"))?;
    let canvas = document
        .get_element_by_id("game")
        .ok_or_else(|| JsValue::from_str("missing #game canvas"))?
        .dyn_into::<HtmlCanvasElement>()?;

    let surface = CanvasSurface::new(&canvas)?;
    let input = BrowserInput::new(&canvas)?;
    let audio = WebAudio::new()?;
    let assets = BrowserAssets::new();

    // Level is required.
    let level_json = assets
        .load_text("assets/maps/level1.json")
        .await
        .map_err(|e| JsValue::from_str(&format!("level load failed: {e}")))?;
    let world = World::load(&level_json)
        .map_err(|e| JsValue::from_str(&format!("level parse failed: {e}")))?;

    // Textures: programmatic placeholders until final pixel art is supplied
    // (see assets/README.md).
    let textures = TextureSet::placeholder();

    // Audio is best-effort; the game is fully playable in silence.
    if let Ok(bytes) = assets.load_bytes(MUSIC_URL).await {
        audio.load_music(&bytes).await;
    }
    for (sound, url) in SFX {
        if let Ok(bytes) = assets.load_bytes(url).await {
            audio.load_sound(*sound, &bytes).await;
        }
    }

    let app = Rc::new(RefCell::new(App::new(
        world, surface, audio, input, textures,
    )));

    // requestAnimationFrame loop. `f` holds the closure; the closure reschedules
    // itself via `f`, and we leak `g` so the closure outlives `run`.
    let f: Rc<RefCell<Option<Closure<dyn FnMut(f64)>>>> = Rc::new(RefCell::new(None));
    let g = f.clone();
    *g.borrow_mut() = Some(Closure::<dyn FnMut(f64)>::new(move |ts: f64| {
        app.borrow_mut().tick(ts);
        request_animation_frame(f.borrow().as_ref().unwrap());
    }));
    request_animation_frame(g.borrow().as_ref().unwrap());
    std::mem::forget(g);
    Ok(())
}

fn request_animation_frame(f: &Closure<dyn FnMut(f64)>) {
    web_sys::window()
        .expect("no window")
        .request_animation_frame(f.as_ref().unchecked_ref())
        .expect("requestAnimationFrame failed");
}
