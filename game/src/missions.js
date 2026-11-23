// Five story jobs from three fixers, the dialogue they speak, objective markers, repeatable taxi
// fares and the package hunt. This is the game's progression layer; it writes to shared state.
import { SHOP_NAMES, PACKAGE_COUNT } from './config.js';
import { addWanted } from './police.js';
import { pick } from './random.js';

export const FIXERS = [
  { id: 'vega', name: 'Marisol Vega', role: 'Harbor fixer', x: 1160, y: 760, color: '#f4a0a8' },
  { id: 'halloway', name: 'Dex Halloway', role: 'Old Palm mechanic', x: 1480, y: 3100, color: '#8fe0d0' },
  { id: 'reyes', name: 'Chief Anya Reyes', role: 'Glass Quarter contact', x: 3400, y: 3400, color: '#ffd27d' },
];

export const JOBS = [
  {
    id: 1, fixer: 'vega', title: 'HARBOR LIGHTS', type: 'deliver', reward: 900,
    hint: 'Steal a ride, lose the dock, reach the north pier.',
    target: { x: 6020, y: 860, label: 'NORTH PIER', type: 'dropoff' },
    brief: [
      'Marisol: The harbor lights are a countdown. I need a car at the north pier in four minutes.',
      'Marisol: Take anything with a engine. Just don\'t bring the heat with you.',
      'You: Then why are you telling me about the countdown?',
    ],
    done: ['Marisol: Right on time. Nobody saw a thing. Your cut\'s in the usual place.'],
  },
  {
    id: 2, fixer: 'halloway', title: 'SUNSET FARE', type: 'fare', reward: 1200,
    hint: 'Bring a yellow cab to the Old Palm stand, then run the fare to Tidewater.',
    pickup: { x: 1600, y: 3110, label: 'CAB STAND', type: 'pickup' },
    target: { x: 5280, y: 2320, label: 'TIDEWATER DROP', type: 'dropoff' },
    brief: [
      'Dex: A cab, a suitcase and a woman who pays in cash. You in?',
      'You: That sounds like the start of a bad story.',
      'Dex: It\'s the start of a good fare. Get the yellow cab to my stand first.',
    ],
    done: ['Dex: She never asked for your name. That\'s how you know it went well.'],
  },
  {
    id: 3, fixer: 'vega', title: 'LOOSE CHANGE', type: 'packages', count: 3, reward: 1400,
    hint: 'Recover three marked supply crates scattered around Palm Cay.',
    brief: [
      'Marisol: Three crates went missing from my dock. They have a habit of turning up in parks.',
      'Marisol: You\'ll know them when you see them. Gold glow, little latch.',
      'You: And if someone else finds them first?',
    ],
    done: ['Marisol: Three for three. You\'re useful after all.'],
  },
  {
    id: 4, fixer: 'halloway', title: 'COOL THE ENGINE', type: 'loseheat', reward: 1800,
    hint: 'You are hot. Lose the stars and disappear.',
    brief: [
      'Dex: Word is you lit up half the avenue. The whole city is looking for you.',
      'Dex: Lose the heat and come back when the stars are gone. I mean it.',
      'You: I\'ll take the long way.',
    ],
    done: ['Dex: Clean as a fresh coat of wax. Nobody saw nothing.'],
  },
  {
    id: 5, fixer: 'reyes', title: 'TIDEWATER TAKEDOWN', type: 'eliminate', reward: 3500,
    hint: 'Three rivals at the beach. Take them out and get off the sand.',
    target: { x: 5480, y: 2240, label: 'RIVAL CREW', type: 'target' },
    brief: [
      'Reyes: Three of them, down by the water. They move our cargo at sunrise.',
      'Reyes: I am not asking you to make a statement. I am asking you to make a problem stop.',
      'You: Understood.',
    ],
    done: ['Reyes: The harbor belongs to the people who live here now. Good work.'],
  },
];

export function createMissionState() {
  return {
    index: 0, stage: 'idle', active: false, done: false,
    marker: null, progress: 0, needHeat: false, targets: [],
    dialogue: null, queue: [], queueT: 0, flash: 0,
  };
}

export function currentJob(state) {
  return state.mission.done ? null : JOBS[state.mission.index] ?? null;
}

export function say(state, speaker, lines) {
  state.mission.queue = lines.map((text) => ({ speaker, text }));
  state.mission.queueT = 0;
  state.mission.dialogue = state.mission.queue.shift() ?? null;
}

function finish(state) {
  const job = currentJob(state);
  if (!job) return;
  state.money += job.reward;
  state.stats.jobs += 1;
  state.message = { text: `JOB COMPLETE  +$${job.reward}`, ttl: 3 };
  say(state, job.fixer === 'vega' ? 'Marisol' : job.fixer === 'halloway' ? 'Dex' : 'Anya', job.done);
  state.mission.index += 1;
  state.mission.active = false;
  state.mission.targets = [];
  if (state.mission.index >= JOBS.length) {
    state.mission.done = true;
    state.mission.marker = null;
    state.message = { text: 'ALL FIVE JOBS COMPLETE', ttl: 5 };
  } else {
    state.mission.stage = 'idle';
    state.mission.marker = fixerMarker(state);
  }
}

