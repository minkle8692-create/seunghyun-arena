# 승현 VS 승현 — Pixel Arena

Original, non-bloody pixel auto-battler. React 19 + Vite + TypeScript + Phaser **3.90**, one authoritative pure TS engine shared by the renderer and a module Worker. No server, account, analytics, paid API, remote art or runtime network dependencies.

## Run

```sh
npm ci
npm run dev
npm test
npm run typecheck
npm run build
npm run preview
# Install Playwright into a project-local cache on a clean machine:
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" npx playwright install chromium
PLAYWRIGHT_BROWSERS_PATH="$PWD/.playwright-browsers" NO_PROXY=localhost,127.0.0.1 npm run test:e2e
```

Static output: `dist/`. Hosting/build instructions only; this implementation does not deploy or publish. Parent owns GitHub/Render. `npm run build` and output directory `dist` suffice for a static host. There are no required secrets or environment variables.

## Play

Default A50 `[10,10,4,6,8,8]`, B1 `[7,7,9,8,6,3]` in HP/stamina/skill/power/speed/defense order. Each team 1–100, stats 1–10. Change the draft, then choose “이 설정으로 시작” to apply with the current seed. “같은 시드 재시작” replays the **running** configuration. “새 시드 전투” starts the draft using a newly generated seed. Config is frozen after launch. Draft and last run have separate versioned localStorage keys. Failed reads/writes recover with visible notices.

Win = opponent eliminated and own survivors. Both eliminated on the same tick = draw. Both alive at 180 simulation seconds = unresolved timeout. No HP/score winner, no early heuristic stalemate. A last-tick KO takes priority over timeout.

Batch uses the current draft and the displayed seed as master seed, pauses viewing, then executes 100 fresh trials sequentially in a real Worker. Pause/resume ACK occurs at completed-tick boundaries; cancel retains finished rows and classifies the interrupted row separately. Every row includes full config, seed, rules version, state hash, outcome/reason, counters, pending attacks, alive/HP totals. Export JSON to retain results. No batch reload recovery. Percentages use wins + draw + timeout; zero denominator is unavailable, not 0%.

## Rules (arena-1.4.0)

- Fixed30Hz deterministic shared TS simulation/Worker, body radius8px, simultaneous damage/KO; surviving team only wins. Timeout is unresolved.
- Base sliders1..10, A input multiplier1/B multiplier5, once at spawn. Default B effective35/35/45/40/30/15. No hidden age bonuses.
- HP55+9H, energy45+7E; power, skill, movement, recovery and defense all consume effective inputs. Hit probability clamped5..95%; normal landed crit fixed0.5%, damage1.5x.
- A normal damage = floor((rounded base centiHP damage*13+5)/10). Power unchanged. B normal delay = ceil(base delay*2/3), min4ticks, windup4ticks. Base delay includes fatigue, uses42-2S up to10 and220/S above10 (min6). No extra multiplier on derived stats.
- Extended defense multiplier is floor(65000/(100+7*(D-10)))/1000 above10, otherwise1-.035D. All damage positive. Full formula in sim.ts.
- B radial kick:360degrees,44px center range, six closest unoccluded enemies, preparation12ticks/cooldown120/cost24;80% base normal damage, no critical. Bodies block attack lines.
- Kick recoil target44px over12ticks (0.4s), plus6ticks recovery. AI movement/attacks disabled for18ticks, pending future attacks interrupted AFTER simultaneous resolution. Walls clamp, crowded-body separation can reduce/redirect movement; never claim44px net through walls/crowds. Normal hits do not overwrite an active kick recoil. Ordinary knockback capped4px.
-96-iteration Jacobi body separation with spatial partition, fixed-point movement. Same seed/config/rules reproduce results; version1.4 changes previous outcomes. Export schema3 includes explicit combat modifiers and effective inputs; stored schema1 remains base stats.
- A visual1.05/B1.4, actual rotating body/extended-leg kick, survivor-winner tears. Reduced motion removes spin/bob; pause/reset cleans presentation. Visual scale never changes collision radius.

## Structure

- `src/sim.ts`: createBattle / step / summarize, canonical config, RNG, grid and hash.
- `src/Arena.tsx`: Phaser rendering + wall-clock runner; render never owns combat.
- `src/batch.worker.ts`: same engine, 12ms task chunks, job IDs and control ACKs.
- `src/statistics.ts`, `src/storage.ts`: denominator rules and defensive persistence.
- `src/main.tsx`, `src/style.css`: Korean responsive controls and original art presentation.
- `tests/`: invariant tests and real production-browser integration.
- `evidence/`, `REPORT.md`: measured results and exact validation limits.

Append `?diagnostics=1` to enable the read-only engine/Worker test factory on `window.arenaDiagnostics`. It has no credentials or filesystem access. Normal pages do not load this helper.
