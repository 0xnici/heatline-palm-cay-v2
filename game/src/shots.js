// Four staged scenes for the browser capture tool. Each one builds a fresh world from a fixed
// seed, places characters and vehicles exactly where the composition needs them, freezes time and
// returns a state the renderer can draw directly. They are real game code and real game objects,
// just posed; no pixels are edited after capture.
import { createWorld, updateCamera } from './world.js';
import { createVehicle } from './driving.js';
import { createMissionState, FIXERS } from './missions.js';

function addCar(state, id, x, y, angle, speed, extra = {}) {
  const car = createVehicle(id, x, y, angle, state.random, { ai: 'traffic', ...extra });
  car.speed = speed;
  state.cars.push(car);
  return car;
}

function drive(state, id, x, y, angle, speed, color) {
  const car = addCar(state, id, x, y, angle, speed, { ai: null, occupant: 'player', color });
  state.playerCar = car;
  state.mode = 'car';
  state.player.x = x;
  state.player.y = y;
  state.player.angle = angle;
  return car;
}

function addCivilians(state, spots) {
  for (const [x, y] of spots) {
    if (state.peds.length > 80) break;
    state.peds.push({
      kind: 'ped', x, y, angle: -Math.PI / 2, speed: 60, tx: x + 20, ty: y - 90,
      shirt: '#f0c35e', hat: false, phase: 0, panic: 0, down: 0,
    });
  }
}

/** Basic HUD story state shared by the driving scenes. */
function sceneState(seed, time, jobIndex) {
  const state = createWorld(seed);
  state.screen = 'play';
  state.time = time;
  state.mission = createMissionState();
  state.mission.index = jobIndex;
  state.mission.active = true;
  state.mission.stage = 'active';
  state.money = 1240 + jobIndex * 300;
  state.moving = true;
  return state;
}

/** Cover: red coupe at speed up the Coastal Avenue, three stars, interceptor closing. */
function cover(seed) {
  const state = sceneState(seed, 38.4, 0);
  drive(state, 'coupe', 5622, 1900, -Math.PI / 2, 548, '#d8433f');
  state.player.wanted = 3;
  state.wantedTimer = 19;
  state.mission.marker = { x: 5650, y: 1740, label: 'NORTH PIER', type: 'dropoff' };
  addCar(state, 'sedan', 5622, 1680, -Math.PI / 2, 210);
  addCar(state, 'taxi', 5622, 2070, -Math.PI / 2, 180);
  addCar(state, 'truck', 5280, 1900, 0, 240);
  const interceptor = addCar(state, 'cruiser', 5644, 2170, -Math.PI / 2, 590, { ai: 'police', occupant: 'police' });
  interceptor.siren = true;
  interceptor.sirenPhase = 1.4;
  state.policeCars.push(interceptor);
  addCivilians(state, [[5480, 1760], [5740, 1840], [5400, 2140], [5760, 2220], [5300, 1600]]);
  for (let i = 0; i < 9; i++) {
    state.effects.push({ x: 5612 + (i % 3) * 14, y: 1970 + i * 26, r: 7 + i, life: 0.4, max: 0.4, color: '#d9c8a3', type: 'dust' });
  }
  return state;
}

/** On foot in Old Palm: a fixer, a cab, a package and a full readable HUD. */
function onfoot(seed) {
  const state = createWorld(seed);
  state.screen = 'play';
  state.time = 21.7;
  state.money = 940;
  state.mission.index = 1;
  state.mission.marker = {
    x: FIXERS[1].x, y: FIXERS[1].y, label: 'DEX HALLOWAY · JOB', type: 'fixer',
  };
  state.mission.dialogue = {
    speaker: 'Dex Halloway',
    text: 'A cab, a suitcase and a woman who pays in cash. You in?',
  };
  state.player.x = 1440;
  state.player.y = 2980;
  state.player.angle = Math.PI / 2;
  state.camera.x = 1440;
  state.camera.y = 2980;
  addCar(state, 'taxi', 1600, 3110, 0, 0, { ai: 'parked' });
  addCar(state, 'sedan', 1440, 2840, -Math.PI / 2, 190);
  addCivilians(state, [[1500, 3060], [1390, 3120], [1600, 3040], [1320, 2900], [1520, 2880], [1680, 2960]]);
  state.message = { text: 'OLD PALM · JOB AVAILABLE', ttl: 4 };
  return state;
}

