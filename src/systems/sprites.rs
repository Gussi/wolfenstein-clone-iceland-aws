//! Billboard sprite rendering with depth sort and per-column z-buffer
//! occlusion (US-10).

use crate::boundary::{SpriteId, TextureSet};
use crate::math::Vec2;
use crate::systems::raycaster::Framebuffer;
use crate::world::World;

struct Visible {
    pos: Vec2,
    dist2: f32,
    sprite: SpriteId,
}

/// Draw all entities (enemies, pickups, decorations) back-to-front, respecting
/// the wall z-buffer produced by the raycaster.
pub fn render_sprites(world: &World, textures: &TextureSet, fb: &mut Framebuffer, zbuffer: &[f32]) {
    let player = &world.player;

    // Gather visible entities.
    let mut items: Vec<Visible> = Vec::new();
    for e in &world.enemies {
        items.push(Visible {
            pos: e.pos,
            dist2: (e.pos - player.pos).length_squared(),
            sprite: SpriteId::for_enemy(e.state),
        });
    }
    for p in &world.pickups {
        items.push(Visible {
            pos: p.pos,
            dist2: (p.pos - player.pos).length_squared(),
            sprite: SpriteId::for_pickup(p.kind),
        });
    }
    for d in &world.decorations {
        items.push(Visible {
            pos: d.pos,
            dist2: (d.pos - player.pos).length_squared(),
            sprite: SpriteId::for_decoration(d.kind),
        });
    }

    // Painter's algorithm: far to near.
    items.sort_by(|a, b| {
        b.dist2
            .partial_cmp(&a.dist2)
            .unwrap_or(std::cmp::Ordering::Equal)
    });

    let w = fb.width as f32;
    let h = fb.height as f32;
    let inv_det = 1.0 / (player.plane.x * player.dir.y - player.dir.x * player.plane.y);

    for item in &items {
        let rel = item.pos - player.pos;
        let transform_x = inv_det * (player.dir.y * rel.x - player.dir.x * rel.y);
        let transform_y = inv_det * (-player.plane.y * rel.x + player.plane.x * rel.y);
        if transform_y <= 0.0 {
            continue; // behind the camera
        }

        let screen_x = (w / 2.0) * (1.0 + transform_x / transform_y);
        let sprite_h = (h / transform_y).abs();
        let sprite_w = sprite_h; // square sprites

        let draw_start_y = (-sprite_h / 2.0 + h / 2.0).max(0.0) as i32;
        let draw_end_y = (sprite_h / 2.0 + h / 2.0).min(h - 1.0) as i32;
        let left = (screen_x - sprite_w / 2.0) as i32;
        let right = (screen_x + sprite_w / 2.0) as i32;

        let img = textures.sprite(item.sprite);

        for x in left..=right {
            if x < 0 || x as usize >= fb.width {
                continue;
            }
            // Occlusion: skip columns hidden behind nearer walls.
            if transform_y >= zbuffer[x as usize] {
                continue;
            }
            let u = (x - left) as f32 / sprite_w.max(1.0);
            for y in draw_start_y..=draw_end_y {
                let v = (y as f32 - (h / 2.0 - sprite_h / 2.0)) / sprite_h.max(1.0);
                let c = img.sample(u, v);
                fb.blend(x as usize, y as usize, c);
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::constants::ENEMY_HEALTH;
    use crate::domain::{Enemy, EnemyKind, EntityId};

    #[test]
    fn renders_without_panicking() {
        let level = r#"{
            "name": "Box", "width": 5, "height": 5,
            "grid": [[1,1,1,1,1],[1,0,0,0,1],[1,0,0,0,1],[1,0,0,0,1],[1,1,1,1,1]],
            "playerSpawn": { "x": 2, "y": 2, "angle": 0.0 }
        }"#;
        let mut world = World::load(level).unwrap();
        world.enemies.push(Enemy::new(
            EntityId(1),
            EnemyKind::RedTape,
            crate::math::Vec2::new(3.0, 2.5),
            ENEMY_HEALTH,
        ));
        let textures = TextureSet::placeholder();
        let mut fb = Framebuffer::new(64, 40);
        let zb = vec![100.0; 64]; // walls very far → sprite visible
        render_sprites(&world, &textures, &mut fb, &zb);
    }
}
