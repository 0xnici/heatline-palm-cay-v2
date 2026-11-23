// Keyboard and mouse. Movement is polled, one-shot keys are queued as actions, and the mouse
// position is converted into the same logical 1280x720 space the renderer uses.
export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_MUTE = 4;
export const ACTION_ENTER = 8;
export const ACTION_FARE = 16;
export const ACTION_RESPAWN = 32;

const CONTROL_KEYS = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight',
  'Space', 'KeyE', 'KeyF', 'KeyP', 'KeyM', 'KeyR', 'Enter', 'Escape', 'ShiftLeft',
]);

export function createInput(canvas) {
  const down = new Set();
  const pressed = new Set();
  const mouse = { x: 640, y: 360, down: false };
  let clicked = false;

  window.addEventListener('keydown', (event) => {
    if (CONTROL_KEYS.has(event.code)) event.preventDefault();
    down.add(event.code);
    if (!event.repeat) pressed.add(event.code);
  });
  window.addEventListener('keyup', (event) => down.delete(event.code));
  window.addEventListener('blur', () => { down.clear(); mouse.down = false; });
  canvas.addEventListener('mousemove', (event) => {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    mouse.x = (event.clientX - rect.left - (rect.width - 1280 * scale) / 2) / scale;
    mouse.y = (event.clientY - rect.top - (rect.height - 720 * scale) / 2) / scale;
  });
  canvas.addEventListener('mousedown', (event) => {
    if (event.button === 0) { mouse.down = true; clicked = true; }
  });
  window.addEventListener('mouseup', () => { mouse.down = false; });
  canvas.addEventListener('contextmenu', (event) => event.preventDefault());

  const axis = (negative, positive, altNegative, altPositive) =>
    (down.has(positive) || down.has(altPositive) ? 1 : 0) - (down.has(negative) || down.has(altNegative) ? 1 : 0);

  return {
    moveX: () => axis('KeyA', 'KeyD', 'ArrowLeft', 'ArrowRight'),
    moveY: () => axis('KeyW', 'KeyS', 'ArrowUp', 'ArrowDown'),
    handbrake: () => down.has('Space'),
    isDown: (code) => down.has(code),
    mouse,
    firing: () => mouse.down || clicked,
    takeActions() {
      let actions = 0;
      if (pressed.has('Enter') || clicked) actions |= ACTION_CONFIRM;
      if (pressed.has('KeyP') || pressed.has('Escape')) actions |= ACTION_PAUSE;
      if (pressed.has('KeyM')) actions |= ACTION_MUTE;
      if (pressed.has('KeyE')) actions |= ACTION_ENTER;
      if (pressed.has('KeyF')) actions |= ACTION_FARE;
      if (pressed.has('KeyR')) actions |= ACTION_RESPAWN;
      pressed.clear();
      clicked = false;
      return actions;
    },
    clearClicks() { clicked = false; },
  };
}