/** Five-star chase: cruisers from both directions, tracers, sirens and full speed. */
function chase(seed) {
  const state = sceneState(seed, 54.2, 3);
  drive(state, 'coupe', 5622, 2700, -Math.PI / 2, 612, '#d8433f');
  state.player.wanted = 5;
  state.wantedTimer = 26;
  state.mission.marker = { x: 5650, y: 2470, label: 'COOL THE ENGINE', type: 'objective' };
  state.money = 2340;
  state.damageFlash = 0.1;
  const spots = [
    [5644, 2900, -Math.PI / 2, 640], [5590, 2510, -Math.PI / 2, 620],
    [5680, 2810, -Math.PI / 2, 600], [5580, 3010, -Math.PI / 2, 580],
    [5700, 2400, -Math.PI / 2, 560],
  ];
  for (const [x, y, angle, speed] of spots) {
    const car = addCar(state, 'cruiser', x, y, angle, speed, { ai: 'police', occupant: 'police' });
    car.siren = true;
    car.sirenPhase = x % 2 ? 1.6 : 0.2;
    state.policeCars.push(car);
  }
  addCar(state, 'sedan', 5622, 2440, -Math.PI / 2, 260);
  addCar(state, 'truck', 5280, 2700, Math.PI / 2, 240);
  addCivilians(state, [[5450, 2580], [5740, 2620], [5320, 2860], [5760, 2940]]);
  for (let i = 0; i < 7; i++) {
    state.bullets.push({
      x: 5660 + i * 6, y: 2840 - i * 78, vx: -120, vy: -520,
      life: 0.7, from: 'police', damage: 9,
    });
  }
  for (let i = 0; i < 12; i++) {
    state.effects.push({ x: 5608 + (i % 3) * 18, y: 2770 + i * 24, r: 8 + i * 0.6, life: 0.5, max: 0.5, color: '#e8d4aa', type: 'dust' });
  }
  return state;
}

/** Mission five on the sand: dialogue, rival targets, a gunfight and two stars. */
function mission(seed) {
  const state = createWorld(seed);
  state.screen = 'play';
  state.time = 66.5;
  state.money = 3860;
  state.player.x = 5430;
  state.player.y = 2560;
  state.player.angle = -Math.PI / 2;
  state.player.wanted = 2;
  state.camera.x = 5430;
  state.camera.y = 2560;
  state.mission.index = 4;
  state.mission.active = true;
  state.mission.stage = 'active';
  state.mission.marker = { x: 5520, y: 2380, label: 'RIVAL CREW', type: 'target' };
  state.mission.dialogue = {
    speaker: 'Chief Anya Reyes',
    text: 'Three of them, down by the water. Make a problem stop.',
  };
  state.mission.targets = [
    { x: 5360, y: 2340, hp: 80, dead: false },
    { x: 5480, y: 2450, hp: 52, dead: false },
    { x: 5590, y: 2600, hp: 80, dead: true },
  ];
  addCar(state, 'coupe', 5520, 2620, 0, 0, { ai: 'parked' });
  addCar(state, 'taxi', 5660, 2760, -Math.PI / 2, 0, { ai: 'parked' });
  addCivilians(state, [[5200, 2680], [5320, 2780], [5680, 2480]]);
  for (const t of state.mission.targets) {
    if (!t.dead) state.peds.push({ kind: 'ped', x: t.x + 14, y: t.y + 16, angle: Math.PI, speed: 40, tx: t.x, ty: t.y, shirt: '#b4464b', hat: true, phase: 0, panic: 0, down: 0 });
  }
  state.bullets.push({ x: 5430, y: 2440, vx: 40, vy: -700, life: 0.7, from: 'player', damage: 34 });
  state.bullets.push({ x: 5460, y: 2360, vx: -80, vy: -660, life: 0.7, from: 'player', damage: 34 });
  state.effects.push({ x: 5446, y: 2420, r: 14, life: 0.1, max: 0.1, color: '#fff0a8', type: 'muzzle' });
  state.message = { text: 'TIDEWATER TAKEDOWN · 2 TARGETS LEFT', ttl: 5 };
  return state;
}

const SCENES = { cover, 'on-foot': onfoot, chase, mission };

/** Build the named scene, or the cover when the name is unknown. */
export function stageShot(name, seed) {
  const state = (SCENES[name] ?? cover)(seed >>> 0 || 20261123);
  updateCamera(state);
  return state;
}

export const SHOT_NAMES = Object.keys(SCENES);
