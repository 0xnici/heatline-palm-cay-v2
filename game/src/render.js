// World renderer: a warm golden-hour top-down view with hard shadows, pastel roofs, palm
// canopies, foam on the shore and a camera locked to the player. Everything is culled to the
// viewport. The HUD and overlays live in hud.js; this file only paints the world.
import { VIEW, WORLD, PALETTE, FONT, DISTRICTS } from './config.js';
import { drawHud, drawOverlay } from './hud.js';
import { milesPerHour } from './driving.js';

export const SCREEN_PLAY = 'play';
export const SCREEN_TITLE = 'title';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_WASTED = 'wasted';
export const SCREEN_BUSTED = 'busted';

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function createRenderer(canvas) {
  canvas.width = VIEW.width;
  canvas.height = VIEW.height;
  const ctx = canvas.getContext('2d', { alpha: false });

  function visible(cam, x, y, margin = 180) {
    return x > cam.x - 640 - margin && x < cam.x + 640 + margin && y > cam.y - 360 - margin && y < cam.y + 360 + margin;
  }

  function ground(city, cam, time) {
    ctx.fillStyle = PALETTE.pavement;
    ctx.fillRect(0, 0, WORLD.width, WORLD.height);
    ctx.fillStyle = PALETTE.oceanDeep;
    ctx.fillRect(city.waterX, 0, WORLD.width - city.waterX, WORLD.height);
    ctx.fillStyle = PALETTE.ocean;
    ctx.fillRect(city.waterX, 0, 190, WORLD.height);
    ctx.fillStyle = 'rgba(255,244,219,0.34)';
    for (let y = 60; y < WORLD.height; y += 74) {
      if (!visible(cam, city.waterX + 90, y, 160)) continue;
      const drift = Math.sin(time * 1.1 + y * 0.021) * 26;
      for (let x = city.waterX + 30; x < WORLD.width - 40; x += 118) {
        ctx.fillRect(x + drift, y + Math.sin(x * 0.03 + time) * 5, 34, 3);
      }
    }
    ctx.fillStyle = PALETTE.sand;
    ctx.fillRect(city.beachX, 0, city.waterX - city.beachX, WORLD.height);
    ctx.fillStyle = '#e7cca0';
    ctx.fillRect(city.beachX, 0, 24, WORLD.height);
    ctx.strokeStyle = PALETTE.foam;
    ctx.lineWidth = 6;
    for (const base of [city.waterX - 2, city.beachX + 26]) {
      ctx.beginPath();
      for (let y = 0; y <= WORLD.height; y += 22) {
        const x = base + Math.sin(y * 0.031 + time * 1.5) * 7;
        if (y === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    for (const pier of city.piers) {
      ctx.fillStyle = '#6b4b45';
      ctx.fillRect(pier.x - 6, pier.y - 6, pier.w + 12, pier.h + 12);
      ctx.fillStyle = '#bb8e6a';
      ctx.fillRect(pier.x, pier.y, pier.w, pier.h);
      ctx.strokeStyle = 'rgba(80,52,46,0.45)';
      ctx.lineWidth = 2;
      for (let x = pier.x + 14; x < pier.x + pier.w; x += 22) {
        ctx.beginPath(); ctx.moveTo(x, pier.y); ctx.lineTo(x, pier.y + pier.h); ctx.stroke();
      }
      ctx.fillStyle = '#3f2f38';
      ctx.fillRect(pier.x - 30, pier.y + 12, 34, pier.h - 24);
      ctx.fillStyle = '#e8a982';
      ctx.fillRect(pier.x - 30, pier.y + 22, 34, 8);
      for (const boat of pier.boats) {
        if (!visible(cam, boat.x, boat.y)) continue;
        ctx.fillStyle = 'rgba(20,60,70,0.35)';
        ctx.beginPath(); ctx.ellipse(boat.x + 5, boat.y + 7, 28, 11, 0, 0, 6.29); ctx.fill();
        ctx.fillStyle = boat.color;
        ctx.beginPath(); ctx.ellipse(boat.x, boat.y, 26, 10, -0.15, 0, 6.29); ctx.fill();
        ctx.fillStyle = '#5d7f88';
        ctx.fillRect(boat.x - 6, boat.y - 13, 14, 9);
      }
    }
  }

  function roads(city, cam) {
    const x0 = cam.x - 700, x1 = cam.x + 700, y0 = cam.y - 440, y1 = cam.y + 440;
    for (const x of city.roadsX) {
      if (x < x0 - 60 || x > x1 + 60) continue;
      const coastal = x === city.roadsX[city.roadsX.length - 1];
      ctx.fillStyle = coastal ? PALETTE.roadGold : PALETTE.road;
      ctx.fillRect(x - WORLD.roadHalf, 0, WORLD.roadHalf * 2, WORLD.height);
      ctx.fillStyle = 'rgba(255,220,160,0.55)';
      for (let y = 30; y < WORLD.height; y += 64) ctx.fillRect(x - 2, y, 4, 30);
      ctx.fillStyle = 'rgba(255,240,210,0.8)';
      for (const y of city.roadsY) {
        if (y < y0 || y > y1) continue;
        for (let i = -3; i <= 3; i++) ctx.fillRect(x - 40 + i * 13, y - WORLD.roadHalf - 4, 8, 4);
      }
    }
    for (const y of city.roadsY) {
      if (y < y0 - 60 || y > y1 + 60) continue;
      ctx.fillStyle = PALETTE.road;
      ctx.fillRect(0, y - WORLD.roadHalf, WORLD.beachX, WORLD.roadHalf * 2);
      ctx.fillStyle = 'rgba(255,220,160,0.5)';
      for (let x = 20; x < WORLD.beachX; x += 64) ctx.fillRect(x, y - 2, 30, 4);
    }
    ctx.fillStyle = PALETTE.sidewalk;
    for (let i = 0; i < city.roadsX.length - 1; i++) {
      for (let j = 0; j < city.roadsY.length - 1; j++) {
        const bx = city.roadsX[i] + WORLD.roadHalf;
        const by = city.roadsY[j] + WORLD.roadHalf;
        if (bx > x1 || bx + WORLD.grid - WORLD.roadHalf * 2 < x0 || by > y1 || by + WORLD.grid - WORLD.roadHalf * 2 < y0) continue;
        ctx.fillRect(bx, by, WORLD.grid - WORLD.roadHalf * 2, WORLD.grid - WORLD.roadHalf * 2);
      }
    }
    ctx.font = `700 30px ${FONT}`;
    ctx.textAlign = 'center';
    for (const d of DISTRICTS) {
      if (!visible(cam, d.x, d.y, 400)) continue;
      ctx.fillStyle = 'rgba(70,50,60,0.13)';
      ctx.fillText(d.name, d.x, d.y);
    }
  }

  function parks(city, cam) {
    for (const p of city.parks) {
      if (!visible(cam, p.x + p.w / 2, p.y + p.h / 2)) continue;
      ctx.fillStyle = PALETTE.grass;
      ctx.fillRect(p.x, p.y, p.w, p.h);
      ctx.fillStyle = '#e9d9b3';
      ctx.fillRect(p.x + p.w / 2 - 9, p.y, 18, p.h);
      ctx.fillRect(p.x, p.y + p.h / 2 - 9, p.w, 18);
      if (p.pond) {
        ctx.fillStyle = '#4e9ba1';
        ctx.beginPath(); ctx.ellipse(p.x + p.w * 0.72, p.y + p.h * 0.7, 32, 21, 0, 0, 6.29); ctx.fill();
        ctx.strokeStyle = '#d6f0e8'; ctx.lineWidth = 3; ctx.stroke();
      }
    }
  }

  function buildings(city, cam) {
    for (const b of city.buildings) {
      if (!visible(cam, b.x + b.w / 2, b.y + b.h / 2)) continue;
      ctx.fillStyle = 'rgba(61,40,58,0.34)';
      ctx.fillRect(b.x + b.shadow, b.y + b.shadow, b.w, b.h);
      ctx.fillStyle = b.roof;
      ctx.fillRect(b.x, b.y, b.w, b.h);
      ctx.fillStyle = 'rgba(255,246,214,0.55)';
      ctx.fillRect(b.x, b.y, b.w, 5);
      ctx.fillRect(b.x, b.y, 5, b.h);
      ctx.fillStyle = 'rgba(74,48,62,0.4)';
      ctx.fillRect(b.x, b.y + b.h - 5, b.w, 5);
      ctx.fillRect(b.x + b.w - 5, b.y, 5, b.h);
      ctx.strokeStyle = 'rgba(62,45,56,0.35)';
      ctx.lineWidth = 2;
      ctx.strokeRect(b.x + 0.5, b.y + 0.5, b.w - 1, b.h - 1);
      for (const s of b.skylights) {
        ctx.fillStyle = '#4a6b76';
        ctx.fillRect(s.x, s.y, s.w, s.h);
        ctx.fillStyle = 'rgba(255,236,186,0.55)';
        ctx.fillRect(s.x, s.y, s.w, 3);
      }
      for (const a of b.ac) {
        ctx.fillStyle = '#d8d4c6';
        ctx.fillRect(a.x, a.y, 30, 20);
        ctx.fillStyle = '#8b8f91';
        ctx.fillRect(a.x + 4, a.y + 4, 22, 4);
      }
      if (b.billboard) {
        ctx.fillStyle = '#2f2a3b';
        ctx.fillRect(b.x + b.w / 2 - 54, b.y + b.h / 2 - 15, 108, 30);
        ctx.fillStyle = '#ffcf70';
        ctx.font = `800 12px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(b.billboard, b.x + b.w / 2, b.y + b.h / 2 + 4, 100);
      }
      if (b.storefront) {
        const a = b.awning;
        ctx.fillStyle = b.sign ? '#b64f4f' : '#d97a5d';
        ctx.fillRect(a.x, a.y, a.w, a.h);
        ctx.fillStyle = 'rgba(255,244,219,0.72)';
        for (let x = a.x + 4; x < a.x + a.w; x += 18) ctx.fillRect(x, a.y, 8, a.h);
        if (b.sign && b.w > 76) {
          ctx.fillStyle = '#33283a';
          ctx.font = `800 11px ${FONT}`;
          ctx.textAlign = 'center';
          ctx.fillText(b.sign, b.x + b.w / 2, a.side === 'north' ? a.y + a.h + 14 : a.y - 4, b.w - 6);
        }
      }
    }
  }

  function props(city, cam, time) {
    for (const palm of city.palms) {
      if (!visible(cam, palm.x, palm.y)) continue;
      const s = palm.size;
      ctx.fillStyle = 'rgba(60,40,58,0.3)';
      ctx.beginPath(); ctx.ellipse(palm.x + 7, palm.y + 9, 20 * s, 9 * s, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#7a5547';
      ctx.beginPath(); ctx.arc(palm.x, palm.y, 6 * s, 0, 6.29); ctx.fill();
      for (let i = 0; i < 7; i++) {
        const a = (i / 7) * Math.PI * 2 + Math.sin(time * 0.7 + palm.x) * 0.04;
        ctx.fillStyle = i % 2 ? '#315f4f' : '#3d7358';
        ctx.beginPath();
        ctx.ellipse(palm.x + Math.cos(a) * 13 * s, palm.y + Math.sin(a) * 13 * s, 14 * s, 5.5 * s, a, 0, 6.29);
        ctx.fill();
      }
      ctx.fillStyle = '#c8a45f';
      ctx.beginPath(); ctx.arc(palm.x, palm.y, 3 * s, 0, 6.29); ctx.fill();
    }
    for (const lamp of city.lamps) {
      if (!visible(cam, lamp.x, lamp.y)) continue;
      ctx.fillStyle = 'rgba(255,220,150,0.13)';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 30, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#4b4050';
      ctx.beginPath(); ctx.arc(lamp.x, lamp.y, 5, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#ffe1a1';
      ctx.beginPath(); ctx.arc(lamp.x - 1, lamp.y - 1, 3, 0, 6.29); ctx.fill();
    }
  }

  function packages(state, cam, time) {
    for (const pkg of state.city.packages) {
      if (pkg.taken || !visible(cam, pkg.x, pkg.y)) continue;
      const pulse = 1 + Math.sin(time * 4 + pkg.id) * 0.12;
      ctx.strokeStyle = 'rgba(255,205,90,0.65)';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(pkg.x, pkg.y, 24 * pulse, 0, 6.29); ctx.stroke();
      ctx.fillStyle = '#c78a3f';
      ctx.fillRect(pkg.x - 12, pkg.y - 12, 24, 24);
      ctx.fillStyle = '#ffd46a';
      ctx.fillRect(pkg.x - 9, pkg.y - 9, 18, 18);
      ctx.fillStyle = '#7c502f';
      ctx.fillRect(pkg.x - 2, pkg.y - 9, 4, 18);
      ctx.fillRect(pkg.x - 9, pkg.y - 2, 18, 4);
    }
  }

  function people(state, cam) {
    for (const ped of state.peds) {
      if (!visible(cam, ped.x, ped.y)) continue;
      ctx.fillStyle = 'rgba(50,35,50,0.3)';
      ctx.beginPath(); ctx.ellipse(ped.x + 3, ped.y + 5, 9, 5, 0, 0, 6.29); ctx.fill();
      if (ped.down > 0) {
        ctx.fillStyle = '#8b6a62';
        ctx.beginPath(); ctx.ellipse(ped.x, ped.y, 12, 7, 0.3, 0, 6.29); ctx.fill();
        continue;
      }
      ctx.fillStyle = ped.shirt;
      ctx.beginPath(); ctx.arc(ped.x, ped.y, 8, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#e8c7a0';
      ctx.beginPath(); ctx.arc(ped.x + Math.cos(ped.angle) * 4, ped.y + Math.sin(ped.angle) * 4, 4.4, 0, 6.29); ctx.fill();
      if (ped.hat) {
        ctx.fillStyle = '#4a3f4b';
        ctx.beginPath(); ctx.arc(ped.x, ped.y, 6, 0, 6.29); ctx.fill();
      }
    }
    for (const officer of state.officers) {
      if (!visible(cam, officer.x, officer.y)) continue;
      ctx.fillStyle = 'rgba(30,40,70,0.35)';
      ctx.beginPath(); ctx.ellipse(officer.x + 4, officer.y + 6, 12, 6, 0, 0, 6.29); ctx.fill();
      ctx.fillStyle = officer.hitFlash > 0 ? '#ffffff' : '#294a78';
      ctx.beginPath(); ctx.arc(officer.x, officer.y, 11, 0, 6.29); ctx.fill();
      ctx.fillStyle = '#f2d7b4';
      ctx.beginPath(); ctx.arc(officer.x + Math.cos(officer.angle) * 5, officer.y + Math.sin(officer.angle) * 5, 5.5, 0, 6.29); ctx.fill();
      ctx.strokeStyle = '#22314b'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(officer.x, officer.y);
      ctx.lineTo(officer.x + Math.cos(officer.angle) * 19, officer.y + Math.sin(officer.angle) * 19); ctx.stroke();
      ctx.fillStyle = '#ffd35c';
      ctx.beginPath(); ctx.arc(officer.x - Math.sin(officer.angle) * 7, officer.y + Math.cos(officer.angle) * 7, 2.5, 0, 6.29); ctx.fill();
    }
  }

  function carShape(car, isPlayer, cam) {
    if (!visible(cam, car.x, car.y, 120)) return;
    ctx.save();
    ctx.translate(car.x, car.y);
    ctx.rotate(car.angle);
    const long = 23;
    const wide = 13;
    ctx.fillStyle = 'rgba(45,32,46,0.4)';
    roundRect(ctx, -long + 4, -wide + 5, long * 2, wide * 2, 7); ctx.fill();
    ctx.fillStyle = car.hitFlash > 0 ? '#ffffff' : car.color;
    roundRect(ctx, -long, -wide, long * 2, wide * 2, 6); ctx.fill();
    ctx.fillStyle = 'rgba(30,42,52,0.72)';
    roundRect(ctx, -7, -wide + 3, 15, wide * 2 - 6, 3); ctx.fill();
    ctx.fillStyle = 'rgba(255,244,214,0.5)';
    ctx.fillRect(long - 5, -wide + 3, 3, 5);
    ctx.fillRect(long - 5, wide - 8, 3, 5);
    if (car.id === 'taxi') {
      ctx.fillStyle = '#2d2a36';
      ctx.fillRect(-3, -wide, 6, wide * 2);
      ctx.fillStyle = '#ffe9a1';
      ctx.font = `800 8px ${FONT}`; ctx.textAlign = 'center';
      ctx.fillText('TAXI', -14, 3);
    }
    if (car.siren) {
      const flash = Math.sin(car.sirenPhase) > 0;
      ctx.fillStyle = flash ? '#6fd6ff' : '#43618f';
      ctx.fillRect(-3, -wide - 1, 6, 6);
      ctx.fillStyle = flash ? '#e8524e' : '#8a3b44';
      ctx.fillRect(-3, wide - 5, 6, 6);
      ctx.fillStyle = 'rgba(120,190,255,0.17)';
      ctx.beginPath(); ctx.arc(0, 0, 44, 0, 6.29); ctx.fill();
    }
    if (isPlayer) {
      ctx.strokeStyle = '#fff3d5'; ctx.lineWidth = 2.5;
      roundRect(ctx, -long - 2, -wide - 2, long * 2 + 4, wide * 2 + 4, 7); ctx.stroke();
    }
    ctx.restore();
  }

  function vehicles(state, cam) {
    for (const car of state.cars) if (car !== state.playerCar) carShape(car, false, cam);
    for (const car of state.policeCars) carShape(car, false, cam);
    if (state.playerCar) carShape(state.playerCar, true, cam);
  }

  function player(state, cam) {
    if (state.mode === 'car') return;
    const p = state.player;
    if (!visible(cam, p.x, p.y)) return;
    if (state.invulnerable > 0 && Math.floor(state.time * 14) % 2 === 0) return;
    ctx.fillStyle = 'rgba(45,32,46,0.38)';
    ctx.beginPath(); ctx.ellipse(p.x + 4, p.y + 6, 12, 7, 0, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#fff4db'; ctx.lineWidth = 2.5;
    ctx.fillStyle = '#e8b98f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 11, 0, 6.29); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#d8433f';
    ctx.beginPath(); ctx.arc(p.x, p.y, 7.5, 0, 6.29); ctx.fill();
    ctx.strokeStyle = '#ffe6b8'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + Math.cos(p.angle) * 18, p.y + Math.sin(p.angle) * 18); ctx.stroke();
    ctx.fillStyle = '#33404d';
    ctx.beginPath(); ctx.arc(p.x + Math.cos(p.angle) * 4, p.y + Math.sin(p.angle) * 4, 3.5, 0, 6.29); ctx.fill();
  }

  function markers(state, cam, time) {
    const add = (m, color) => {
      if (!m || !visible(cam, m.x, m.y, 260)) return;
      const pulse = 1 + Math.sin(time * 3.4) * 0.14;
      ctx.strokeStyle = color; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.arc(m.x, m.y, 34 * pulse, 0, 6.29); ctx.stroke();
      ctx.fillStyle = color;
      ctx.save(); ctx.translate(m.x, m.y - 46); ctx.rotate(Math.PI / 4);
      ctx.fillRect(-11, -11, 22, 22); ctx.restore();
      ctx.fillStyle = '#fff4db';
      ctx.font = `800 15px ${FONT}`; ctx.textAlign = 'center';
      ctx.lineWidth = 4; ctx.strokeStyle = '#2d2434';
      ctx.strokeText(m.label ?? 'OBJECTIVE', m.x, m.y - 62);
      ctx.fillText(m.label ?? 'OBJECTIVE', m.x, m.y - 62);
    };
    add(state.mission.marker, '#ffd166');
    if (state.fare?.active) add({ ...state.fare }, '#8ff0d0');
    for (const target of state.mission.targets) {
      if (!target.dead && visible(cam, target.x, target.y)) {
        ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.arc(target.x, target.y, 24, 0, 6.29); ctx.stroke();
        ctx.fillStyle = '#b4464b';
        ctx.beginPath(); ctx.arc(target.x, target.y, 12, 0, 6.29); ctx.fill();
      }
    }
  }

  function effects(state, cam) {
    for (const fx of state.effects) {
      if (!visible(cam, fx.x, fx.y)) continue;
      const k = fx.life / fx.max;
      ctx.globalAlpha = Math.max(0, k);
      ctx.fillStyle = fx.color;
      ctx.beginPath(); ctx.arc(fx.x, fx.y, fx.r * (1 + (1 - k) * (fx.type === 'dust' ? 1.6 : 0.7)), 0, 6.29); ctx.fill();
      ctx.globalAlpha = 1;
    }
    for (const b of state.bullets) {
      if (!visible(cam, b.x, b.y)) continue;
      ctx.strokeStyle = b.from === 'player' ? '#fff0a8' : '#9fe8ff';
      ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(b.x, b.y);
      ctx.lineTo(b.x - b.vx * 0.016, b.y - b.vy * 0.016); ctx.stroke();
    }
  }

  function draw(state, screen = state.screen) {
    const cam = state.camera;
    const time = state.time;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#171a22';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.save();
    ctx.translate(VIEW.width / 2 - cam.x, VIEW.height / 2 - cam.y);
    ground(state.city, cam, time);
    roads(state.city, cam);
    parks(state.city, cam);
    buildings(state.city, cam);
    props(state.city, cam, time);
    packages(state, cam, time);
    people(state, cam);
    vehicles(state, cam);
    effects(state, cam);
    player(state, cam);
    markers(state, cam, time);
    ctx.restore();

    const wash = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    wash.addColorStop(0, 'rgba(255,196,120,0.10)');
    wash.addColorStop(0.55, 'rgba(255,225,170,0.02)');
    wash.addColorStop(1, 'rgba(52,34,58,0.16)');
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    drawHud(ctx, state, screen, milesPerHour(state.playerCar));
    drawOverlay(ctx, state, screen);
  }

  return { draw, ctx };
}
