// The HUD and the four overlays. Type is deliberately large (18-30px) and every panel has a dark
// backing, so a shrunken contact-sheet cell still shows the objective, stars, health, minimap and
// speedometer. hud.js draws no world geometry; it only reads state.
import { VIEW, FONT, WORLD, PALETTE, PACKAGE_COUNT } from './config.js';
import { FIXERS, currentJob } from './missions.js';

const INK = 'rgba(28,24,39,0.88)';
const GOLD = '#ffd166';
const CREAM = '#fff4db';

function panel(ctx, x, y, w, h, border = GOLD) {
  ctx.fillStyle = INK;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = border;
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
}

function label(ctx, text, x, y, size, color, align = 'left', weight = 700) {
  ctx.font = `${weight} ${size}px ${FONT}`;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(text, x, y);
}

function star(ctx, x, y, radius, lit) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + i * Math.PI / 5;
    const r = i % 2 === 0 ? radius : radius * 0.46;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = lit ? GOLD : 'rgba(255,244,219,0.22)';
  ctx.fill();
  if (lit) {
    ctx.strokeStyle = '#8a5b25';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

function wrap(ctx, text, maxWidth) {
  ctx.font = `600 18px ${FONT}`;
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line === '' ? word : `${line} ${word}`;
    if (ctx.measureText(next).width > maxWidth && line !== '') {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.slice(0, 3);
}

function minimap(ctx, state) {
  const x = 24, y = 536, w = 232, h = 160;
  panel(ctx, x, y, w, h, 'rgba(255,209,102,0.8)');
  const sx = (w - 8) / WORLD.width;
  const sy = (h - 8) / WORLD.height;
  const px = (wx) => x + 4 + wx * sx;
  const py = (wy) => y + 4 + wy * sy;
  ctx.fillStyle = '#dfcba6';
  ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
  ctx.fillStyle = '#1a7180';
  ctx.fillRect(px(state.city.waterX), y + 4, w - 8 - (state.city.waterX * sx), h - 8);
  ctx.strokeStyle = '#514c58';
  ctx.lineWidth = 2;
  for (const rx of state.city.roadsX) {
    ctx.beginPath(); ctx.moveTo(px(rx), y + 4); ctx.lineTo(px(rx), y + h - 4); ctx.stroke();
  }
  for (const ry of state.city.roadsY) {
    ctx.beginPath(); ctx.moveTo(x + 4, py(ry)); ctx.lineTo(x + w - 4, py(ry)); ctx.stroke();
  }
  ctx.fillStyle = '#f6c560';
  for (const f of FIXERS) ctx.fillRect(px(f.x) - 3, py(f.y) - 3, 6, 6);
  const m = state.mission.marker;
  if (m) {
    ctx.fillStyle = GOLD;
    ctx.beginPath(); ctx.arc(px(m.x), py(m.y), 5, 0, 6.29); ctx.fill();
  }
  for (const car of state.policeCars) {
    ctx.fillStyle = '#6fb8ff';
    ctx.fillRect(px(car.x) - 2, py(car.y) - 2, 4, 4);
  }
  ctx.save();
  ctx.translate(px(state.player.x), py(state.player.y));
  ctx.rotate(state.player.angle);
  ctx.fillStyle = '#e8433f';
  ctx.strokeStyle = '#fff4db'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.moveTo(8, 0); ctx.lineTo(-6, -5); ctx.lineTo(-6, 5); ctx.closePath();
  ctx.fill(); ctx.stroke();
  ctx.restore();
  label(ctx, 'PALM CAY', x + 12, y + 20, 13, '#2d2634', 'left', 800);
}

function speedo(ctx, state, mph, x, y) {
  const r = 50;
  ctx.fillStyle = 'rgba(30,25,40,0.55)';
  ctx.beginPath(); ctx.arc(x, y, r + 8, 0, 6.29); ctx.fill();
  ctx.strokeStyle = 'rgba(255,244,219,0.35)'; ctx.lineWidth = 4;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 2.25); ctx.stroke();
  ctx.strokeStyle = GOLD; ctx.lineWidth = 5;
  ctx.beginPath(); ctx.arc(x, y, r, Math.PI * 0.75, Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, mph / 110)); ctx.stroke();
  const needle = Math.PI * 0.75 + Math.PI * 1.5 * Math.min(1, mph / 110);
  ctx.strokeStyle = '#fff4db'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(x, y);
  ctx.lineTo(x + Math.cos(needle) * (r - 12), y + Math.sin(needle) * (r - 12)); ctx.stroke();
  label(ctx, String(mph), x, y + 12, 30, CREAM, 'center', 800);
  label(ctx, 'MPH', x, y + 30, 12, GOLD, 'center', 800);
}

