//! DDA raycaster: draws textured wall columns into a [`Framebuffer`] and fills
//! a per-column z-buffer for sprite occlusion (US-09, US-25).

use crate::boundary::TextureSet;
use crate::constants::WALL_SHADE_FACTOR;
use crate::domain::Player;
use crate::domain::map::{Map, TileKind, WallTexture};

/// An RGBA pixel buffer the renderer writes into; the platform presents it.
pub struct Framebuffer {
    pub width: usize,
    pub height: usize,
    pub pixels: Vec<u8>, // RGBA, width * height * 4
}

impl Framebuffer {
    pub fn new(width: usize, height: usize) -> Self {
        Self {
            width,
            height,
            pixels: vec![0; width * height * 4],
        }
    }

    pub fn clear(&mut self, color: [u8; 4]) {
        for px in self.pixels.chunks_exact_mut(4) {
            px.copy_from_slice(&color);
        }
    }

    #[inline]
    pub fn set(&mut self, x: usize, y: usize, c: [u8; 4]) {
        if x >= self.width || y >= self.height {
            return;
        }
        let i = (y * self.width + x) * 4;
        self.pixels[i..i + 4].copy_from_slice(&c);
    }

    /// Alpha-aware blend (used by sprites/HUD); src alpha 0 = skip.
    #[inline]
    pub fn blend(&mut self, x: usize, y: usize, c: [u8; 4]) {
        if c[3] == 0 || x >= self.width || y >= self.height {
            return;
        }
        self.set(x, y, [c[0], c[1], c[2], 255]);
    }
}

fn shade(c: [u8; 4], factor: f32) -> [u8; 4] {
    [
        (c[0] as f32 * factor) as u8,
        (c[1] as f32 * factor) as u8,
        (c[2] as f32 * factor) as u8,
        c[3],
    ]
}

fn wall_texture_at(map: &Map, x: i32, y: i32) -> Option<WallTexture> {
    if x < 0 || y < 0 || x as usize >= map.width || y as usize >= map.height {
        return None;
    }
    match map.tile(x as usize, y as usize).kind {
        TileKind::Wall(t) => Some(t),
        TileKind::Door(id) => Some(map.doors[id.0].texture),
        TileKind::PushWall(id) => Some(map.push_walls[id.0].texture),
        TileKind::Empty => None,
    }
}

/// Cast one ray per screen column, drawing ceiling, textured wall strip, and
/// floor, and recording perpendicular distance into `zbuffer`.
pub fn cast_walls(
    player: &Player,
    map: &Map,
    textures: &TextureSet,
    fb: &mut Framebuffer,
    zbuffer: &mut [f32],
) {
    let w = fb.width;
    let h = fb.height as i32;
    let half_h = h / 2;
    let ceiling = [60, 58, 55, 255];
    let floor = [34, 30, 28, 255];

    // `x` is a screen column index used for camera math, framebuffer writes,
    // and the z-buffer — an index loop is the clearest expression here.
    #[allow(clippy::needless_range_loop)]
    for x in 0..w {
        let camera_x = 2.0 * x as f32 / w as f32 - 1.0;
        let ray_x = player.dir.x + player.plane.x * camera_x;
        let ray_y = player.dir.y + player.plane.y * camera_x;

        let mut map_x = player.pos.x.floor() as i32;
        let mut map_y = player.pos.y.floor() as i32;

        let delta_x = if ray_x.abs() < 1e-6 {
            1e30
        } else {
            (1.0 / ray_x).abs()
        };
        let delta_y = if ray_y.abs() < 1e-6 {
            1e30
        } else {
            (1.0 / ray_y).abs()
        };

        let (step_x, mut side_dist_x) = if ray_x < 0.0 {
            (-1, (player.pos.x - map_x as f32) * delta_x)
        } else {
            (1, (map_x as f32 + 1.0 - player.pos.x) * delta_x)
        };
        let (step_y, mut side_dist_y) = if ray_y < 0.0 {
            (-1, (player.pos.y - map_y as f32) * delta_y)
        } else {
            (1, (map_y as f32 + 1.0 - player.pos.y) * delta_y)
        };

        let mut side = 0; // 0 = x-side (N/S wall), 1 = y-side (E/W wall)
        let mut hit = false;
        let max_iter = (map.width + map.height) * 2;
        for _ in 0..max_iter {
            if side_dist_x < side_dist_y {
                side_dist_x += delta_x;
                map_x += step_x;
                side = 0;
            } else {
                side_dist_y += delta_y;
                map_y += step_y;
                side = 1;
            }
            if map.is_solid(map_x, map_y) {
                hit = true;
                break;
            }
        }

        let perp = if side == 0 {
            side_dist_x - delta_x
        } else {
            side_dist_y - delta_y
        }
        .max(1e-4);
        zbuffer[x] = perp;

        let line_h = (h as f32 / perp) as i32;
        let draw_start = (-line_h / 2 + half_h).max(0);
        let draw_end = (line_h / 2 + half_h).min(h - 1);

        // Ceiling.
        for y in 0..draw_start {
            fb.set(x, y as usize, ceiling);
        }
        // Wall strip.
        let tex = if hit {
            wall_texture_at(map, map_x, map_y)
        } else {
            None
        };
        if let Some(tex) = tex {
            let img = textures.wall(tex);
            let wall_pos = if side == 0 {
                player.pos.y + perp * ray_y
            } else {
                player.pos.x + perp * ray_x
            };
            let u = wall_pos - wall_pos.floor();
            for y in draw_start..=draw_end {
                let d = y - half_h + line_h / 2;
                let v = if line_h > 0 {
                    d as f32 / line_h as f32
                } else {
                    0.0
                };
                let mut c = img.sample(u, v);
                if side == 1 {
                    c = shade(c, WALL_SHADE_FACTOR);
                }
                fb.set(x, y as usize, c);
            }
        } else {
            for y in draw_start..=draw_end {
                fb.set(x, y as usize, [80, 80, 80, 255]);
            }
        }
        // Floor.
        for y in (draw_end + 1)..h {
            fb.set(x, y as usize, floor);
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::map::parse_map;
    use crate::math::Vec2;

    #[test]
    fn fills_zbuffer_without_panicking() {
        let level = r#"{
            "name": "Box", "width": 5, "height": 5,
            "grid": [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
            "playerSpawn": { "x": 2, "y": 2, "angle": 0.0 }
        }"#;
        let map = parse_map(level).unwrap();
        let player = Player::new(Vec2::new(2.5, 2.5), 0.0, 100);
        let textures = TextureSet::placeholder();
        let mut fb = Framebuffer::new(64, 40);
        let mut zb = vec![0.0; 64];
        cast_walls(&player, &map, &textures, &mut fb, &mut zb);
        assert!(zb.iter().all(|&d| d > 0.0));
    }
}
