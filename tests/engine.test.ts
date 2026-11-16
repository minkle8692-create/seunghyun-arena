import { describe, it, expect } from "vitest";
import {
  DEFAULT,
  createBattle,
  step,
  summarize,
  damage,
  hitThreshold,
  roll,
  trialSeed,
  stateHash,
  Grid,
  occluded,
  Q,
  CAP,
  R,
  W,
  H,
  type Config,
} from "../src/sim";
const duel: Config = {
  A: { count: 1, stats: [7, 7, 9, 8, 6, 3] },
  B: { count: 1, stats: [7, 7, 9, 8, 6, 3] },
};
function ready(crit = 5, hit = 0) {
  const s = createBattle(duel, 0);
  const [a, b] = s.units;
  b.stats = [...a.stats];
  a.x = 180 * Q;
  b.x = 200 * Q;
  a.y = b.y = 250 * Q;
  for (const u of s.units) {
    u.target = 1 - u.id;
    u.attack = { target: 1 - u.id, due: 1, serial: 1, hit, damage: 100, crit };
    u.next = 100;
    u.serial = 1;
  }
  s.counts.started = 2;
  return s;
}
describe("versioned engine", () => {
  it("preserves defaults, input isolation, validates all limits and seed zero", () => {
    const c = structuredClone(DEFAULT),
      s = createBattle(c, 0);
    c.A.stats[0] = 1;
    expect(s.units[0].maxHp).toBe(14500);
    expect(s.seed).toBe(0);
    for (const n of [0, 101, 1.5, NaN])
      expect(() =>
        createBattle({ ...DEFAULT, A: { ...DEFAULT.A, count: n } }, 1),
      ).toThrow();
    for (const n of [0, 11, 1.1])
      expect(() =>
        createBattle(
          { ...DEFAULT, A: { count: 1, stats: [n, 1, 1, 1, 1, 1] } },
          1,
        ),
      ).toThrow();
  });
  it("all 200 spawn bodies are in bounds and separated", () => {
    const s = createBattle(
      { A: { ...DEFAULT.A, count: 100 }, B: { ...DEFAULT.B, count: 100 } },
      1,
    );
    for (const a of s.units) {
      expect(a.x).toBeGreaterThanOrEqual(R);
      expect(a.y).toBeLessThanOrEqual(H - R);
      for (const b of s.units)
        if (a.id !== b.id)
          expect((a.x - b.x) ** 2 + (a.y - b.y) ** 2).toBeGreaterThanOrEqual(
            (2 * R) ** 2,
          );
    }
  });
  it("PRNG reference vectors, distinct seeds, and independent unit streams", () => {
    const u = { rng: 0 };
    expect([roll(u, 1000), roll(u, 1000), roll(u, 1000)]).toEqual([
      223, 762, 697,
    ]);
    expect(
      new Set(Array.from({ length: 100 }, (_, i) => trialSeed(0, i))).size,
    ).toBe(100);
    const s = createBattle(duel, 0),
      r = s.units[1].rng;
    roll(s.units[0], 1000);
    expect(s.units[1].rng).toBe(r);
  });
  it("full-run determinism including reordered entity storage", () => {
    const a = createBattle(DEFAULT, 38),
      b = createBattle(DEFAULT, 38);
    b.units.reverse();
    for (let i = 0; i < CAP && !a.outcome; i++) {
      step(a);
      step(b);
      expect(stateHash(a)).toBe(stateHash(b));
    }
    expect(a.outcome).not.toBeNull();
  });
  it("simultaneous KO and final-tick KO take priority over timeout", () => {
    const s = ready();
    for (const u of s.units) u.hp = 1;
    s.tick = CAP - 1;
    step(s);
    expect(s.outcome).toBe("draw");
    expect(s.counts.hit).toBe(2);
    expect(s.counts.damage).toBe(2);
    expect(summarize(s).winner).toBeNull();
  });
  it("survivor only winner; HP advantage at cap remains unresolved", () => {
    const s = ready();
    s.units[1].hp = 1;
    step(s);
    expect(s.outcome).toBe("A_win");
    const t = createBattle(DEFAULT, 0);
    t.tick = CAP - 1;
    step(t);
    expect(t.outcome).toBe("timeout");
    expect(summarize(t).winner).toBeNull();
  });
  it("critical boundary 4/5, single rounding, no crit on evade or invalid", () => {
    expect(damage(6, 3, 100, false)).toBe(2238);
    expect(damage(6, 3, 100, true)).toBe(3356);
    const c = ready(4);
    step(c);
    expect(c.counts.crit).toBe(2);
    const n = ready(5);
    step(n);
    expect(n.counts.crit).toBe(0);
    const e = ready(0, 500);
    step(e);
    expect(e.counts.crit).toBe(0);
    expect(e.counts.dodge).toBe(2);
    const r = ready(0);
    r.units[1].x = 250 * Q;
    step(r);
    expect(r.counts.crit).toBe(0);
    expect(r.counts.invalid).toBe(2);
  });
  it("hit threshold boundary and each stat step changes its coefficient", () => {
    const a = ready(5, 499);
    step(a);
    expect(a.counts.hit).toBe(2);
    for (let i = 1; i < 10; i++) {
      expect(hitThreshold(i + 1, 5)).toBeGreaterThan(hitThreshold(i, 5));
      expect(damage(6, i + 1, 100, false)).toBeLessThan(
        damage(6, i, 100, false),
      );
      expect(damage(i + 1, 5, 100, true)).toBeGreaterThan(
        damage(i, 5, 100, true),
      );
      const x = createBattle(
          { A: { count: 1, stats: [i, i, 1, 1, i, 1] }, B: duel.B },
          0,
        ),
        y = createBattle(
          { A: { count: 1, stats: [i + 1, i + 1, 1, 1, i + 1, 1] }, B: duel.B },
          0,
        );
      expect(y.units[0].maxHp).toBeGreaterThan(x.units[0].maxHp);
      expect(y.units[0].maxEnergy).toBeGreaterThan(x.units[0].maxEnergy);
      step(x);
      step(y);
      expect(y.units[0].y).toBeGreaterThan(x.units[0].y);
    }
  });
  it("friendly body occludes attack line, dead bodies excluded by live grid", () => {
    const s = createBattle({ ...duel, A: { ...duel.A, count: 2 } }, 1);
    const [a, body, b] = s.units;
    a.x = 100 * Q;
    b.x = 122 * Q;
    body.x = 111 * Q;
    a.y = b.y = body.y = 100 * Q;
    expect(occluded(a, b, new Grid(s.units))).toBe(true);
    body.y += 9 * Q;
    expect(occluded(a, b, new Grid(s.units))).toBe(false);
    body.y -= 9 * Q;
    body.hp = 0;
    expect(occluded(a, b, new Grid(s.units.filter((u) => u.hp > 0)))).toBe(
      false,
    );
  });
  it("200-unit sustained invariants and attack accounting", () => {
    const s = createBattle(
      { A: { ...DEFAULT.A, count: 100 }, B: { ...DEFAULT.B, count: 100 } },
      0,
    );
    for (let i = 0; i < 900 && !s.outcome; i++) {
      step(s);
      for (const u of s.units) {
        expect(Number.isInteger(u.x)).toBe(true);
        expect(u.hp).toBeGreaterThanOrEqual(0);
        expect(u.energy).toBeGreaterThanOrEqual(0);
        expect(u.energy).toBeLessThanOrEqual(u.maxEnergy);
        expect(u.x).toBeGreaterThanOrEqual(R);
        expect(u.x).toBeLessThanOrEqual(W - R);
      }
    }
    const c = s.counts;
    expect(c.started).toBe(
      c.hit +
        c.dodge +
        c.invalid +
        c.canceled +
        s.units.filter((u) => u.attack).length,
    );
  }, 15000);
  it("fatigue slows movement, resting regains energy, knockback is bounded", () => {
    const a = createBattle(duel, 0),
      b = createBattle(duel, 0);
    b.units[0].energy = 0;
    b.units[0].last = 0;
    step(a);
    step(b);
    expect(a.units[0].y).toBeGreaterThan(b.units[0].y);
    b.units[0].last = -100;
    step(b);
    expect(b.units[0].energy).toBeGreaterThan(0);
    const c = ready();
    step(c);
    for (const u of c.units)
      expect(u.kx * u.kx + u.ky * u.ky).toBeLessThanOrEqual((4 * Q + 1) ** 2);
  });
});
it("reserved attack rolls stay independent and rare crit sample is not guaranteed", () => {
  const u = { rng: 1234 };
  let critical = 0;
  let hits = 0;
  for (let i = 0; i < 200000; i++) {
    const hit = roll(u, 1000),
      j = 95 + roll(u, 11),
      crit = roll(u, 1000);
    expect(j).toBeGreaterThanOrEqual(95);
    expect(j).toBeLessThanOrEqual(105);
    if (hit < 500) {
      hits++;
      if (crit < 5) critical++;
    }
  }
  expect(critical / hits).toBeGreaterThan(0.003);
  expect(critical / hits).toBeLessThan(0.007);
});
