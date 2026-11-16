import { test, expect } from "@playwright/test";
import { writeFileSync, readFileSync } from "node:fs";
// Deliberately executed in the production browser, not a Worker mock.
test("production default 50v1, controls, immutable config, mobile and 200 entities", async ({
  page,
  browser,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/?diagnostics=1");
  await expect(page.locator("canvas")).toBeVisible();
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForTimeout(1300);
  await page.getByRole("button", { name: "Ⅱ 일시정지", exact: true }).click();
  const time = await page.getByTestId("time").textContent();
  await page.waitForTimeout(400);
  expect(await page.getByTestId("time").textContent()).toBe(time);
  await page.getByRole("button", { name: "4×", exact: true }).click();
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForTimeout(2500);
  await page.screenshot({
    path: "evidence/desktop-default.png",
    fullPage: true,
  });
  await page.getByLabel("A 인원", { exact: true }).fill("100");
  await page.getByLabel("B 인원", { exact: true }).fill("100");
  await expect(page.locator(".score.A small").first()).toContainText("50");
  await page
    .getByRole("button", { name: "이 설정으로 시작 · 같은 시드" })
    .click();
  await page.waitForTimeout(2500);
  await expect(page.locator(".score.A small").first()).toContainText("100");
  await page.screenshot({ path: "evidence/desktop-200.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: "evidence/mobile-390.png", fullPage: true });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await expect(page.locator("canvas")).toBeVisible();
  expect(errors).toEqual([]);
  writeFileSync(
    "evidence/browser-environment.json",
    JSON.stringify(
      {
        browser: browser.version(),
        viewport: "1280x1000 and 390x844",
        physicalDevice: false,
        errors,
      },
      null,
      2,
    ),
  );
});
test("real Worker every-tick parity across 100 seeds; default 100-run completes", async ({
  page,
}) => {
  await page.goto("/?diagnostics=1");
  await page.waitForFunction(() => !!(window as any).arenaDiagnostics);
  const results = await page.evaluate(async () => {
    const d = (window as any).arenaDiagnostics;
    const config = {
      A: { count: 1, stats: [7, 7, 9, 8, 6, 3] },
      B: { count: 1, stats: [7, 7, 9, 8, 6, 3] },
    };
    const before = performance.now();
    const rows: any[] = await new Promise((resolve, reject) => {
      const w = d.worker();
      w.onmessage = (e: MessageEvent) => {
        if (e.data.status === "complete") {
          w.terminate();
          resolve(e.data.results);
        }
        if (e.data.status === "error") reject(e.data.error);
      };
      w.onerror = reject;
      w.postMessage({
        type: "start",
        jobId: 41,
        config,
        seed: 0,
        total: 100,
        trace: true,
      });
    });
    let ticks = 0;
    for (const r of rows) {
      const s = d.createBattle(config, r.seed);
      for (const expected of r.hashes) {
        d.step(s);
        if (d.stateHash(s) !== expected)
          throw Error(`Parity divergence trial ${r.trialIndex} tick ${s.tick}`);
        ticks++;
      }
      if (d.stateHash(s) !== r.stateHash) throw Error("Final mismatch");
    }
    return {
      trials: rows.length,
      ticks,
      elapsedMs: performance.now() - before,
    };
  });
  expect(results.trials).toBe(100);
  writeFileSync(
    "evidence/worker-parity.json",
    JSON.stringify(results, null, 2),
  );
  await page
    .getByRole("button", { name: "100회 실험 시작", exact: true })
    .click();
  await expect(page.getByTestId("batch-status")).toContainText(
    "100/100 · 완료",
    { timeout: 180000 },
  );
  const downloading = page.waitForEvent("download");
  await page.getByRole("button", { name: "회차별 결과 JSON 저장" }).click();
  const downloaded = await downloading;
  await downloaded.saveAs("evidence/default-batch-100.json");
  const saved = JSON.parse(
    readFileSync("evidence/default-batch-100.json", "utf8"),
  );
  expect(saved.results.length).toBe(100);
  expect(saved.statistics.N).toBe(100);
  await page.screenshot({
    path: "evidence/batch-complete.png",
    fullPage: true,
  });
});
test("Worker pause ACK stable, resume, cancel partial accounting and storage denial recovery", async ({
  page,
}) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      get() {
        throw new DOMException("blocked", "SecurityError");
      },
    });
  });
  await page.goto("/?diagnostics=1");
  await expect(page.getByRole("status")).toContainText("기본값");
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForTimeout(400);
  expect(await page.getByTestId("time").textContent()).not.toContain("0.0 ");
  await page.waitForFunction(() => !!(window as any).arenaDiagnostics);
  const result = await page.evaluate(async () => {
    const d = (window as any).arenaDiagnostics,
      w = d.worker();
    let pausedAt = 0,
      ackMs = 0,
      requested = 0;
    return await new Promise<any>((resolve, reject) => {
      w.onerror = reject;
      w.onmessage = (e: MessageEvent) => {
        const m = e.data;
        if (m.status === "running" && !requested) {
          requested = performance.now();
          w.postMessage({ type: "pause", jobId: 9 });
        } else if (m.status === "paused") {
          ackMs = performance.now() - requested;
          pausedAt = m.results.length;
          setTimeout(() => w.postMessage({ type: "resume", jobId: 9 }), 100);
        } else if (m.status === "running" && requested) {
          w.postMessage({ type: "cancel", jobId: 9 });
        } else if (m.status === "canceled") {
          w.terminate();
          resolve({ ackMs, pausedAt, ...m });
        }
      };
      w.postMessage({
        type: "start",
        jobId: 9,
        config: {
          A: { ...d.DEFAULT.A, count: 100 },
          B: { ...d.DEFAULT.B, count: 100 },
        },
        seed: 0,
        total: 100,
      });
    });
  });
  expect(result.status).toBe("canceled");
  expect(result.results.length + result.canceled + result.unstarted).toBe(100);
  writeFileSync(
    "evidence/worker-controls.json",
    JSON.stringify(result, null, 2),
  );
});
test("measure 200-unit engine crowd error and browser timings", async ({
  page,
}) => {
  await page.goto("/?diagnostics=1");
  await page.waitForFunction(() => !!(window as any).arenaDiagnostics);
  const measurements = await page.evaluate(() => {
    const d = (window as any).arenaDiagnostics;
    const out = [];
    for (const count of [1, 50, 100]) {
      const s = d.createBattle(
        {
          A: { ...d.DEFAULT.A, count },
          B: { ...d.DEFAULT.B, count: count === 50 ? 1 : count },
        },
        20261116,
      );
      const times: number[] = [];
      let maxPen = 0;
      for (let i = 0; i < 900 && !s.outcome; i++) {
        const t = performance.now();
        d.step(s);
        times.push(performance.now() - t);
        if (i % 30 === 0) {
          const live = s.units.filter((u: any) => u.hp > 0);
          for (const a of live)
            for (const b of live)
              if (a.id < b.id)
                maxPen = Math.max(
                  maxPen,
                  16 - Math.hypot(a.x - b.x, a.y - b.y) / 256,
                );
        }
      }
      times.sort((a, b) => a - b);
      out.push({
        entities: count + (count === 50 ? 1 : count),
        ticks: s.tick,
        outcome: s.outcome,
        tickP50: times[Math.floor(times.length * 0.5)],
        tickP95: times[Math.floor(times.length * 0.95)],
        maxSampledPenetrationPx: maxPen,
      });
    }
    return out;
  });
  writeFileSync(
    "evidence/engine-browser-metrics.json",
    JSON.stringify(measurements, null, 2),
  );
  expect(measurements.every((m) => Number.isFinite(m.tickP95))).toBe(true);
  expect(measurements.every((m) => m.maxSampledPenetrationPx <= 0.5)).toBe(
    true,
  );
});
test("real renderer pause/speed changes match exact engine state; maximum-size Worker finishes identically", async ({
  page,
}) => {
  await page.goto("/?diagnostics=1");
  await page.waitForFunction(
    () => !!(window as any).arenaDiagnostics?.snapshot,
  );
  const comparisons = [];
  for (const speed of [1, 2, 4]) {
    await page.getByRole("button", { name: `${speed}×`, exact: true }).click();
    await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
    await page.waitForTimeout(450);
    await page.getByRole("button", { name: "Ⅱ 일시정지", exact: true }).click();
    const result = await page.evaluate(() => {
      const d = (window as any).arenaDiagnostics,
        s = d.snapshot(),
        direct = d.createBattle(s.config, s.seed);
      while (direct.tick < s.tick) d.step(direct);
      return { tick: s.tick, equal: d.stateHash(s) === d.stateHash(direct) };
    });
    expect(result.equal).toBe(true);
    comparisons.push({ speed, ...result });
  }
  const maximum = await page.evaluate(async () => {
    const d = (window as any).arenaDiagnostics,
      c = {
        A: { ...d.DEFAULT.A, count: 100 },
        B: { ...d.DEFAULT.B, count: 100 },
      };
    const start = performance.now();
    const r: any = await new Promise((resolve, reject) => {
      const w = d.worker();
      w.onmessage = (e: MessageEvent) => {
        if (e.data.status === "complete") {
          resolve(e.data.results[0]);
          w.terminate();
        }
        if (e.data.status === "error") reject(e.data.error);
      };
      w.onerror = reject;
      w.postMessage({
        type: "start",
        jobId: 78,
        config: c,
        seed: 20261116,
        total: 1,
        trace: true,
      });
    });
    const s = d.createBattle(c, r.seed);
    for (const h of r.hashes) {
      d.step(s);
      if (d.stateHash(s) !== h) throw Error(`200-unit mismatch tick ${s.tick}`);
    }
    return {
      tick: s.tick,
      outcome: s.outcome,
      hash: d.stateHash(s),
      elapsedMs: performance.now() - start,
    };
  });
  expect(maximum.outcome).not.toBeNull();
  writeFileSync(
    "evidence/renderer-and-200-parity.json",
    JSON.stringify({ comparisons, maximum }, null, 2),
  );
});
test("Worker errors are explicit and visibility pause preserves manual intent", async ({
  page,
}) => {
  await page.goto("/?diagnostics=1");
  await page.waitForFunction(
    () => !!(window as any).arenaDiagnostics?.snapshot,
  );
  const result = await page.evaluate(async () => {
    const d = (window as any).arenaDiagnostics,
      w = d.worker();
    return await new Promise<any>((resolve) => {
      w.onmessage = (e: MessageEvent) => {
        if (e.data.status === "error") {
          w.terminate();
          resolve(e.data);
        }
      };
      w.postMessage({
        type: "start",
        jobId: 44,
        config: { A: { count: 0, stats: [1, 1, 1, 1, 1, 1] }, B: d.DEFAULT.B },
        seed: 0,
        total: 100,
      });
    });
  });
  expect(result.results.length + result.errors + result.unstarted).toBe(100);
  expect(result.status).toBe("error");
  await page.getByRole("button", { name: "▶ 전투 시작 / 재개" }).click();
  await page.waitForTimeout(150);
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(150);
  const hiddenTick = await page.evaluate(
    () => (window as any).arenaDiagnostics.snapshot().tick,
  );
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).arenaDiagnostics.snapshot().tick),
  ).toBe(hiddenTick);
  await page.getByRole("button", { name: "Ⅱ 일시정지", exact: true }).click();
  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      value: false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(200);
  expect(
    await page.evaluate(() => (window as any).arenaDiagnostics.snapshot().tick),
  ).toBe(hiddenTick);
});
