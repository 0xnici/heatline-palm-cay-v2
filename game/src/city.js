// The static half of the world: a coastal grid of roads, blocks, pastel buildings, shops,
// parks, palms, lamps, billboards, a beach, three piers and twelve hidden packages. This module
// only builds data; render.js paints it and the other modules move things through it.
import { WORLD, ROOF_COLORS, SHOP_NAMES, BILLBOARDS, PALETTE } from './config.js';
import { pick, range } from './random.js';

const PARK_CELLS = new Set(['2,1', '4,8', '7,4', '9,10', '12,2', '14,7', '1,5', '16,9']);
const PACKAGE_SPOTS = [
  [470, 470], [2720, 1520], [3360, 2380], [1120, 3210], [1760, 3690], [2860, 3700],
  [3690, 3340], [4640, 1580], [5280, 2730], [WORLD.waterX - 140, WORLD.piers[0] + 44],
  [WORLD.waterX + 150, WORLD.piers[1] + 44], [5460, 3900],
];

/** Build the whole city from one seed. Deterministic: no Math.random and no time. */
export function createCity(random) {
  const roadsX = [];
  const roadsY = [];
  for (let x = 160; x < WORLD.beachX; x += WORLD.grid) roadsX.push(x);
  for (let y = 160; y < WORLD.height; y += WORLD.grid) roadsY.push(y);

  const buildings = [];
  const shops = [];
  const parks = [];
  const palms = [];
  const lamps = [];
  const billboards = [];
  let shopIndex = 0;
  let billboardIndex = 0;

  for (let ix = 0; ix < roadsX.length - 1; ix++) {
    for (let iy = 0; iy < roadsY.length - 1; iy++) {
      const bx = roadsX[ix] + WORLD.roadHalf + 12;
      const by = roadsY[iy] + WORLD.roadHalf + 12;
      const bw = roadsX[ix + 1] - roadsX[ix] - 2 * (WORLD.roadHalf + 12);
      const bh = roadsY[iy + 1] - roadsY[iy] - 2 * (WORLD.roadHalf + 12);
      const key = `${ix},${iy}`;

      if (PARK_CELLS.has(key)) {
        parks.push({ x: bx, y: by, w: bw, h: bh, pond: random() < 0.5 });
        const count = 4 + Math.floor(random() * 3);
        for (let i = 0; i < count; i++) {
          palms.push({ x: bx + range(random, 18, bw - 18), y: by + range(random, 18, bh - 18), size: range(random, 0.9, 1.3) });
        }
        continue;
      }

      const pieces = random() < 0.42
        ? [[bx, by, bw / 2 - 4, bh], [bx + bw / 2 + 4, by, bw / 2 - 4, bh]]
        : random() < 0.22
          ? [[bx, by, bw, bh / 2 - 4], [bx, by + bh / 2 + 4, bw, bh / 2 - 4]]
          : [[bx, by, bw, bh]];

      for (const [x, y, w, h] of pieces) {
        if (w < 28 || h < 28) continue;
        const roof = pick(random, ROOF_COLORS);
        const skylights = [];
        const cols = Math.max(1, Math.floor(w / 46));
        const rows = Math.max(1, Math.floor(h / 46));
        for (let c = 0; c < cols; c++) {
          for (let r = 0; r < rows; r++) {
            if (random() > 0.52) continue;
            skylights.push({
              x: x + 12 + c * (w - 24) / cols,
              y: y + 12 + r * (h - 24) / rows,
              w: Math.max(8, (w - 24) / cols - 12),
              h: Math.max(8, (h - 24) / rows - 12),
            });
          }
        }
        const acCount = w > 110 ? 2 : 1;
        const ac = [];
        for (let i = 0; i < acCount; i++) ac.push({ x: x + 20 + i * 54, y: y + h - 34 });
        const awningSide = random() < 0.5 ? 'north' : 'south';
        const building = {
          x, y, w, h, roof, skylights, ac, awningSide,
          awning: { x: x + 10, y: awningSide === 'north' ? y - 12 : y + h - 2, w: w - 20, h: 14, side: awningSide },
          storefront: random() < 0.55,
          sign: null,
          billboard: null,
          shadow: 12 + random() * 10,
        };
        if (building.storefront && shopIndex < SHOP_NAMES.length && random() < 0.55) {
          building.sign = SHOP_NAMES[shopIndex++ % SHOP_NAMES.length];
          shops.push({ name: building.sign, x: x + w / 2, y: y + (awningSide === 'north' ? -6 : h + 6) });
        }
        if (billboardIndex < BILLBOARDS.length && random() < 0.08) {
          building.billboard = BILLBOARDS[billboardIndex++ % BILLBOARDS.length];
          billboards.push({ text: building.billboard, x: x + w / 2, y: y + h / 2 });
        }
        buildings.push(building);
      }
    }
  }

  // Palms and lamps line the avenues. The coastal avenue gets the densest planting.
  for (const rx of roadsX) {
    for (let y = 200; y < WORLD.height - 100; y += WORLD.grid) {
      for (const side of [-1, 1]) {
        if (random() < 0.22) continue;
        palms.push({ x: rx + side * (WORLD.roadHalf + 18), y: y + range(random, -12, 12), size: range(random, 0.85, 1.25) });
      }
    }
  }
  for (const ry of roadsY) {
    for (let x = 200; x < WORLD.beachX - 100; x += WORLD.grid * 2) {
      if (random() < 0.35) continue;
      palms.push({ x: x + range(random, -10, 10), y: ry + WORLD.roadHalf + 18, size: range(random, 0.8, 1.15) });
    }
  }
  for (let i = 0; i < roadsX.length; i += 2) {
    for (let j = 0; j < roadsY.length; j += 2) {
      lamps.push({ x: roadsX[i] + WORLD.roadHalf + 8, y: roadsY[j] - WORLD.roadHalf - 8 });
    }
  }
  for (let y = 300; y < WORLD.height; y += 520) {
    palms.push({ x: WORLD.beachX + range(random, 30, 250), y, size: range(random, 1.0, 1.5) });
  }

  const piers = WORLD.piers.map((y) => ({
    x: WORLD.waterX - 40, y, w: 340, h: 110,
    boats: [{ x: WORLD.waterX + 230, y: y - 90, color: '#f4e5c4' }, { x: WORLD.waterX + 120, y: y + 150, color: '#d88979' }],
  }));

  return {
    seed: 0, roadsX, roadsY, buildings, shops, parks, palms, lamps, billboards, piers,
    packages: PACKAGE_SPOTS.map(([x, y], i) => ({ id: i, x, y, taken: false })),
    beachX: WORLD.beachX, waterX: WORLD.waterX, width: WORLD.width, height: WORLD.height,
  };
}