function drawPrompt(ctx, state) {
  let text = '';
  if (state.mode === 'car') {
    text = state.playerCar?.id === 'taxi'
      ? 'E  EXIT    F  TAXI FARE    SPACE  HANDBRAKE'
      : 'E  EXIT    SPACE  HANDBRAKE';
  } else {
    let near = null;
    let best = 82;
    for (const car of state.cars) {
      const d = Math.hypot(car.x - state.player.x, car.y - state.player.y);
      if (d < best) { best = d; near = car; }
    }
    if (near) text = `E  STEAL ${near.name.toUpperCase()}`;
    else if (FIXERS.some((f) => Math.hypot(f.x - state.player.x, f.y - state.player.y) < 110)) text = 'E  TALK TO FIXER';
    else text = 'WASD WALK    E INTERACT    MOUSE AIM + CLICK FIRE';
  }
  ctx.font = `700 16px ${FONT}`;
  const width = Math.min(760, ctx.measureText(text).width + 30);
  panel(ctx, (VIEW.width - width) / 2, 496, width, 34, 'rgba(255,244,219,0.35)');
  label(ctx, text, VIEW.width / 2, 519, 16, CREAM, 'center', 700);
}

export function drawHud(ctx, state, screen, mph) {
  if (screen === 'title') return;

  // Brand lockup: small, but always on screen so the name survives a tiny contact-sheet cell.
  panel(ctx, 24, 20, 216, 62);
  ctx.fillStyle = '#e04b47';
  ctx.fillRect(24, 20, 6, 62);
  label(ctx, 'HEATLINE', 40, 50, 24, GOLD, 'left', 900);
  label(ctx, 'P A L M   C A Y', 41, 70, 12, CREAM, 'left', 700);

  // Objective banner across the middle of the top edge.
  const job = currentJob(state);
  const title = job ? `JOB ${String(job.id).padStart(2, '0')}  ·  ${job.title}` : 'FREE ROAM  ·  FIND A FIXER';
  const hint = job ? job.hint : 'Take the gold marker, steal a car, explore the coast.';
  panel(ctx, 360, 18, 560, 76);
  ctx.fillStyle = GOLD;
  ctx.fillRect(360, 18, 6, 76);
  label(ctx, title, 380, 50, 20, GOLD, 'left', 800);
  label(ctx, hint, 380, 76, 14, CREAM, 'left', 600, '600');
  if (job && state.mission.active && job.type === 'packages') {
    label(ctx, `${state.packagesTaken.length}/${PACKAGE_COUNT} PACKAGES`, 900, 76, 14, GOLD, 'right', 800);
  } else if (job && state.mission.active) {
    label(ctx, 'IN PROGRESS', 900, 46, 14, GOLD, 'right', 800);
  }

  // Wanted stars.
  panel(ctx, 1040, 20, 216, 62, state.player.wanted > 0 ? GOLD : 'rgba(255,244,219,0.35)');
  label(ctx, 'WANTED', 1056, 43, 13, CREAM, 'left', 800);
  for (let i = 0; i < 5; i++) star(ctx, 1070 + i * 36, 64, 12, i < state.player.wanted);
  if (state.arrest > 0) {
    ctx.fillStyle = 'rgba(20,18,28,0.9)';
    ctx.fillRect(1040, 86, 216, 12);
    ctx.fillStyle = '#e9564f';
    ctx.fillRect(1040, 86, 216 * Math.min(1, state.arrest / 3.2), 12);
    label(ctx, 'BUST IN PROGRESS', 1148, 114, 13, '#ff9b96', 'center', 800);
  }

  // Money and package tally.
  panel(ctx, 24, 90, 216, 44, 'rgba(255,244,219,0.35)');
  label(ctx, `$${Math.round(state.money).toLocaleString('en-US')}`, 38, 120, 24, CREAM, 'left', 800);
  label(ctx, `${state.packagesTaken.length}/${PACKAGE_COUNT} PKGS`, 230, 119, 14, GOLD, 'right', 800);

  minimap(ctx, state);

  // Health and speedo on one broad panel.
  panel(ctx, 920, 548, 336, 148);
  label(ctx, 'HEALTH', 940, 576, 14, CREAM, 'left', 800);
  ctx.fillStyle = 'rgba(20,18,28,0.85)';
  ctx.fillRect(1000, 565, 236, 16);
  ctx.fillStyle = state.player.health > 35 ? '#79cd85' : '#e9564f';
  ctx.fillRect(1000, 565, 236 * Math.max(0, state.player.health / 100), 16);
  label(ctx, `${Math.round(state.player.health)}%`, 1236, 600, 13, CREAM, 'right', 800);
  speedo(ctx, state, mph, 1160, 642);
  label(ctx, state.mode === 'car' ? (state.playerCar?.name ?? 'DRIVING').toUpperCase() : 'ON FOOT', 946, 686, 13, GOLD, 'left', 800);

  drawPrompt(ctx, state);

  if (state.message && state.message.ttl > 0) {
    const width = Math.min(720, 320 + state.message.text.length * 11);
    panel(ctx, (VIEW.width - width) / 2, 104, width, 42);
    label(ctx, state.message.text, VIEW.width / 2, 132, 20, GOLD, 'center', 800);
  }

  const dialogue = state.mission.dialogue;
  if (dialogue) {
    panel(ctx, 300, 544, 600, 96, GOLD);
    label(ctx, dialogue.speaker.toUpperCase(), 318, 572, 15, GOLD, 'left', 800);
    const lines = wrap(ctx, dialogue.text, 560);
    lines.forEach((line, i) => label(ctx, line, 318, 598 + i * 22, 18, CREAM, 'left', 600));
  }

  if (state.damageFlash > 0) {
    ctx.fillStyle = `rgba(220,50,60,${Math.min(0.3, state.damageFlash * 0.8)})`;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }
}

