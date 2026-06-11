//! Web Audio implementation of [`AudioSink`].
//!
//! One-shot SFX create a fresh `AudioBufferSourceNode` per play; music uses a
//! single looping source. Buffers are decoded during asset loading.

use crate::boundary::{AudioSink, Sound};
use std::cell::RefCell;
use std::collections::HashMap;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::{AudioBuffer, AudioBufferSourceNode, AudioContext, GainNode};

struct Inner {
    ctx: AudioContext,
    gain: GainNode,
    buffers: HashMap<Sound, AudioBuffer>,
    music_buffer: Option<AudioBuffer>,
    music_node: Option<AudioBufferSourceNode>,
    muted: bool,
    volume: f32,
}

pub struct WebAudio {
    inner: Rc<RefCell<Inner>>,
}

impl WebAudio {
    pub fn new() -> Result<Self, JsValue> {
        let ctx = AudioContext::new()?;
        let gain = ctx.create_gain()?;
        gain.connect_with_audio_node(&ctx.destination())?;
        gain.gain().set_value(0.7);
        Ok(Self {
            inner: Rc::new(RefCell::new(Inner {
                ctx,
                gain,
                buffers: HashMap::new(),
                music_buffer: None,
                music_node: None,
                muted: false,
                volume: 0.7,
            })),
        })
    }

    async fn decode(&self, bytes: &[u8]) -> Result<AudioBuffer, JsValue> {
        let array = js_sys::Uint8Array::from(bytes);
        let buffer = array.buffer();
        let ctx = self.inner.borrow().ctx.clone();
        let promise = ctx.decode_audio_data(&buffer)?;
        let result = JsFuture::from(promise).await?;
        result.dyn_into::<AudioBuffer>()
    }

    /// Decode and store a one-shot sound effect (best-effort; silently ignored
    /// if the bytes don't decode or the file is missing).
    pub async fn load_sound(&self, sound: Sound, bytes: &[u8]) {
        if let Ok(buf) = self.decode(bytes).await {
            self.inner.borrow_mut().buffers.insert(sound, buf);
        }
    }

    /// Decode and store the looping music track.
    pub async fn load_music(&self, bytes: &[u8]) {
        if let Ok(buf) = self.decode(bytes).await {
            self.inner.borrow_mut().music_buffer = Some(buf);
        }
    }
}

impl AudioSink for WebAudio {
    fn play(&self, sound: Sound) {
        let inner = self.inner.borrow();
        if inner.muted {
            return;
        }
        let _ = inner.ctx.resume();
        if let Some(buf) = inner.buffers.get(&sound) {
            if let Ok(src) = inner.ctx.create_buffer_source() {
                src.set_buffer(Some(buf));
                let _ = src.connect_with_audio_node(&inner.gain);
                let _ = src.start();
            }
        }
    }

    fn play_music(&self, looping: bool) {
        let mut inner = self.inner.borrow_mut();
        let _ = inner.ctx.resume();
        let buf = match inner.music_buffer.clone() {
            Some(b) => b,
            None => return,
        };
        if let Ok(src) = inner.ctx.create_buffer_source() {
            src.set_buffer(Some(&buf));
            src.set_loop(looping);
            if src.connect_with_audio_node(&inner.gain).is_ok() && src.start().is_ok() {
                inner.music_node = Some(src);
            }
        }
    }

    fn stop_music(&self) {
        let mut inner = self.inner.borrow_mut();
        if let Some(node) = inner.music_node.take() {
            // web-sys marks the stop variants deprecated; the call is correct.
            #[allow(deprecated)]
            let _ = node.stop_with_when(0.0);
        }
    }

    fn set_volume(&self, volume: f32) {
        let mut inner = self.inner.borrow_mut();
        inner.volume = volume.clamp(0.0, 1.0);
        if !inner.muted {
            inner.gain.gain().set_value(inner.volume);
        }
    }

    fn set_muted(&self, muted: bool) {
        let mut inner = self.inner.borrow_mut();
        inner.muted = muted;
        let v = if muted { 0.0 } else { inner.volume };
        inner.gain.gain().set_value(v);
    }
}
