# HEATLINE: Palm Cay

[![make.fun GTA 6 bounty](https://make.fun/badge/gta6-01.svg)](https://make.fun/c/gta6-01?ref=1n20pv53)
[![rank](https://make.fun/badge/gta6-01/0xnici/heatline-palm-cay-v2/rank.svg)](https://make.fun/c/gta6-01?ref=1n20pv53)
[![reward](https://make.fun/badge/gta6-01/0xnici/heatline-palm-cay-v2/reward.svg)](https://make.fun/c/gta6-01?ref=1n20pv53)

A complete top-down open-world crime game that runs as plain static files in a desktop browser.
Palm Cay is a sun-bleached coastal grid of five districts, shops, parks, palms, beaches and piers.
Start on foot, steal a car, run from a five-star police response, take five story jobs from three
fixers, shoot with the mouse, pick up twelve hidden packages and drive taxi fares. The city has
traffic, pedestrians, sirens, procedural Web Audio, a minimap HUD, busted and wasted respawns,
and automatic progress saving in localStorage. All art, names, vehicles and story are original.

## Play

Serve `game/` with any static server (for example `node serve.ts`) and open `http://localhost:8080`.

- Enter — start, resume, or respawn
- WASD / arrows — walk or drive; Shift — run
- E — steal a car, enter/exit, accept a job from a fixer
- Mouse + left click — aim and fire on foot
- F — start or finish a taxi fare while in a cab
- Space — handbrake
- P / Escape — pause, M — mute, R — respawn

Press Enter at the title screen. Follow the gold objective marker and talk to the fixers; the
first job starts in Marina Row, just north of where you spawn.

## Build and capture

`main.ts` (Node 22, standard library only) copies `game/` and `screenshots/` into the output
directory and writes `dossier.json` with the kit's `buildDossier`:

    MAKEFUN_OUTPUT_DIR=out node main.ts

`tools/capture.mjs` (Node built-ins only) re-renders the four deterministic scenes from `shots.json`
in headless Chrome through the DevTools protocol:

    node tools/capture.mjs

The design choices behind the look are in `CONCEPTS.md`.
