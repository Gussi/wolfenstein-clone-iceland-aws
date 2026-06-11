//! `fetch`-based asset loading implementing [`AssetSource`].

use crate::boundary::{AssetError, AssetSource};
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use wasm_bindgen_futures::JsFuture;
use web_sys::Response;

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
