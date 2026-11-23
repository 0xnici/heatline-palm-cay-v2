// The one mutable game state and the fixed-step simulation that ties the systems together:
// walking and driving, traffic, pedestrians, police, combat, pickups and mission progress.
import { WORLD, WALK_SPEED, PACKAGE_COUNT } from './config.js';
import { createCity, buildingAt } from './city.js';
import { createRandom } from './random.js';
import {
  createVehicle, createTraffic, updateTraffic, updateVehicle, milesPerHour,
} from './driving.js';
import { createPedestrians, updatePedestrians, knockDown } from './pedestrians.js';
import { updatePolice, addWanted } from './police.js';
import { createMissionState, updateMissions, acceptJob, toggleTaxiFare } from './missions.js';
import { firePlayerWeapon, updateCombat } from './combat.js';

export const EVENT_BUSTED = 1;
export const EVENT_WASTED = 2;
export const EVENT_PICKUP = 4;
export const EVENT_ENTER = 8;
export const EVENT_EXIT = 16;
export const EVENT_JOB = 32;

/** Build a complete fresh world from a seed. No timers, no network, no Math.random. */
export function createWorld(seed = 1337) {
  const random = createRandom(seed);
  const city = createCity(random);
  const state = {
    seed, city, random, time: 0, screen: 'title', mode: 'foot',
    player: { x: 1160, y: 940, angle: -Math.PI / 2, health: 100, wanted: 0 },
    playerCar: null, cars: [], peds: [], policeCars: [], officers: [],
    bullets: [], effects: [], packagesTaken: [], mission: createMissionState(), fare: null,
    money: 260, wantedTimer: 0, arrest: 0, shotsHeard: 0, invulnerable: 0,
    fireCooldown: 0, damageFlash: 0, moving: false, message: null, busted: false, wasted: false,
    aim: { x: 1300, y: 850 }, camera: { x: 1160, y: 940 }, dustClock: 0,
    stats: { jobs: 0, fares: 0, packages: 0, wasted: 0, busted: 0 },
    pPlayerShot: false, pPickup: false, pUi: false, pCrash: false, pBusted: false,
  };
  state.cars.push(...createTraffic(city, random, 30));
  state.peds.push(...createPedestrians(city, random, 48));
  // Parked cars are the ones you steal at the start of a run, plus a cab at the job-2 stand.
  const parked = [
    [1200, 940, 'coupe', -Math.PI / 2], [1240, 1030, 'sedan', 0], [1000, 1020, 'truck', Math.PI / 2],
    [1600, 3110, 'taxi', 0], [1520, 3160, 'taxi', Math.PI], [3440, 3440, 'coupe', 0],
    [5200, 2320, 'sedan', -Math.PI / 2], [5600, 1860, 'taxi', Math.PI / 2],
  ];
  for (const [x, y, id, angle] of parked) {
    const car = createVehicle(id, x, y, angle, random, { ai: 'parked' });
    car.speed = 0;
    state.cars.push(car);
  }
  return state;
}

/** Keep the camera centred on the player, without showing past the edge of the world. */
export function updateCamera(state) {
  state.camera.x = Math.max(640, Math.min(WORLD.width - 640, state.player.x));
  state.camera.y = Math.max(360, Math.min(WORLD.height - 360, state.player.y));
}

function clampPlayer(state, x, y) {
  let nx = Math.max(24, Math.min(WORLD.width - 24, x));
  let ny = Math.max(24, Math.min(WORLD.height - 24, y));
  if (nx > WORLD.waterX + 10) {
    const onPier = WORLD.piers.some((py) => Math.abs(ny - py - 55) < 70);
    nx = onPier ? Math.min(WORLD.waterX + 290, nx) : WORLD.waterX + 10;
  }
  return { nx, ny };
}

function stepOnFoot(state, input, dt) {
  const dx = input.moveX();
  const dy = input.moveY();
  const length = Math.hypot(dx, dy);
  state.moving = length > 0;
  if (length > 0) {
    const speed = WALK_SPEED * (input.isDown('ShiftLeft') ? 1.45 : 1);
    const move = clampPlayer(state, state.player.x + (dx / length) * speed * dt, state.player.y + (dy / length) * speed * dt);
    if (!buildingAt(state.city, move.nx, move.ny, 2)) {
      state.player.x = move.nx;
      state.player.y = move.ny;
      state.player.angle = Math.atan2(dy, dx);
    }
  }
  if (input.firing()) firePlayerWeapon(state, state.random);
}

function stepInCar(state, input, dt) {
  const car = state.playerCar;
  if (!car) { state.mode = 'foot'; return; }
  updateVehicle(car, { throttle: -input.moveY(), steer: input.moveX(), handbrake: input.handbrake() }, dt, state.city);
  state.player.x = car.x;
  state.player.y = car.y;
  state.player.angle = car.angle;
  state.moving = Math.abs(car.speed) > 10;
  state.dustClock -= dt;
  if (state.dustClock <= 0 && Math.abs(car.speed) > 230) {
    state.dustClock = 0.09;
    state.effects.push({
      x: car.x - Math.cos(car.angle) * 20, y: car.y - Math.sin(car.angle) * 20,
      r: 8, life: 0.5, max: 0.5, color: '#d9c8a3', type: 'dust',
    });
  }
  for (const ped of state.peds) {
    if (ped.down > 0 || Math.abs(car.speed) < 85) continue;
    if (Math.hypot(ped.x - car.x, ped.y - car.y) < 28) {
      knockDown(ped, 16);
      addWanted(state, 1);
      state.pCrash = true;
      state.message = { text: 'HIT AND RUN · WANTED', ttl: 2 };
    }
  }
}

