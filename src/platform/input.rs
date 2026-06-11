//! Keyboard + mouse input via DOM event listeners, with Pointer Lock.
//!
//! Listeners write into a shared [`InputState`]; `poll` reads and resets the
//! per-frame and edge-triggered fields.

use crate::boundary::{InputSource, InputState};
use std::cell::RefCell;
use std::rc::Rc;
use wasm_bindgen::JsCast;
use wasm_bindgen::prelude::*;
use web_sys::{HtmlCanvasElement, KeyboardEvent, MouseEvent};

#[derive(Default)]
struct Shared {
    state: InputState,
    pointer_locked: bool,
}

pub struct BrowserInput {
    shared: Rc<RefCell<Shared>>,
}

impl BrowserInput {
    pub fn new(canvas: &HtmlCanvasElement) -> Result<Self, JsValue> {
        let shared = Rc::new(RefCell::new(Shared::default()));
        let window = web_sys::window().ok_or_else(|| JsValue::from_str("no window"))?;
        let document = window
            .document()
            .ok_or_else(|| JsValue::from_str("no document"))?;

        // keydown
        {
            let shared = shared.clone();
            let cb = Closure::<dyn FnMut(KeyboardEvent)>::new(move |e: KeyboardEvent| {
                let mut s = shared.borrow_mut();
                set_key(&mut s.state, &e.code(), true);
                s.state.dismiss = true; // any key dismisses intro / restarts
            });
            document.add_event_listener_with_callback("keydown", cb.as_ref().unchecked_ref())?;
            cb.forget();
        }
        // keyup
        {
            let shared = shared.clone();
            let cb = Closure::<dyn FnMut(KeyboardEvent)>::new(move |e: KeyboardEvent| {
                set_key(&mut shared.borrow_mut().state, &e.code(), false);
            });
            document.add_event_listener_with_callback("keyup", cb.as_ref().unchecked_ref())?;
            cb.forget();
        }
        // mousemove (accumulate horizontal movement while locked)
        {
            let shared = shared.clone();
            let cb = Closure::<dyn FnMut(MouseEvent)>::new(move |e: MouseEvent| {
                let mut s = shared.borrow_mut();
                if s.pointer_locked {
                    s.state.turn_delta += e.movement_x() as f32;
                }
            });
            document.add_event_listener_with_callback("mousemove", cb.as_ref().unchecked_ref())?;
            cb.forget();
        }
        // click: request pointer lock and register an attack
        {
            let shared = shared.clone();
            let canvas_clone = canvas.clone();
            let cb = Closure::<dyn FnMut(MouseEvent)>::new(move |_e: MouseEvent| {
                let mut s = shared.borrow_mut();
                if s.pointer_locked {
                    s.state.attack = true;
                } else {
                    canvas_clone.request_pointer_lock();
                }
            });
            canvas.add_event_listener_with_callback("click", cb.as_ref().unchecked_ref())?;
            cb.forget();
        }
        // pointerlockchange
        {
            let shared = shared.clone();
            let document_clone = document.clone();
            let cb = Closure::<dyn FnMut(web_sys::Event)>::new(move |_e: web_sys::Event| {
                let locked = document_clone.pointer_lock_element().is_some();
                shared.borrow_mut().pointer_locked = locked;
            });
            document.add_event_listener_with_callback(
                "pointerlockchange",
                cb.as_ref().unchecked_ref(),
            )?;
            cb.forget();
        }

        Ok(Self { shared })
    }
}

fn set_key(state: &mut InputState, code: &str, down: bool) {
    match code {
        "KeyW" | "ArrowUp" => state.move_forward = down,
        "KeyS" | "ArrowDown" => state.move_backward = down,
        "KeyA" => state.strafe_left = down,
        "KeyD" => state.strafe_right = down,
        "KeyE" | "Space" => {
            if down {
                state.interact = true;
            }
        }
        "Escape" => {
            if down {
                state.pause_toggle = true;
            }
        }
        _ => {}
    }
}

impl InputSource for BrowserInput {
    fn poll(&mut self) -> InputState {
        let mut s = self.shared.borrow_mut();
        let snapshot = s.state;
        // Clear per-frame and edge-triggered fields.
        s.state.turn_delta = 0.0;
        s.state.interact = false;
        s.state.attack = false;
        s.state.pause_toggle = false;
        s.state.dismiss = false;
        snapshot
    }

    fn pointer_locked(&self) -> bool {
        self.shared.borrow().pointer_locked
    }
}