function fixerMarker(state) {
  const job = currentJob(state);
  if (!job) return null;
  const fixer = FIXERS.find((f) => f.id === job.fixer);
  return { x: fixer.x, y: fixer.y, label: `${fixer.name.toUpperCase()} · JOB`, type: 'fixer' };
}

/** E at a fixer starts the next job. Returns true when a job was taken. */
export function acceptJob(state) {
  const job = currentJob(state);
  if (!job || state.mission.active || state.mission.done) return false;
  const fixer = FIXERS.find((f) => f.id === job.fixer);
  if (Math.hypot(state.player.x - fixer.x, state.player.y - fixer.y) > 110) return false;
  const m = state.mission;
  m.active = true;
  m.stage = job.type === 'fare' ? 'pickup' : 'active';
  m.progress = 0;
  m.targets = [];
  say(state, fixer.name.split(' ')[0], job.brief);
  if (job.type === 'loseheat') {
    m.needHeat = true;
    addWanted(state, 3);
  }
  if (job.type === 'eliminate') {
    m.targets = [
      { x: 5360, y: 2120, hp: 80, dead: false },
      { x: 5480, y: 2300, hp: 80, dead: false },
      { x: 5590, y: 2440, hp: 80, dead: false },
    ];
  }
  m.marker = job.type === 'fare' ? { ...job.pickup } : { ...job.target };
  state.message = { text: `JOB ${job.id} · ${job.title}`, ttl: 3 };
  return true;
}

/** Advance dialogue, markers and any completion condition that is true this step. */
export function updateMissions(state, dt) {
  const m = state.mission;
  if (m.dialogue) {
    m.queueT += dt;
    if (m.queueT > 4.6) {
      m.queueT = 0;
      m.dialogue = m.queue.shift() ?? null;
    }
  }
  if (m.flash > 0) m.flash -= dt;
  if (m.done) return;
  const job = currentJob(state);
  if (!job) return;

  if (!m.active) {
    m.marker = fixerMarker(state);
    return;
  }

  if (job.type === 'deliver' && state.mode === 'car') {
    const t = job.target;
    if (Math.hypot(state.player.x - t.x, state.player.y - t.y) < 120) finish(state);
  } else if (job.type === 'fare') {
    const goal = m.stage === 'pickup' ? job.pickup : job.target;
    if (state.mode === 'car' && state.playerCar?.id === 'taxi' && Math.hypot(state.player.x - goal.x, state.player.y - goal.y) < 120) {
      if (m.stage === 'pickup') {
        m.stage = 'dropoff';
        m.marker = { ...job.target };
        say(state, 'Dex', ['Dex: Got her. Tidewater, and don\'t take the scenic route.']);
      } else finish(state);
    }
  } else if (job.type === 'packages') {
    m.progress = Math.min(job.count, state.packagesTaken.length);
    if (m.progress >= job.count) finish(state);
  } else if (job.type === 'loseheat') {
    if (state.player.wanted >= 2) m.needHeat = false;
    if (!m.needHeat && state.player.wanted === 0) finish(state);
  } else if (job.type === 'eliminate') {
    if (m.targets.every((t) => t.dead)) finish(state);
  }
  if (m.active) m.marker = job.type === 'fare' && m.stage === 'dropoff' ? { ...job.target } : job.type === 'packages'
    ? { x: 2880, y: 3680, label: 'SUPPLY CRATES', type: 'package' }
    : m.marker;
}

/** Start or finish a repeatable taxi fare when F is pressed inside a cab. */
export function toggleTaxiFare(state, random) {
  if (state.mode !== 'car' || state.playerCar?.id !== 'taxi') return false;
  if (state.fare?.active) {
    if (Math.hypot(state.player.x - state.fare.x, state.player.y - state.fare.y) < 130) {
      state.money += state.fare.pay;
      state.message = { text: `FARE PAID  +$${state.fare.pay}`, ttl: 2.6 };
      state.stats.fares += 1;
      state.fare = null;
      return true;
    }
    return false;
  }
  const name = pick(random, SHOP_NAMES);
  const x = 1200 + Math.floor(random() * 10) * 320;
  const y = 800 + Math.floor(random() * 8) * 320;
  state.fare = { x, y, label: `${name} · FARE`, type: 'fare', pay: 110 + Math.floor(random() * 140) };
  state.message = { text: 'FARE ON THE METER', ttl: 2.2 };
  return true;
}

export const TOTAL_PACKAGES = PACKAGE_COUNT;
