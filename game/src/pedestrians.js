// Sidewalk pedestrians: they wander from one pavement point to the next, scatter from a speeding
// car or a gunfight, and otherwise give the streets scale. Movement is deliberately simple and
// deterministic for a given seed.
import { WORLD } from './config.js';
import { sidewalkPoint } from './city.js';
import { pick, range } from './random.js';

const SHIRTS = ['#f3e1c0', '#7fb9c2', '#e58d7a', '#c4a7d8', '#8fb07d', '#f0c35e', '#d9d3c6', '#6d7fa8'];

export function createPedestrians(city, random, count) {
  const peds = [];
  for (let i = 0; i < count; i++) {
    const start = sidewalkPoint(random, city);
    const dest = sidewalkPoint(random, city);
    peds.push({
      kind: 'ped', x: start.x, y: start.y, angle: 0, speed: range(random, 46, 82),
      tx: dest.x, ty: dest.y, shirt: pick(random, SHIRTS), hat: random() < 0.28,
      phase: random() * 6.28, panic: 0, down: 0,
    });
  }
  return peds;
}

/** Walk toward the current pavement target; pick a new one on arrival. Panic makes them run away. */
export function updatePedestrians(peds, dt, city, random, state) {
  for (const ped of peds) {
    if (ped.down > 0) {
      ped.down -= dt;
      continue;
    }
    let dx = ped.tx - ped.x;
    let dy = ped.ty - ped.y;
    let distance = Math.hypot(dx, dy);
    if (distance < 14) {
      const next = sidewalkPoint(random, city);
      ped.tx = next.x;
      ped.ty = next.y;
      dx = ped.tx - ped.x;
      dy = ped.ty - ped.y;
      distance = Math.hypot(dx, dy) || 1;
    }
    let speed = ped.speed;
    // Any fast car, gunshot or officer nearby turns a stroll into a sprint in the other direction.
    const threat = state?.player;
    if (threat) {
      const near = Math.hypot(ped.x - threat.x, ped.y - threat.y);
      const danger = state.mode === 'car' && Math.abs(state.playerCar?.speed ?? 0) > 170 ? 150 : (state.shotsHeard ?? 0) > 0 ? 180 : 0;
      if (danger && near < danger) {
        dx = ped.x - threat.x;
        dy = ped.y - threat.y;
        distance = Math.hypot(dx, dy) || 1;
        speed *= 2.6;
        ped.panic = 0.8;
      }
    }
    if (ped.panic > 0) ped.panic -= dt;
    const step = Math.min(distance, speed * dt);
    ped.x += (dx / distance) * step;
    ped.y += (dy / distance) * step;
    ped.angle = Math.atan2(dy, dx);
    ped.phase += dt * speed * 0.05;
    ped.x = Math.max(30, Math.min(WORLD.waterX + 250, ped.x));
    ped.y = Math.max(30, Math.min(WORLD.height - 30, ped.y));
  }
}

/** Knock a pedestrian down when a car clips them; the caller awards the wanted level. */
export function knockDown(ped, dt) {
  ped.down = Math.max(ped.down, dt);
}
