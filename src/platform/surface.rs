//! Canvas presentation: blit the RGBA framebuffer via `putImageData`.
//!
//! The canvas element is sized to the internal resolution (640x400) and scaled
//! up by CSS with `image-rendering: pixelated`, so no manual scaling is needed
//! here — a single `put_image_data` per frame presents the world.

use crate::boundary::Surface;
use crate::systems::raycaster::Framebuffer;
use wasm_bindgen::Clamped;
use web_sys::{CanvasRenderingContext2d, HtmlCanvasElement, ImageData};

pub struct CanvasSurface {
    ctx: CanvasRenderingContext2d,
}

impl CanvasSurface {
    pub fn new(canvas: &HtmlCanvasElement) -> Result<Self, wasm_bindgen::JsValue> {
        let ctx = canvas
            .get_context("2d")?
            .ok_or_else(|| wasm_bindgen::JsValue::from_str("no 2d context"))?
            .dyn_into::<CanvasRenderingContext2d>()?;
        Ok(Self { ctx })
    }
}

use wasm_bindgen::JsCast;

impl Surface for CanvasSurface {
    fn present(&mut self, fb: &Framebuffer) {
        let data = Clamped(fb.pixels.as_slice());
        if let Ok(image) =
            ImageData::new_with_u8_clamped_array_and_sh(data, fb.width as u32, fb.height as u32)
        {
            let _ = self.ctx.put_image_data(&image, 0.0, 0.0);
        }
    }

    fn resize(&mut self, _width: u32, _height: u32) {
        // CSS handles scaling; the backing canvas stays at the internal
        // resolution, so there is nothing to do here.
    }
}
