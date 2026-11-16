# 승현 VS 승현 — Pixel Arena

Original unarmed pixel-art auto-battler, built with React, TypeScript and Phaser. A wears square glasses and a sky-blue/white school shirt; B wears a fitted black tee. All gameplay runs locally in your browser, including the 100-trial Web Worker. No photos, accounts or server required.

## Run

```sh
npm ci
npm run dev
```

## Verify

```sh
npm run typecheck
npm test
npm run build
mkdir -p evidence
PLAYWRIGHT_BROWSERS_PATH=./.playwright-browsers npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH=./.playwright-browsers npm run test:e2e
```

## Static deployment

Build: `npm ci && npm run build`
Publish directory: `dist`

## Limits

Mobile viewport testing is not physical-device certification. The Phaser bundle is about 1.7 MB minified. No multiplayer or sound. Identical-version deterministic results are tested in Chromium; cross-engine replay equality and long thermal soaks are not certified. 100 trials are a game simulation sample, not real-world odds.

## v1.1 rules

Teams are 14세 승현 and 35세 승현; arena sprites are 1.4x with unchanged 8px collision radius. Only 35세 승현 has a telegraphed sweeping kick: 0.4s windup, 4s cooldown from activation, 24 stamina, 32px center range, locked forward 120-degree arc, nearest four unobstructed enemies. Contact does 80% normal base damage, without crit, and up to 10px knockback. Normal landed critical chance stays 0.5%, multiplier 1.5x. Both attacks resolve simultaneously in the same deterministic engine/Worker. The crowd separation solver now allows 96 identical iterations for the larger impulse. Older-version seeds do not promise identical outcomes.
