// Boot and the single frame loop. ?shot=<name>&seed=<n> poses a deterministic scene and paints
// it twice for the capture tool; otherwise the title screen, play, pause, busted and wasted
// screens run from keyboard and mouse. Progress is saved in localStorage every few seconds.
import { STEP, VIEW } from './config.js';
import {
  createWorld, stepWorld, interact, fareAction, respawn, saveProgress, loadProgress, updateCamera,
  EVENT_BUSTED, EVENT_WASTED,
} from './world.js';
import { createRenderer, SCREEN_PLAY, SCREEN_TITLE, SCREEN_PAUSED, SCREEN_WASTED, SCREEN_BUSTED } from './render.js';
import { createInput, ACTION_CONFIRM, ACTION_PAUSE, ACTION_MUTE, ACTION_ENTER, ACTION_FARE, ACTION_RESPAWN } from './input.js';
import { createAudio } from './audio.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : 20261123;
const canvas = document.getElementById('game');
const status = document.getElementById('status');
const renderer = createRenderer(canvas);
const audio = createAudio();

/** Pose a scene and signal the capture tool once it has actually been painted. */
function runShot() {
  const state = stageShot(shotName, seed);
  let painted = 0;
  function paint() {
    renderer.draw(state, SCREEN_PLAY);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const state = createWorld(seed);
  if (params.get('new') !== '1') loadProgress(state, window.localStorage);
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let accumulator = 0;
  let last = performance.now();
  let saveClock = 0;
  let announced = '';

  const playInput = {
    moveX: () => input.moveX(),
    moveY: () => input.moveY(),
    handbrake: () => input.handbrake(),
    isDown: (code) => input.isDown(code),
    firing: () => screen === SCREEN_PLAY && input.firing(),
  };
  const idleInput = {
    moveX: () => 0, moveY: () => 0, handbrake: () => false, isDown: () => false, firing: () => false,
  };

  function announce(message) {
    if (message === announced) return;
    announced = message;
    status.textContent = message;
  }

  function begin() {
    audio.resume();
    audio.pUi = true;
    screen = SCREEN_PLAY;
    announce('Playing. Reach the gold marker. E steals a car.');
  }

  function frame(now) {
    requestAnimationFrame(frame);
    const elapsed = Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    accumulator += elapsed;
    const actions = input.takeActions();

    if (actions & ACTION_MUTE) {
      const muted = audio.setMuted(!audio.isMuted());
      announce(muted ? 'Muted.' : 'Sound on.');
    }

    if (screen === SCREEN_TITLE) {
      state.time += elapsed;
      stepWorld(state, idleInput, STEP);
      if (actions & ACTION_CONFIRM) begin();
    } else if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) {
        screen = SCREEN_PLAY;
        announce('Playing.');
      }
    } else if (screen === SCREEN_WASTED || screen === SCREEN_BUSTED) {
      state.time += elapsed * 0.3;
      if (actions & ACTION_CONFIRM) {
        respawn(state, screen === SCREEN_BUSTED ? 'busted' : 'wasted');
        screen = SCREEN_PLAY;
        announce('Back on the street.');
      }
    } else {
      if (actions & ACTION_PAUSE) {
        screen = SCREEN_PAUSED;
        announce('Paused.');
      } else {
        if (actions & ACTION_ENTER) {
          const event = interact(state);
          if (event) announce('Interaction complete.');
          else announce('Nothing to interact with here.');
        }
        if (actions & ACTION_FARE) fareAction(state);
        if (actions & ACTION_RESPAWN) respawn(state, 'wasted');
        state.aim.x = input.mouse.x + state.camera.x - VIEW.width / 2;
        state.aim.y = input.mouse.y + state.camera.y - VIEW.height / 2;
        while (accumulator >= STEP && screen === SCREEN_PLAY) {
          const events = stepWorld(state, playInput, STEP);
          if (events & EVENT_BUSTED) {
            screen = SCREEN_BUSTED;
            announce('Busted. Press Enter to respawn.');
          } else if (events & EVENT_WASTED) {
            screen = SCREEN_WASTED;
            announce('Wasted. Press Enter to respawn.');
          }
          accumulator -= STEP;
        }
        saveClock += elapsed;
        if (saveClock > 8) {
          saveProgress(state, window.localStorage);
          saveClock = 0;
        }
        audio.update(state, elapsed);
      }
    }
    if (screen !== SCREEN_PLAY) accumulator = 0;
    updateCamera(state);
    renderer.draw(state, screen);
  }

  announce('HEATLINE Palm Cay. Press Enter to start.');
  requestAnimationFrame(frame);
}

if (shotName) runShot();
else runGame();
