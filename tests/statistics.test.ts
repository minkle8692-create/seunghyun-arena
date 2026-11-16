import { expect, it } from "vitest";
import { aggregate } from "../src/statistics";
import { DEFAULT, createBattle, summarize, type Outcome } from "../src/sim";
import { readSaved, save } from "../src/storage";
it("timeout stays in N; empty denominator stays null; pooled crit denominator", () => {
  const empty = aggregate([]);
  expect(empty.N).toBe(0);
  expect(empty.critRate).toBeNull();
  const fixture = (outcome: Outcome, hits: number, crit: number) => {
    const s = createBattle(DEFAULT, 0);
    s.outcome = outcome;
    s.counts.hit = hits;
    s.counts.crit = crit;
    s.tick = outcome === "timeout" ? 5400 : 300;
    return summarize(s);
  };
  const stats = aggregate([
    fixture("A_win", 1, 1),
    fixture("timeout", 99, 0),
    fixture("draw", 0, 0),
    fixture("B_win", 0, 0),
  ]);
  expect(stats.N).toBe(4);
  expect(stats.timeout).toBe(1);
  expect(stats.A / stats.N).toBe(0.25);
  expect(stats.critRate).toBe(0.01);
  expect(stats.resolvedMeanSeconds).toBe(10);
  expect(stats.meanSeconds).toBe(52.5);
});
it("storage corruption and denied writes safely recover", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => "{broken",
      setItem: () => {
        throw Error("denied");
      },
    },
  });
  expect(readSaved("x").error).toBeTruthy();
  expect(save("x", DEFAULT)).toContain("자동저장 불가");
});
