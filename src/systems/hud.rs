//! HUD: bottom bar, health, connections, weapon, face portrait, and overlays
//! (US-13, US-14, US-15, US-16, US-22, US-24).
//!
//! The HUD draws graphical elements into the framebuffer. Glyph text (intro
//! line, stats numbers) is drawn by the platform `Surface` on top of the
//! presented buffer using the canvas text API; here, text overlays are
//! represented as banners and the platform fills in the words.

use crate::boundary::{HudId, TextureSet};
use crate::domain::FaceExpression;
use crate::systems::raycaster::Framebuffer;
use crate::world::LevelStats;

/// Immutable view of everything the HUD needs for one frame.
pub struct HudView {
    pub health: u32,
    pub max_health: u32,
    pub connections: u32,
    pub weapon_frame: u32,
    pub face: FaceExpression,
    pub overlay: Option<Overlay>,
}

pub enum Overlay {
    /// Free text (intro, game over). `text` is rendered by the platform.
    Text { text: String, remaining: f32 },
    /// One-time enemy taunt.
    Taunt { text: &'static str },
    /// End-of-level statistics.
    Stats(LevelStats),
}

fn fill_rect(fb: &mut Framebuffer, x0: i32, y0: i32, w: i32, h: i32, c: [u8; 4]) {
    for y in y0..(y0 + h) {
        for x in x0..(x0 + w) {
            if x >= 0 && y >= 0 {
                fb.blend(x as usize, y as usize, c);
            }
        }
    }
}

fn draw_sprite_scaled(
    fb: &mut Framebuffer,
    img_w: usize,
    c_lookup: impl Fn(f32, f32) -> [u8; 4],
    dst_x: i32,
    dst_y: i32,
    dst_w: i32,
    dst_h: i32,
) {
    let _ = img_w;
    for y in 0..dst_h {
        for x in 0..dst_w {
            let u = x as f32 / dst_w as f32;
            let v = y as f32 / dst_h as f32;
            let c = c_lookup(u, v);
            fb.blend((dst_x + x) as usize, (dst_y + y) as usize, c);
        }
    }
}

pub fn render_hud(view: &HudView, textures: &TextureSet, fb: &mut Framebuffer) {
    let w = fb.width as i32;
    let h = fb.height as i32;
    let bar_h = (h as f32 * 0.18) as i32;
    let bar_y = h - bar_h;

    // Bottom HUD bar background.
    fill_rect(fb, 0, bar_y, w, bar_h, [22, 20, 28, 255]);
    fill_rect(fb, 0, bar_y, w, 2, [70, 60, 90, 255]); // top edge highlight

    // --- Health bar (left) ---
    let pct = if view.max_health == 0 {
        0.0
    } else {
        view.health as f32 / view.max_health as f32
    };
    let hb_x = 12;
    let hb_y = bar_y + bar_h / 3;
    let hb_w = (w as f32 * 0.28) as i32;
    let hb_h = bar_h / 3;
    fill_rect(
        fb,
        hb_x - 2,
        hb_y - 2,
        hb_w + 4,
        hb_h + 4,
        [10, 10, 12, 255],
    );
    let fill_w = (hb_w as f32 * pct) as i32;
    let color = if pct >= 0.75 {
        [70, 200, 90, 255]
    } else if pct >= 0.40 {
        [220, 200, 70, 255]
    } else {
        [220, 70, 60, 255]
    };
    fill_rect(fb, hb_x, hb_y, fill_w, hb_h, color);

    // --- Connections bar (right) ---
    let cb_w = (w as f32 * 0.28) as i32;
    let cb_x = w - cb_w - 12;
    let cb_y = hb_y;
    fill_rect(
        fb,
        cb_x - 2,
        cb_y - 2,
        cb_w + 4,
        hb_h + 4,
        [10, 10, 12, 255],
    );
    let conn_fill = ((view.connections.min(500) as f32 / 500.0) * cb_w as f32) as i32;
    fill_rect(fb, cb_x, cb_y, conn_fill, hb_h, [80, 140, 230, 255]);

    // --- Face portrait (centre of bar) ---
    let face_img = textures.hud(HudId::face(view.face));
    let face_size = (bar_h as f32 * 0.85) as i32;
    let face_x = w / 2 - face_size / 2;
    let face_y = bar_y + (bar_h - face_size) / 2;
    let fi = face_img;
    draw_sprite_scaled(
        fb,
        fi.size,
        |u, v| fi.sample(u, v),
        face_x,
        face_y,
        face_size,
        face_size,
    );

    // --- Weapon (above the bar, centre) ---
    let spoon = textures.hud(HudId::spoon(view.weapon_frame));
    let spoon_size = (h as f32 * 0.45) as i32;
    let spoon_x = w / 2 - spoon_size / 2;
    let spoon_y = bar_y - spoon_size + bar_h / 4;
    draw_sprite_scaled(
        fb,
        spoon.size,
        |u, v| spoon.sample(u, v),
        spoon_x,
        spoon_y,
        spoon_size,
        spoon_size,
    );

    // --- Overlays ---
    match &view.overlay {
        Some(Overlay::Text { .. }) | Some(Overlay::Stats(_)) => {
            // Dim the play area and draw a banner; the platform draws the words.
            fill_rect(fb, 0, 0, w, bar_y, [0, 0, 0, 140]);
            let banner_h = h / 5;
            fill_rect(fb, 0, h / 2 - banner_h / 2, w, banner_h, [20, 18, 30, 220]);
        }
        Some(Overlay::Taunt { .. }) => {
            let banner_h = h / 12;
            fill_rect(fb, 0, h / 6, w, banner_h, [30, 10, 10, 180]);
        }
        None => {}
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn renders_without_panicking() {
        let textures = TextureSet::placeholder();
        let mut fb = Framebuffer::new(120, 80);
        let view = HudView {
            health: 60,
            max_health: 100,
            connections: 120,
            weapon_frame: 1,
            face: FaceExpression::Hurt,
            overlay: Some(Overlay::Text {
                text: "You just need to file one form...".into(),
                remaining: 2.0,
            }),
        };
        render_hud(&view, &textures, &mut fb);
    }
}
