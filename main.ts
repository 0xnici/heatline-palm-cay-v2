// HEATLINE: Palm Cay hands itself in. Node 22, standard library only, no build step and no network:
// the playable game is the plain static tree in game/, and this program copies it together with
// the four browser-rendered screenshots into the output directory, then writes dossier.json using
// the kit's unchanged buildDossier. MAKEFUN_OUTPUT_DIR stands in for /output outside the grader.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// Check the source tree before copying: a missing page or a bad shot count would fail the gate
// anyway, and failing here says why. No time, locale or environment value enters the dossier.
if (!existsSync(join(here, 'game', 'index.html'))) throw new Error('game/index.html is missing');
const shotDir = join(here, 'screenshots');
if (existsSync(shotDir)) {
  const names = readdirSync(shotDir).filter((name: string) => !name.startsWith('.'));
  if (names.length < 3 || names.length > 4) throw new Error(`screenshots/ holds ${names.length} images; the bounty wants 3 or 4`);
  for (const name of names) {
    const size = statSync(join(shotDir, name)).size;
    if (size > 262144) throw new Error(`screenshots/${name} is ${size} bytes, over the 256 KiB cap`);
  }
}

// Never delete the output directory: the grader may hand us a directory that already holds files.
mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// The starter's caps: the scorer's own gate numbers, passed so this program refuses what it would.
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
