// Vehicles: one clean top-down physics model for the player, traffic and Police cruisers, plus
// the lane-following traffic autopilot. Speed is in world pixels per second.
import { CAR_TYPES, WORLD } from './config.js';
import { buildingAt } from './city.js';
import { pick, range } from './random.js';

export function carSpec(id) {
  return CAR_TYPES.find((c) => c.id === id) ?? CAR_TYPES[0];
}

/** A fresh vehicle. `angle` 0 faces east, -PI/2 faces north. */
export function createVehicle(id, x, y, angle = 0, random = null, extra = {}) {
  const spec = carSpec(id);
  return {
    kind: 'car', id, name: spec.name, color: extra.color ?? spec.color,
    x, y, angle, speed: 0, top: spec.top, accel: spec.accel, turn: spec.turn,
    ai: extra.ai ?? null, axis: extra.axis ?? 'v', dir: extra.dir ?? 1, lane: extra.lane ?? 22,
    siren: false, sirenPhase: 0, occupant: extra.occupant ?? 'traffic',
    hitFlash: 0, wax: random ? random() : 0.5, ...extra,
  };
}

/** Integrate throttle (-1..1), steering (-1..1) and handbrake for one step. */
export function updateVehicle(car, controls, dt, city) {
  const throttle = controls?.throttle ?? 0;
  const steer = controls?.steer ?? 0;
  const handbrake = controls?.handbrake ?? false;
  if (throttle > 0) car.speed += car.accel * dt;
  else if (throttle < 0) car.speed -= car.accel * 1.6 * dt;
  else car.speed *= Math.pow(0.985, dt * 60);
  if (handbrake) car.speed *= Math.pow(0.92, dt * 60);
  car.speed = Math.max(-car.top * 0.35, Math.min(car.top, car.speed));
  if (Math.abs(car.speed) > 6) {
    const grip = Math.min(1, Math.abs(car.speed) / 170);
    car.angle += steer * car.turn * grip * dt * (car.speed < 0 ? -1 : 1);
  }
  const nx = car.x + Math.cos(car.angle) * car.speed * dt;
  const ny = car.y + Math.sin(car.angle) * car.speed * dt;
  if (!buildingAt(city, nx, ny, 4)) {
    car.x = nx;
    car.y = ny;
  } else {
    car.speed *= -0.22;
  }
  car.x = Math.max(40, Math.min(WORLD.waterX + 200, car.x));
  car.y = Math.max(40, Math.min(WORLD.height - 40, car.y));
  car.sirenPhase += dt * 9;
  if (car.hitFlash > 0) car.hitFlash -= dt;
}

/** Steering helper for the police: turn toward a point, then drive there. */
export function driveToward(car, tx, ty, dt, city, boost = 1) {
  const desired = Math.atan2(ty - car.y, tx - car.x);
  let diff = desired - car.angle;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  updateVehicle(car, { throttle: boost, steer: Math.max(-1, Math.min(1, diff * 2.2)) }, dt, city);
}

/** Create a spread of ordinary traffic on the grid. */
export function createTraffic(city, random, count) {
  const cars = [];
  for (let i = 0; i < count; i++) {
    const vertical = random() < 0.55;
    const dir = random() < 0.5 ? 1 : -1;
    const lane = dir > 0 ? 22 : -22;
    const car = vertical
      ? createVehicle(pick(random, ['sedan', 'coupe', 'truck', 'taxi']),
          pick(random, city.roadsX) + lane, range(random, 200, WORLD.height - 200), dir > 0 ? Math.PI / 2 : -Math.PI / 2, random)
      : createVehicle(pick(random, ['sedan', 'coupe', 'truck']),
          range(random, 200, WORLD.beachX - 200), pick(random, city.roadsY) - lane, dir > 0 ? 0 : Math.PI, random);
    car.ai = 'traffic';
    car.axis = vertical ? 'v' : 'h';
    car.dir = dir;
    car.lane = lane;
    car.speed = range(random, 130, 260);
    cars.push(car);
  }
  return cars;
}

/** Keep traffic circulating: lane following, intersection turns, braking and edge wrapping. */
export function updateTraffic(cars, dt, city, random) {
  for (const car of cars) {
    // Parked cars stay parked and the player's car obeys its own physics, not the lane autopilot.
    if (car.ai !== 'traffic') continue;
    car.speed += ((car.id === 'truck' ? 210 : 255) - car.speed) * Math.min(1, dt * 0.9);
    if (car.axis === 'v') {
      car.y += car.dir * car.speed * dt;
      car.x += ((car.ai === 'traffic' ? car.lane + (car.dir > 0 ? 0 : 0) : car.lane) - (car.x - nearest(city.roadsX, car.x))) * Math.min(1, dt * 3);
      if (car.y > WORLD.height - 80) car.y = 80;
      if (car.y < 80) car.y = WORLD.height - 80;
    } else {
      car.x += car.dir * car.speed * dt;
      car.y += (-car.lane - (car.y - nearest(city.roadsY, car.y))) * Math.min(1, dt * 3);
      if (car.x > WORLD.beachX - 60) car.x = 100;
      if (car.x < 100) car.x = WORLD.beachX - 60;
    }
    // Turn at occasional intersections so the city feels alive rather than a set of racetracks.
    if (random() < dt * 0.22) {
      if (car.axis === 'v') {
        const ry = nearest(city.roadsY, car.y);
        if (Math.abs(car.y - ry) < 42) {
          car.axis = 'h';
          car.dir = random() < 0.5 ? 1 : -1;
          car.lane = car.dir > 0 ? 22 : -22;
          car.y = ry - car.lane;
        }
      } else {
        const rx = nearest(city.roadsX, car.x);
        if (Math.abs(car.x - rx) < 42) {
          car.axis = 'v';
          car.dir = random() < 0.5 ? 1 : -1;
          car.lane = car.dir > 0 ? 22 : -22;
          car.x = rx + car.lane;
        }
      }
    }
    car.angle = car.axis === 'v' ? (car.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (car.dir > 0 ? 0 : Math.PI);
  }
}

function nearest(list, value) {
  let best = list[0];
  let bd = Math.abs(value - best);
  for (const v of list) {
    const d = Math.abs(value - v);
    if (d < bd) { bd = d; best = v; }
  }
  return best;
}

/** How fast a car is going in the unit the HUD shows. */
export function milesPerHour(car) {
  return Math.round(Math.abs(car?.speed ?? 0) * 0.17);
}