function big(ctx, text, y, size, color, stroke = '#2b2236') {
  ctx.font = `900 ${size}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.lineWidth = 10;
  ctx.strokeStyle = stroke;
  ctx.strokeText(text, VIEW.width / 2, y);
  ctx.fillStyle = color;
  ctx.fillText(text, VIEW.width / 2, y);
}

export function drawOverlay(ctx, state, screen) {
  if (screen === 'play') return;
  ctx.fillStyle = 'rgba(24,20,34,0.72)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  if (screen === 'title') {
    big(ctx, 'HEATLINE', 244, 96, GOLD);
    big(ctx, 'PALM CAY', 316, 52, CREAM);
    label(ctx, 'A sun-bleached coastal city. Five jobs. Five stars. One way out.', VIEW.width / 2, 364, 19, CREAM, 'center', 600);
    panel(ctx, 360, 396, 560, 142);
    const lines = [
      'WASD / ARROWS   walk or drive      E   steal, enter, accept job',
      'MOUSE + CLICK   aim and fire       F   taxi fare (in a cab)',
      'SPACE   handbrake                 P pause    M mute    R respawn',
    ];
    lines.forEach((line, i) => label(ctx, line, VIEW.width / 2, 430 + i * 34, 17, CREAM, 'center', 600));
    big(ctx, 'PRESS ENTER TO START', 598, 28, GOLD);
    label(ctx, 'Progress saves automatically in this browser', VIEW.width / 2, 640, 15, 'rgba(255,244,219,0.7)', 'center', 600);
  } else if (screen === 'paused') {
    big(ctx, 'PAUSED', 320, 84, GOLD);
    label(ctx, 'P / ENTER  resume        M  mute', VIEW.width / 2, 384, 22, CREAM, 'center', 700);
    label(ctx, `Jobs ${state.stats.jobs}/5   Packages ${state.packagesTaken.length}/${PACKAGE_COUNT}   Fares ${state.stats.fares}`, VIEW.width / 2, 424, 18, GOLD, 'center', 700);
  } else if (screen === 'wasted' || screen === 'busted') {
    const busted = screen === 'busted';
    big(ctx, busted ? 'BUSTED' : 'WASTED', 320, 100, busted ? '#8fd8f0' : '#e9564f');
    label(ctx, busted ? 'The city got its pound of flesh. You lost $220.' : 'The pavement remembers. You lost $0 but learned a lesson.',
      VIEW.width / 2, 380, 20, CREAM, 'center', 600);
    big(ctx, 'PRESS ENTER TO RESPAWN', 462, 28, GOLD);
  }
}
