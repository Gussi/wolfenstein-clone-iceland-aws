//! `fetch`-based asset loading implementing [`AssetSource`].

use crate::boundary::{AssetError, AssetSource, TextureImage};
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::Response;

/// Decode a PNG sprite sheet and slice it into `tile_size × tile_size` RGBA tiles (row-major order).
pub fn decode_sprite_sheet(data: &[u8], tile_size: usize) -> Result<Vec<TextureImage>, String> {
    let decoder = png::Decoder::new(data);
    let mut reader = decoder.read_info().map_err(|e| e.to_string())?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).map_err(|e| e.to_string())?;
    let rgba = match info.color_type {
        png::ColorType::Rgba => buf[..info.buffer_size()].to_vec(),
        png::ColorType::Rgb => {
            let rgb = &buf[..info.buffer_size()];
            let mut out = Vec::with_capacity((rgb.len() / 3) * 4);
            for chunk in rgb.chunks_exact(3) {
                out.extend_from_slice(chunk);
                out.push(255);
            }
            out
        }
        _ => return Err(format!("unsupported color type: {:?}", info.color_type)),
    };
    let (w, h) = (info.width as usize, info.height as usize);
    let cols = w / tile_size;
    let rows = h / tile_size;
    let mut tiles = Vec::with_capacity(cols * rows);
    for row in 0..rows {
        for col in 0..cols {
            let mut pixels = vec![0u8; tile_size * tile_size * 4];
            for y in 0..tile_size {
                let src_offset = ((row * tile_size + y) * w + col * tile_size) * 4;
                let dst_offset = y * tile_size * 4;
                pixels[dst_offset..dst_offset + tile_size * 4]
                    .copy_from_slice(&rgba[src_offset..src_offset + tile_size * 4]);
            }
            tiles.push(TextureImage::new(tile_size, pixels));
        }
    }
    Ok(tiles)
}

pub struct BrowserAssets;

impl BrowserAssets {
    pub fn new() -> Self {
        Self
    }
}

async fn fetch(url: &str) -> Result<Response, JsValue> {
    let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
    let resp = JsFuture::from(window.fetch_with_str(url)).await?;
    resp.dyn_into::<Response>()
}

impl AssetSource for BrowserAssets {
    async fn load_bytes(&self, url: &str) -> Result<Vec<u8>, AssetError> {
        let resp = fetch(url).await.map_err(|_| AssetError::Fetch {
            url: url.into(),
            status: 0,
        })?;
        if !resp.ok() {
            return Err(AssetError::Fetch {
                url: url.into(),
                status: resp.status(),
            });
        }
        let array_buffer = resp
            .array_buffer()
            .map_err(|_| AssetError::Decode { url: url.into() })?;
        let buf = JsFuture::from(array_buffer)
            .await
            .map_err(|_| AssetError::Decode { url: url.into() })?;
        let array = js_sys::Uint8Array::new(&buf);
        Ok(array.to_vec())
    }

    async fn load_text(&self, url: &str) -> Result<String, AssetError> {
        let resp = fetch(url).await.map_err(|_| AssetError::Fetch {
            url: url.into(),
            status: 0,
        })?;
        if !resp.ok() {
            return Err(AssetError::Fetch {
                url: url.into(),
                status: resp.status(),
            });
        }
        let text_promise = resp
            .text()
            .map_err(|_| AssetError::Decode { url: url.into() })?;
        let text = JsFuture::from(text_promise)
            .await
            .map_err(|_| AssetError::Decode { url: url.into() })?;
        text.as_string()
            .ok_or(AssetError::Decode { url: url.into() })
    }

    fn on_progress(&self, loaded: u32, total: u32) {
        web_sys::console::log_1(&format!("[assets] {loaded}/{total}").into());
    }
}
