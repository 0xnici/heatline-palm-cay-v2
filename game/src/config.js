// Every tuning number and colour for Palm Cay. Logical screen is 1280x720; the world is a
// fixed coastal grid and the camera keeps that scale whatever the window size.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;

export const WORLD = {
  width: 6400,
  height: 4200,
  grid: 320,
  roadHalf: 48,
  beachX: 5760,
  waterX: 6080,
  piers: [820, 2020, 3220],
};

export const PALETTE = {
  pavement: '#e7d6b4',
  block: '#efe0c2',
  sidewalk: '#f7ead0',
  road: '#3f3b4a',
  roadGold: '#5a4d52',
  lane: '#f4d8a0',
  ocean: '#1e7180',
  oceanDeep: '#145763',
  foam: '#d8f4ec',
  sand: '#f2dca8',
  grass: '#88ab78',
  shadow: '#4b3346',
  ink: '#241f31',
  cream: '#fff4db',
  gold: '#ffc255',
  red: '#e04b47',
  blue: '#6fd6e8',
  pink: '#f29aa1',
};

// Five districts, drawn as faint ground labels and used by the fixers and the minimap.
export const DISTRICTS = [
  { name: 'MARINA ROW', x: 960, y: 620, color: '#b66a5a' },
  { name: 'OLD PALM', x: 1000, y: 2860, color: '#b07a63' },
  { name: 'SUNSET FLATS', x: 2880, y: 1680, color: '#9b6b78' },
  { name: 'GLASS QUARTER', x: 2880, y: 3300, color: '#5f7f91' },
  { name: 'TIDEWATER', x: 4920, y: 2280, color: '#bb8060' },
];

export const ROOF_COLORS = ['#e08c6a', '#e9bf7c', '#85b2a4', '#d9a0a0', '#a5a8c4', '#f0cf9a', '#c88f7e', '#8fb3bd'];
export const SHOP_NAMES = [
  'TIDE & TACKLE', 'SUN-UP MARKET', 'PALM LAUNDRY', 'CAFE SOL', 'BAY 9 MOTORS',
  'SALT & SAND', 'CORAL CAFE', 'HARBOR PRESS', 'LONGBOARD CO.', 'GOLDEN HOUR',
  'THE SHALLOW END', 'CAPTAIN STORE', 'DRIFT AUTO', 'FIVE & DIME', 'PIER SIDE',
];
export const BILLBOARDS = [
  'SUN-UP COLA', 'PALM CAY OR BUST', 'KEEP IT COASTAL', 'FRESH CATCH DAILY',
  'SLOW DOWN · SUNSET', 'GOOD TIMES 24/7', 'TIDEWATER TAVERN',
];

// Original vehicles: name, body colour, top speed (px/s), acceleration and steering rate.
export const CAR_TYPES = [
  { id: 'coupe', name: 'Vermilion GT', color: '#d8433f', top: 620, accel: 340, turn: 2.5 },
  { id: 'sedan', name: 'Palmetto', color: '#d9c48a', top: 500, accel: 260, turn: 2.2 },
  { id: 'truck', name: 'Sand Hauler', color: '#6f9aa3', top: 420, accel: 210, turn: 1.8 },
  { id: 'taxi', name: 'Cab Cay', color: '#f2c14e', top: 520, accel: 280, turn: 2.3 },
  { id: 'cruiser', name: 'Interceptor', color: '#e8eef2', top: 660, accel: 360, turn: 2.7 },
];

export const SAVE_KEY = 'heatline.palmcay.save.v1';
export const PACKAGE_COUNT = 12;
export const WALK_SPEED = 226;
export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
