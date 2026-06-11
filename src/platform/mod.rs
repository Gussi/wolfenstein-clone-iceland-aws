//! Browser implementations of the boundary traits (web-sys). Compiled only for
//! `wasm32`; the pure core never depends on this module.

pub mod assets;
pub mod audio;
pub mod input;
pub mod surface;

pub use assets::BrowserAssets;
pub use audio::WebAudio;
pub use input::BrowserInput;
pub use surface::CanvasSurface;
