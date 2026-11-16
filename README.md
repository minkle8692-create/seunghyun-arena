# 승현 아레나 — Pixel Arena

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

Static output: `dist/`. Live game: https://seunghyun-arena.onrender.com . `npm run build` and output directory `dist` suffice for a static host. There are no required secrets or environment variables.

## Play

Default A50 `[10,10,4,6,8,8]`, B1 `[7,7,9,8,6,3]` in HP/stamina/skill/power/speed/defense order. Each team 1–100, stats 1–10. Change the draft, then choose “이 설정으로 시작” to apply with the current seed. “같은 시드 재시작” replays the **running** configuration. “새 시드 전투” starts the draft using a newly generated seed. Config is frozen after launch. Draft and last run have separate versioned localStorage keys. Failed reads/writes recover with visible notices.

Win = opponent eliminated and own survivors. Both eliminated on the same tick = draw. Both alive at 180 simulation seconds = unresolved timeout. No HP/score winner, no early heuristic stalemate. A last-tick KO takes priority over timeout.

Batch uses the current draft and the displayed seed as master seed, pauses viewing, then executes 100 fresh trials sequentially in a real Worker. Pause/resume ACK occurs at completed-tick boundaries; cancel retains finished rows and classifies the interrupted row separately. Every row includes full config, seed, rules version, state hash, outcome/reason, counters, pending attacks, alive/HP totals. Export JSON to retain results. No batch reload recovery. Percentages use wins + draw + timeout; zero denominator is unavailable, not 0%.

## Rules (arena-2.0.0)

- Fixed30Hz deterministic shared TS simulation/Worker, body radius8px, simultaneous damage/KO; surviving team only wins. Timeout is unresolved.
- Base sliders1..10, youth/mage input multiplier1, adult multiplier5, once at spawn. Default B effective35/35/45/40/30/15. No hidden age bonuses.
- HP55+9H, energy45+7E; power, skill, movement, recovery and defense all consume effective inputs. Hit probability clamped5..95%; normal landed crit fixed0.5%, damage1.5x.
- Youth normal damage = floor((rounded base centiHP damage*13+5)/10). Power unchanged. Adult normal delay = ceil(base delay*2/3), min4ticks, windup4ticks. Base delay includes fatigue, uses42-2S up to10 and220/S above10 (min6). No extra multiplier on derived stats.
- Extended defense multiplier is floor(65000/(100+7*(D-10)))/1000 above10, otherwise1-.035D. All damage positive. Full formula in sim.ts.
- Adult radial kick:360degrees,44px center range, six closest unoccluded enemies, preparation12ticks/cooldown120/cost24;80% base normal damage, no critical. Bodies block attack lines.
- Kick recoil target44px over12ticks (0.4s), plus6ticks recovery. AI movement/attacks disabled for18ticks, pending future attacks interrupted AFTER simultaneous resolution. Walls clamp, crowded-body separation can reduce/redirect movement; never claim44px net through walls/crowds. Normal hits do not overwrite an active kick recoil. Ordinary knockback capped4px.
- Adaptive up-to256-iteration Jacobi body separation (early exit below1/32px) with spatial partition, fixed-point movement. Same seed/config/rules reproduce results; version2 changes prior state hashes. Export schema4 includes explicit combat modifiers/effective inputs; stored schema2 adds character identity. Old schema1 maps A to youth and B to adult, preserving base inputs.
- Youth and mage visual1.05/adult1.4, actual rotating body/extended-leg kick, survivor-winner tears. Reduced motion removes spin/bob; pause/reset cleans presentation. Visual scale never changes collision radius.

## Selectable characters and mage

Each team selects **14세 승현**, **35세 승현**, or **14세 동우**. Selection changes default stats but not count; press apply to start the new configuration. Buffs belong to characters, never team slots. Mirror teams use mint/coral foot rings and health bars. Same two-faction survivor rules, no third faction.

14세 동우 is an original white-clothed round mage, youth-height. Defaults `[7,8,8,6,6,5]`, multiplier1. Within76px flee, beyond108px stop fleeing (hysteresis). If continuously chased, flee18ticks before attempting a countercast. Clear target within150px: stop for24ticks and say **야심!만만**, cost18energy, cooldown75ticks from start,12tick stationary recovery. Body collisions may physically push a stationary caster. Fleeing follows walls tangentially; bodies/walls remain solid.

Bolt:210px/s fixed direction aimed at release, travel limit150px. Swept first-body collision absorbs the bolt; allies block without damage. No homing, wall bypass, or penetration. Enemy contact damage = floor(base power/defense damage × (1+.03skill)), no critical. All six base stats affect HP/energy/recovery/power/skill/movement/defense through the shared engine. Magic hit counters are separate from normal attack crit/hit rates.

Hit feedback is renderer-only: bright flash,45ms visual position hold, bounded120particles/180ms, capped1.5px/90ms camera shake. Fixed30Hz engine never pauses for visual hit-stop. Reduced motion disables shake/hold/spin; pause freezes the visual clock and reset clears it. Winner-only crying includes the mage.

## Structure

- `src/sim.ts`: createBattle / step / summarize, canonical config, RNG, grid and hash.
- `src/Arena.tsx`: Phaser rendering + wall-clock runner; render never owns combat.
- `src/batch.worker.ts`: same engine, 12ms task chunks, job IDs and control ACKs.
- `src/statistics.ts`, `src/storage.ts`: denominator rules and defensive persistence.
- `src/main.tsx`, `src/style.css`: Korean responsive controls and original art presentation.
- `tests/`: invariant tests and real production-browser integration.
- Verification artifacts are retained privately and are not bundled with the static site.

Append `?diagnostics=1` to enable the read-only engine/Worker test factory on `window.arenaDiagnostics`. It has no credentials or filesystem access. Normal pages do not load this helper.

## Seokho (arena-2.1.0)
Selectable on either team. Base stats multiply by2.5 exactly; no adult kick/speed bonus. Lock120px, telegraph1s/two knee-slaps, dash120px/s capped1s with body/wall collision; left then right0.3s apart at22px actual range. First landed signature hit crit1.5; later hit normal0.5percent crit. Recovery prone1.5s (alive, vulnerable, no movement/attacks), cooldown7s/cost30. Target KO cancels. Defaults and mage glasses/large speech bubble preserved.
