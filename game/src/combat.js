// Mouse-aim combat: the player's pistol, incoming police fire, bullet collision and short-lived
// visual effects. Hit results are written back to shared state for missions and wanted heat.
import { addWanted } from './police.js';
import { range } from './random.js';

export function firePlayerWeapon(state, random) {
  if (state.mode !== 'foot' || state.fireCooldown > 0 || state.screen !== 'play') return;
  state.fireCooldown = 0.15;
  const p = state.player;
  const aim = Math.atan2(state.aim.y - p.y, state.aim.x - p.x);
  const spread = range(random, -0.035, 0.035);
  state.bullets.push({
    x: p.x + Math.cos(aim) * 20, y: p.y + Math.sin(aim) * 20,
    vx: Math.cos(aim + spread) * 760, vy: Math.sin(aim + spread) * 760,
    life: 0.8, from: 'player', damage: 34,
  });
  state.effects.push({ x: p.x + Math.cos(aim) * 24, y: p.y + Math.sin(aim) * 24, r: 12, life: 0.1, max: 0.1, color: '#fff0a8', type: 'muzzle' });
  state.pPlayerShot = true;
  state.shotsHeard = 1.2;
  addWanted(state, 1);
}

function spark(state, x, y, color) {
  state.effects.push({ x, y, r: 6, life: 0.28, max: 0.28, color, type: 'spark' });
}

/** Move every bullet one step and resolve what it hits. */
export function updateCombat(state, dt, city, random) {
  if (state.fireCooldown > 0) state.fireCooldown -= dt;
  if (state.shotsHeard > 0) state.shotsHeard -= dt;

  for (let i = state.bullets.length - 1; i >= 0; i--) {
    const b = state.bullets[i];
    b.x += b.vx * dt;
    b.y += b.vy * dt;
    b.life -= dt;
    let consumed = b.life <= 0 || b.x < 0 || b.y < 0 || b.x > state.city.width || b.y > state.city.height;

    if (!consumed && b.from === 'player') {
      for (const officer of state.officers) {
        if (Math.hypot(officer.x - b.x, officer.y - b.y) < 17) {
          officer.hitFlash = 0.18;
          spark(state, b.x, b.y, '#ffd166');
          consumed = true;
          addWanted(state, 1);
          break;
        }
      }
      if (!consumed) {
        for (const target of state.mission.targets) {
          if (target.dead || Math.hypot(target.x - b.x, target.y - b.y) > 20) continue;
          target.hp -= b.damage;
          spark(state, b.x, b.y, '#ff7f6e');
          consumed = true;
          if (target.hp <= 0) {
            target.dead = true;
            state.message = { text: 'TARGET DOWN', ttl: 1.8 };
          }
          break;
        }
      }
      if (!consumed) {
        for (const ped of state.peds) {
          if (ped.down > 0 || Math.hypot(ped.x - b.x, ped.y - b.y) > 14) continue;
          ped.down = 12;
          spark(state, b.x, b.y, '#d9706b');
          consumed = true;
          addWanted(state, 1);
          break;
        }
      }
      if (!consumed) {
        for (const car of state.policeCars) {
          if (Math.hypot(car.x - b.x, car.y - b.y) < 24) {
            car.hitFlash = 0.14;
            spark(state, b.x, b.y, '#fff1c2');
            consumed = true;
            break;
          }
        }
      }
    } else if (!consumed && state.mode === 'foot' && Math.hypot(state.player.x - b.x, state.player.y - b.y) < 16) {
      if (state.invulnerable <= 0) {
        state.player.health = Math.max(0, state.player.health - b.damage);
        state.invulnerable = 0.22;
        state.damageFlash = 0.3;
        spark(state, b.x, b.y, '#ff6b75');
        if (state.player.health <= 0) state.wasted = true;
      }
      consumed = true;
    }
    if (consumed) state.bullets.splice(i, 1);
  }

  for (let i = state.effects.length - 1; i >= 0; i--) {
    const fx = state.effects[i];
    fx.life -= dt;
    if (fx.life <= 0) state.effects.splice(i, 1);
  }
  if (state.invulnerable > 0) state.invulnerable -= dt;
  if (state.damageFlash > 0) state.damageFlash -= dt;
  if (state.message && state.message.ttl > 0) state.message.ttl -= dt;
}
