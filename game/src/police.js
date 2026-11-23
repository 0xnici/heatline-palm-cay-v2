// The five-star response: wanted heat, cruiser pursuit, foot officers, sirens, gunfire and arrests.
// This module only changes state; world.js turns state.busted into a respawn event.
import { WORLD } from './config.js';
import { snapToRoad } from './city.js';
import { createVehicle, driveToward } from './driving.js';
import { range } from './random.js';

export const MAX_WANTED = 5;
const ARREST_TIME = 3.2;

/** Raise the wanted level; every crime resets the escape timer. */
export function addWanted(state, stars) {
  const p = state.player;
  p.wanted = Math.max(0, Math.min(MAX_WANTED, p.wanted + stars));
  state.wantedTimer = 24 + p.wanted * 4;
  if (p.wanted > 0) state.message = { text: `${p.wanted}-STAR HEAT`, ttl: 2.6 };
}

/** Spawn a unit just off-screen on the nearest road, so reinforcements drive in. */
function spawnPoint(state, city, random) {
  const angle = range(random, 0, Math.PI * 2);
  const x = Math.max(120, Math.min(city.beachX - 120, state.player.x + Math.cos(angle) * 900));
  const y = Math.max(120, Math.min(city.height - 120, state.player.y + Math.sin(angle) * 700));
  return snapToRoad(city, x, y);
}

function addCruiser(state, city, random) {
  const p = spawnPoint(state, city, random);
  const car = createVehicle('cruiser', p.x, p.y, 0, random, { ai: 'police', occupant: 'police' });
  car.siren = true;
  car.speed = 220;
  state.policeCars.push(car);
}

function addOfficer(state, city, random) {
  const p = spawnPoint(state, city, random);
  state.officers.push({
    kind: 'officer', x: p.x, y: p.y, angle: 0, speed: 116, cooldown: range(random, 0.4, 2),
    aimX: state.player.x, aimY: state.player.y, hitFlash: 0, phase: random() * 6.28,
  });
}

/** Maintain the response to the current level, move it, fire, and run the arrest clock. */
export function updatePolice(state, dt, city, random) {
  const wanted = state.player.wanted;
  const wantedCars = wanted;
  const wantedOfficers = wanted * 2;

  while (state.policeCars.length < wantedCars) addCruiser(state, city, random);
  while (state.policeCars.length > wantedCars) state.policeCars.pop();
  while (state.officers.length < wantedOfficers) addOfficer(state, city, random);
  while (state.officers.length > wantedOfficers) state.officers.pop();

  const target = state.player;
  for (const car of state.policeCars) {
    const distance = Math.hypot(car.x - target.x, car.y - target.y);
    if (state.mode === 'car' || distance > 120) {
      driveToward(car, target.x, target.y, dt, city, 1 + wanted * 0.04);
    } else {
      driveToward(car, car.x + Math.cos(car.angle) * 60, car.y + Math.sin(car.angle) * 60, dt, city, 0.25);
    }
    if (distance < 58 && state.mode === 'car' && state.playerCar) state.playerCar.speed *= 0.985;
  }

  let nearestThreat = Infinity;
  for (const officer of state.officers) {
    const dx = target.x - officer.x;
    const dy = target.y - officer.y;
    const distance = Math.hypot(dx, dy) || 1;
    nearestThreat = Math.min(nearestThreat, distance);
    officer.aimX = target.x;
    officer.aimY = target.y;
    if (distance > 74) {
      const step = Math.min(distance - 60, officer.speed * dt);
      officer.x += (dx / distance) * step;
      officer.y += (dy / distance) * step;
      officer.angle = Math.atan2(dy, dx);
    }
    officer.phase += dt * 8;
    if (officer.hitFlash > 0) officer.hitFlash -= dt;
    officer.cooldown -= dt;
    if (state.mode === 'foot' && distance < 520 && distance > 60 && officer.cooldown <= 0 && wanted >= 1) {
      officer.cooldown = range(random, 0.75, 1.35) / (1 + wanted * 0.08);
      const spread = range(random, -0.07, 0.07);
      const aim = Math.atan2(dy, dx) + spread;
      state.bullets.push({
        x: officer.x, y: officer.y, vx: Math.cos(aim) * 520, vy: Math.sin(aim) * 520,
        life: 0.9, from: 'police', damage: 7 + wanted,
      });
      state.shotsHeard = 0.4;
    }
  }

  if (wanted > 0 && nearestThreat < 62 && state.mode === 'foot') {
    state.arrest += dt;
  } else if (wanted > 0 && state.mode === 'car' && state.policeCars.some((c) => Math.hypot(c.x - target.x, c.y - target.y) < 48)) {
    state.arrest += dt * 0.75;
  } else {
    state.arrest = Math.max(0, state.arrest - dt * 1.4);
  }
  if (state.arrest >= ARREST_TIME) {
    state.busted = true;
    state.arrest = 0;
  }

  if (wanted > 0 && state.wantedTimer > 0) {
    state.wantedTimer -= dt;
    if (state.wantedTimer <= 0) {
      target.wanted -= 1;
      state.wantedTimer = 16;
      if (target.wanted <= 0) {
        state.policeCars.length = 0;
        state.officers.length = 0;
        state.message = { text: 'HEAT CLEARED', ttl: 2.4 };
      }
    }
  }
}
