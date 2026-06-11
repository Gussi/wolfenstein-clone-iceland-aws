//! Pots & Parliament — an Icelandic-flavoured Wolfenstein 3D-style raycaster.
//!
//! Architecture (see `aidlc-docs/inception/application-design/`):
//! - A single owning [`world::World`] holds all mutable game state.
//! - Pure *systems* (in [`systems`]) are free functions that borrow from the world.
//!   They have no browser dependencies and are unit/property tested on the host.
//! - Browser side-effects live behind traits in [`boundary`]; their `web-sys`
//!   implementations are in `platform` and only compiled for `wasm32`.
//! - [`app::App`] is the orchestrator that runs one frame per `requestAnimationFrame`.

#![forbid(unsafe_code)]

pub mod app;
pub mod boundary;
pub mod constants;
pub mod domain;
pub mod math;
pub mod systems;
pub mod world;

// Browser-only code. Gated so the host test target compiles only the pure core.
#[cfg(target_arch = "wasm32")]
mod platform;

#[cfg(target_arch = "wasm32")]
mod entry;