/** Advance the whole simulation one 1/60s step. Returns events for boot to react to. */
export function stepWorld(state, input, dt) {
  state.time += dt;
  let events = 0;
  if (state.mode === 'foot') stepOnFoot(state, input, dt);
  else stepInCar(state, input, dt);
  updateTraffic(state.cars, dt, state.city, state.random);
  updatePedestrians(state.peds, dt, state.city, state.random, state);
  updatePolice(state, dt, state.city, state.random);
  updateCombat(state, dt, state.city, state.random);
  updateMissions(state, dt);

  if (state.mode === 'foot') {
    for (const pkg of state.city.packages) {
      if (pkg.taken || state.packagesTaken.includes(pkg.id)) continue;
      if (Math.hypot(pkg.x - state.player.x, pkg.y - state.player.y) < 36) {
        pkg.taken = true;
        state.packagesTaken.push(pkg.id);
        state.money += 75;
        state.stats.packages += 1;
        state.pPickup = true;
        state.message = { text: `PACKAGE ${state.packagesTaken.length}/${PACKAGE_COUNT}  +$75`, ttl: 2.4 };
        events |= EVENT_PICKUP;
      }
    }
  }
  if (state.busted) {
    state.busted = false;
    state.stats.busted += 1;
    state.pBusted = true;
    events |= EVENT_BUSTED;
  }
  if (state.wasted) {
    state.wasted = false;
    state.stats.wasted += 1;
    events |= EVENT_WASTED;
  }
  updateCamera(state);
  return events;
}

/** E: leave the car, take a job, or steal the nearest vehicle. */
export function interact(state) {
  if (state.mode === 'car') {
    const car = state.playerCar;
    state.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 46;
    state.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 46;
    state.player.angle = car.angle;
    car.ai = 'parked';
    car.speed = 0;
    state.playerCar = null;
    state.mode = 'foot';
    return EVENT_EXIT;
  }
  if (acceptJob(state)) {
    state.pUi = true;
    return EVENT_JOB;
  }
  let nearest = null;
  let best = 82;
  for (const car of state.cars) {
    const distance = Math.hypot(car.x - state.player.x, car.y - state.player.y);
    if (distance < best) { best = distance; nearest = car; }
  }
  if (nearest) {
    nearest.ai = null;
    nearest.occupant = 'player';
    state.playerCar = nearest;
    state.mode = 'car';
    state.player.x = nearest.x;
    state.player.y = nearest.y;
    addWanted(state, 1);
    state.message = { text: `${nearest.name.toUpperCase()} · HOTWIRED`, ttl: 2.2 };
    state.pUi = true;
    return EVENT_ENTER;
  }
  return 0;
}

export function fareAction(state) {
  const result = toggleTaxiFare(state, state.random);
  if (result) state.pUi = true;
  return result;
}

/** Busted or wasted: lose time or cash, then put the player back near the starting block. */
export function respawn(state, kind) {
  if (kind === 'busted') state.money = Math.max(0, state.money - 220);
  state.mode = 'foot';
  state.playerCar = null;
  state.player.x = 1160;
  state.player.y = 1000;
  state.player.health = 100;
  state.player.wanted = 0;
  state.wantedTimer = 0;
  state.arrest = 0;
  state.policeCars.length = 0;
  state.officers.length = 0;
  state.bullets.length = 0;
  state.invulnerable = 2;
  updateCamera(state);
  state.message = { text: kind === 'busted' ? 'BOOKED AND RELEASED' : 'BACK ON YOUR FEET', ttl: 3 };
}

/** Save just the progression, not the traffic. Everything else is regenerated from the seed. */
export function saveProgress(state, storage) {
  if (!storage) return;
  try {
    storage.setItem('heatline.save', JSON.stringify({
      money: state.money, jobs: state.mission.index, done: state.mission.done,
      packages: state.packagesTaken, stats: state.stats,
    }));
  } catch { /* storage can be disabled; the game still plays */ }
}

export function loadProgress(state, storage) {
  if (!storage) return;
  try {
    const raw = storage.getItem('heatline.save');
    if (!raw) return;
    const save = JSON.parse(raw);
    state.money = Number.isFinite(save.money) ? save.money : state.money;
    state.mission.index = Number.isFinite(save.jobs) ? Math.min(save.jobs, 5) : 0;
    state.mission.done = Boolean(save.done);
    state.packagesTaken = Array.isArray(save.packages) ? save.packages : [];
    for (const id of state.packagesTaken) if (state.city.packages[id]) state.city.packages[id].taken = true;
    if (save.stats) state.stats = { ...state.stats, ...save.stats };
  } catch { /* a corrupt save is simply ignored */ }
}

export { milesPerHour, addWanted };
