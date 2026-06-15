//! Native desktop entry point using minifb for windowing/input.
#![cfg(not(target_arch = "wasm32"))]

use minifb::{Key, MouseButton, MouseMode, Window, WindowOptions};
use pots_and_parliament::app::App;
use pots_and_parliament::boundary::{
    AudioSink, InputSource, InputState, Sound, Surface, TextureImage, TextureSet,
};
use pots_and_parliament::constants::{SCREEN_HEIGHT, SCREEN_WIDTH};
use pots_and_parliament::systems::raycaster::Framebuffer;
use pots_and_parliament::world::World;
use std::cell::RefCell;
use std::rc::Rc;
use std::time::Instant;

// =========================================================================
// Shared buffer for window blitting
// =========================================================================

type SharedBuf = Rc<RefCell<Vec<u32>>>;

// =========================================================================
// Native Surface
// =========================================================================

struct NativeSurface {
    buffer: SharedBuf,
}

impl Surface for NativeSurface {
    fn present(&mut self, fb: &Framebuffer) {
        let mut buf = self.buffer.borrow_mut();
        for (i, px) in fb.pixels.chunks_exact(4).enumerate() {
            buf[i] = ((px[0] as u32) << 16) | ((px[1] as u32) << 8) | (px[2] as u32);
        }
    }
    fn resize(&mut self, _width: u32, _height: u32) {}
    fn draw_text(&mut self, text: &str, x: f64, y: f64, size: f64, color: &str) {
        let mut buf = self.buffer.borrow_mut();
        let scale = (size / 7.0).max(1.0) as usize;
        let col = parse_color(color);
        // Center-align: estimate text width.
        let text_w = text.chars().count() * 6 * scale;
        let start_x = (x as i32) - (text_w as i32 / 2);
        let start_y = (y as i32) - (4 * scale as i32);
        for (ci, ch) in text.chars().enumerate() {
            let glyph = get_glyph(ch);
            let cx = start_x + (ci * 6 * scale) as i32;
            for row in 0..7 {
                for col_bit in 0..5 {
                    if glyph[row] & (1 << (4 - col_bit)) != 0 {
                        for sy in 0..scale {
                            for sx in 0..scale {
                                let px = cx + (col_bit * scale + sx) as i32;
                                let py = start_y + (row * scale + sy) as i32;
                                if px >= 0 && py >= 0
                                    && (px as usize) < SCREEN_WIDTH
                                    && (py as usize) < SCREEN_HEIGHT
                                {
                                    buf[py as usize * SCREEN_WIDTH + px as usize] = col;
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

fn parse_color(s: &str) -> u32 {
    let s = s.trim_start_matches('#');
    u32::from_str_radix(s, 16).unwrap_or(0xFFFFFF)
}

fn get_glyph(ch: char) -> [u8; 7] {
    match ch {
        'A' | 'a' => [0b01110, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
        'Á' | 'á' => [0b00010, 0b01110, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
        'B' | 'b' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10001, 0b10001, 0b11110],
        'C' | 'c' => [0b01110, 0b10001, 0b10000, 0b10000, 0b10000, 0b10001, 0b01110],
        'D' | 'd' => [0b11110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11110],
        'Ð' | 'ð' => [0b11110, 0b10001, 0b10001, 0b11101, 0b10001, 0b10001, 0b11110],
        'E' | 'e' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
        'É' | 'é' => [0b00010, 0b11111, 0b10000, 0b11110, 0b10000, 0b10000, 0b11111],
        'F' | 'f' => [0b11111, 0b10000, 0b10000, 0b11110, 0b10000, 0b10000, 0b10000],
        'G' | 'g' => [0b01110, 0b10001, 0b10000, 0b10111, 0b10001, 0b10001, 0b01110],
        'H' | 'h' => [0b10001, 0b10001, 0b10001, 0b11111, 0b10001, 0b10001, 0b10001],
        'I' | 'i' => [0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        'Í' | 'í' => [0b00010, 0b01110, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        'J' | 'j' => [0b00111, 0b00010, 0b00010, 0b00010, 0b00010, 0b10010, 0b01100],
        'K' | 'k' => [0b10001, 0b10010, 0b10100, 0b11000, 0b10100, 0b10010, 0b10001],
        'L' | 'l' => [0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b10000, 0b11111],
        'M' | 'm' => [0b10001, 0b11011, 0b10101, 0b10101, 0b10001, 0b10001, 0b10001],
        'N' | 'n' => [0b10001, 0b11001, 0b10101, 0b10011, 0b10001, 0b10001, 0b10001],
        'O' | 'o' => [0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'Ó' | 'ó' => [0b00010, 0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'Ö' | 'ö' => [0b01010, 0b01110, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'P' | 'p' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000, 0b10000],
        'Q' | 'q' => [0b01110, 0b10001, 0b10001, 0b10001, 0b10101, 0b10010, 0b01101],
        'R' | 'r' => [0b11110, 0b10001, 0b10001, 0b11110, 0b10100, 0b10010, 0b10001],
        'S' | 's' => [0b01110, 0b10001, 0b10000, 0b01110, 0b00001, 0b10001, 0b01110],
        'T' | 't' => [0b11111, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00100],
        'U' | 'u' => [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'Ú' | 'ú' => [0b00010, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01110],
        'V' | 'v' => [0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b01010, 0b00100],
        'W' | 'w' => [0b10001, 0b10001, 0b10001, 0b10101, 0b10101, 0b11011, 0b10001],
        'X' | 'x' => [0b10001, 0b10001, 0b01010, 0b00100, 0b01010, 0b10001, 0b10001],
        'Y' | 'y' => [0b10001, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
        'Ý' | 'ý' => [0b00010, 0b10001, 0b01010, 0b00100, 0b00100, 0b00100, 0b00100],
        'Z' | 'z' => [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b10000, 0b11111],
        'Þ' | 'þ' => [0b10000, 0b11110, 0b10001, 0b10001, 0b11110, 0b10000, 0b10000],
        'Æ' | 'æ' => [0b01111, 0b10100, 0b10100, 0b11111, 0b10100, 0b10100, 0b10111],
        '0' => [0b01110, 0b10001, 0b10011, 0b10101, 0b11001, 0b10001, 0b01110],
        '1' => [0b00100, 0b01100, 0b00100, 0b00100, 0b00100, 0b00100, 0b01110],
        '2' => [0b01110, 0b10001, 0b00001, 0b00110, 0b01000, 0b10000, 0b11111],
        '3' => [0b01110, 0b10001, 0b00001, 0b00110, 0b00001, 0b10001, 0b01110],
        '4' => [0b00010, 0b00110, 0b01010, 0b10010, 0b11111, 0b00010, 0b00010],
        '5' => [0b11111, 0b10000, 0b11110, 0b00001, 0b00001, 0b10001, 0b01110],
        '6' => [0b01110, 0b10000, 0b10000, 0b11110, 0b10001, 0b10001, 0b01110],
        '7' => [0b11111, 0b00001, 0b00010, 0b00100, 0b01000, 0b01000, 0b01000],
        '8' => [0b01110, 0b10001, 0b10001, 0b01110, 0b10001, 0b10001, 0b01110],
        '9' => [0b01110, 0b10001, 0b10001, 0b01111, 0b00001, 0b00001, 0b01110],
        ':' => [0b00000, 0b00100, 0b00100, 0b00000, 0b00100, 0b00100, 0b00000],
        '/' => [0b00001, 0b00010, 0b00010, 0b00100, 0b01000, 0b01000, 0b10000],
        '.' => [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b00100],
        '!' => [0b00100, 0b00100, 0b00100, 0b00100, 0b00100, 0b00000, 0b00100],
        '?' => [0b01110, 0b10001, 0b00001, 0b00110, 0b00100, 0b00000, 0b00100],
        ' ' => [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00000],
        '-' => [0b00000, 0b00000, 0b00000, 0b11111, 0b00000, 0b00000, 0b00000],
        ',' => [0b00000, 0b00000, 0b00000, 0b00000, 0b00000, 0b00100, 0b01000],
        _   => [0b11111, 0b10001, 0b10001, 0b10001, 0b10001, 0b10001, 0b11111],
    }
}

// =========================================================================
// Native Input (shared state updated from window each frame)
// =========================================================================

struct NativeInput {
    state: Rc<RefCell<InputState>>,
}

impl InputSource for NativeInput {
    fn poll(&mut self) -> InputState {
        let mut s = self.state.borrow_mut();
        let snapshot = *s;
        // Clear edge-triggered flags after reading.
        s.interact = false;
        s.attack = false;
        s.pause_toggle = false;
        s.dismiss = false;
        snapshot
    }
    fn pointer_locked(&self) -> bool {
        true
    }
}

// =========================================================================
// Null Audio
// =========================================================================

struct NullAudio;

impl AudioSink for NullAudio {
    fn play(&self, _sound: Sound) {}
    fn play_music(&self, _looping: bool) {}
    fn stop_music(&self) {}
    fn set_volume(&self, _volume: f32) {}
    fn set_muted(&self, _muted: bool) {}
}

// =========================================================================
// Texture loading (reuses png crate)
// =========================================================================

fn decode_png_image(data: &[u8]) -> Option<TextureImage> {
    let decoder = png::Decoder::new(data);
    let mut reader = decoder.read_info().ok()?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).ok()?;
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
        _ => return None,
    };
    let (w, h) = (info.width as usize, info.height as usize);
    let size = w.max(h);
    let mut pixels = vec![0u8; size * size * 4];
    let off_x = (size - w) / 2;
    let off_y = (size - h) / 2;
    for y in 0..h {
        let src = y * w * 4;
        let dst = ((off_y + y) * size + off_x) * 4;
        pixels[dst..dst + w * 4].copy_from_slice(&rgba[src..src + w * 4]);
    }
    Some(TextureImage::new(size, pixels))
}

fn decode_sheet(data: &[u8], tile_size: usize) -> Option<Vec<TextureImage>> {
    let decoder = png::Decoder::new(data);
    let mut reader = decoder.read_info().ok()?;
    let mut buf = vec![0u8; reader.output_buffer_size()];
    let info = reader.next_frame(&mut buf).ok()?;
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
        _ => return None,
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
    Some(tiles)
}

fn load_textures() -> TextureSet {
    let load = |path: &str| std::fs::read(path).ok();

    let mut walls = match load("assets/textures/walls-sprite-64x64.png")
        .and_then(|d| decode_sheet(&d, 64))
    {
        Some(w) => w,
        None => return TextureSet::placeholder(),
    };

    if let Some(door) = load("assets/textures/doors-sprite-64x64.png")
        .and_then(|d| decode_sheet(&d, 64))
        .and_then(|mut v| if v.is_empty() { None } else { Some(v.remove(0)) })
    {
        if walls.len() > 3 {
            walls[3] = door;
        }
    }

    let mut hud = TextureSet::placeholder_hud_vec();
    if let Some(faces) = load("assets/textures/face-sprite-32x32.png")
        .and_then(|d| decode_sheet(&d, 32))
    {
        for (i, face) in faces.into_iter().take(4).enumerate() {
            hud[i] = face;
        }
    }
    if let Some(pan) = load("assets/textures/pan.png").and_then(|d| decode_png_image(&d)) {
        for i in 4..8 {
            hud[i] = pan.clone();
        }
    }

    TextureSet::new(walls, TextureSet::placeholder_sprites_vec(), hud)
}

// =========================================================================
// Main
// =========================================================================

fn main() {
    let level_json = std::fs::read_to_string("assets/maps/level1.json")
        .expect("Failed to load assets/maps/level1.json");
    let world = World::load(&level_json).expect("Failed to parse level");

    let textures = load_textures();
    let intro_image = std::fs::read("assets/textures/haarde.png")
        .ok()
        .and_then(|d| decode_png_image(&d));

    let buffer: SharedBuf = Rc::new(RefCell::new(vec![0u32; SCREEN_WIDTH * SCREEN_HEIGHT]));
    let input_state = Rc::new(RefCell::new(InputState::default()));

    let surface = NativeSurface {
        buffer: buffer.clone(),
    };
    let input = NativeInput {
        state: input_state.clone(),
    };

    let mut app = App::new(world, surface, NullAudio, input, textures, intro_image);

    let mut window = Window::new(
        "Pots & Parliament",
        SCREEN_WIDTH,
        SCREEN_HEIGHT,
        WindowOptions {
            scale: minifb::Scale::X2,
            ..WindowOptions::default()
        },
    )
    .expect("Failed to create window");

    window.set_target_fps(60);
    window.set_cursor_visibility(false);
    let start = Instant::now();
    let mut prev_mouse_x: Option<f32> = None;

    while window.is_open() && !window.is_key_down(Key::Q) {
        // Build input state from window.
        let mut s = InputState::default();
        s.move_forward = window.is_key_down(Key::W);
        s.move_backward = window.is_key_down(Key::S);
        s.strafe_left = window.is_key_down(Key::A);
        s.strafe_right = window.is_key_down(Key::D);
        s.attack = window.get_mouse_down(MouseButton::Left);
        s.interact = window.is_key_pressed(Key::E, minifb::KeyRepeat::No)
            || window.is_key_pressed(Key::Space, minifb::KeyRepeat::No);
        s.pause_toggle = window.is_key_pressed(Key::Escape, minifb::KeyRepeat::No);
        s.dismiss = !window.get_keys_pressed(minifb::KeyRepeat::No).is_empty();

        // Mouse look (delta from previous frame).
        if let Some((mx, _)) = window.get_mouse_pos(MouseMode::Pass) {
            if let Some(prev) = prev_mouse_x {
                s.turn_delta = (mx - prev) * 0.003;
            }
            prev_mouse_x = Some(mx);
        }
        // Arrow keys as reliable turning fallback.
        if window.is_key_down(Key::Left) {
            s.turn_delta -= 0.05;
        }
        if window.is_key_down(Key::Right) {
            s.turn_delta += 0.05;
        }

        *input_state.borrow_mut() = s;

        let now_ms = start.elapsed().as_secs_f64() * 1000.0;
        app.tick(now_ms);

        window
            .update_with_buffer(&buffer.borrow(), SCREEN_WIDTH, SCREEN_HEIGHT)
            .unwrap();
    }
}
