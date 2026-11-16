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