/** Which road a point sits on, for spawning traffic and walkers. */
export function roadAt(city, x, y, tol = WORLD.roadHalf + 4) {
  for (const rx of city.roadsX) if (Math.abs(x - rx) < tol) return { axis: 'v', center: rx };
  for (const ry of city.roadsY) if (Math.abs(y - ry) < tol) return { axis: 'h', center: ry };
  return null;
}

/** Pull a position onto the nearest road centre, used for respawns and police spawns. */
export function snapToRoad(city, x, y) {
  let best = null;
  let bestD = Infinity;
  for (const rx of city.roadsX) {
    const d = Math.abs(x - rx);
    if (d < bestD) { bestD = d; best = { x: rx, y }; }
  }
  for (const ry of city.roadsY) {
    const d = Math.abs(y - ry);
    if (d < bestD) { bestD = d; best = { x, y: ry }; }
  }
  return best ?? { x, y };
}

/** The building whose footprint contains a point (with a small margin), for driving collisions. */
export function buildingAt(city, x, y, margin = 6) {
  for (const b of city.buildings) {
    if (x > b.x - margin && x < b.x + b.w + margin && y > b.y - margin && y < b.y + b.h + margin) return b;
  }
  return null;
}

/** Where a pedestrian's sidewalk sits: just outside the road ribbon. */
export function sidewalkPoint(random, city) {
  const rx = pick(random, city.roadsX);
  const ry = pick(random, city.roadsY);
  const side = random() < 0.5 ? -1 : 1;
  if (random() < 0.5) return { x: rx + side * (WORLD.roadHalf + 16), y: ry + range(random, -100, 100) };
  return { x: rx + range(random, -100, 100), y: ry + side * (WORLD.roadHalf + 16) };
}

export const COLORS = PALETTE;
