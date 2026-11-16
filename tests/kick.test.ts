import { describe, it, expect } from "vitest";
import {
  createBattle,
  DEFAULT,
  Q,
  R,
  KICK,
  Grid,
  kickTargets,
  step,
  stateHash,
} from "../src/sim";
function fixture() {
  const s = createBattle(
    { A: { ...DEFAULT.A, count: 3 }, B: { ...DEFAULT.B, count: 1 } },
    123,
  );
  const b = s.units[3];
  b.x = 160 * Q;
  b.y = 250 * Q;
  b.target = 1;
  s.units.slice(0, 3).forEach((u, i) => {
    u.x = 184 * Q;
    u.y = (234 + 16 * i) * Q;
    u.target = 3;
    u.next = 999;
    u.attack = {
      target: 3,
      due: 999,
      serial: 1,
      hit: 0,
      damage: 100,
      crit: 999,
    };
  });
  return { s, b };
}
describe("explicit B-only kick", () => {
  it("telegraphs, pays once, strikes multiple enemies and applies stronger bounded knockback", () => {
    const { s, b } = fixture();
    const energy = b.energy;
    step(s);
    expect(b.kick?.due).toBe(13);
    expect(b.energy).toBe(energy - KICK.cost);
    expect(s.events.some((e) => e.kind === "kick_windup")).toBe(true);
    for (let i = 0; i < 12; i++) step(s);
    expect(s.events.filter((e) => e.kind === "kick_hit")).toHaveLength(3);
    for (const u of s.units.slice(0, 3)) {
      expect(u.hp).toBeLessThan(u.maxHp);
      expect(Math.hypot(u.kx, u.ky) / Q).toBeGreaterThan(9.9);
    }
    expect(s.counts.crit).toBe(0);
    expect(s.counts.hit).toBe(0);
    expect(b.kickNext).toBe(121);
    expect(R).toBe(8 * Q);
  });
  it("excludes outside arc/range, friends, KO and obstructed rear targets; caps targets", () => {
    const { s, b } = fixture();
    const k = { due: 1, dx: Q, dy: 0 };
    const unit = (id: number, x: number, y: number, team: "A" | "B" = "A") => ({
      ...s.units[0],
      id,
      x: b.x + x * Q,
      y: b.y + y * Q,
      team,
    });
    for (const v of [
      unit(5, -20, 0),
      unit(5, 0, 25),
      unit(5, 33, 0),
      unit(5, 20, 0, "B"),
      { ...unit(5, 20, 0), hp: 0 },
    ])
      expect(kickTargets(b, k, new Grid([b, v]))).toEqual([]);
    const front = unit(5, 16, 0),
      rear = unit(6, 32, 0);
    expect(
      kickTargets(b, k, new Grid([b, front, rear])).map((u) => u.id),
    ).toEqual([5]);
    const many = Array.from({ length: 5 }, (_, i) =>
      unit(
        i + 10,
        32 * Math.cos(((i - 2) * Math.PI) / 6),
        32 * Math.sin(((i - 2) * Math.PI) / 6),
      ),
    );
    expect(kickTargets(b, k, new Grid([b, ...many]))).toHaveLength(4);
  });
  it("respects insufficient stamina, cooldown and team restriction", () => {
    for (const mode of ["energy", "cooldown", "team"]) {
      const { s, b } = fixture();
      if (mode === "energy") {
        b.energy = KICK.cost - 1;
        b.last = 0;
      }
      if (mode === "cooldown") b.kickNext = 100;
      if (mode === "team") b.team = "A";
      step(s);
      expect(b.kick).toBeNull();
      expect(s.events.some((e) => e.kind === "kick_windup")).toBe(false);
    }
  });
  it("locked direction misses targets that leave and simultaneous fatal attacks still resolve", () => {
    const { s, b } = fixture();
    b.kick = { due: 1, dx: -Q, dy: 0 };
    b.next = 999;
    step(s);
    expect(s.events.filter((e) => e.kind === "kick_hit")).toHaveLength(0);
    const f = fixture();
    f.b.kick = { due: 1, dx: Q, dy: 0 };
    f.b.next = 999;
    f.b.hp = 1;
    f.s.units[1].x = 180 * Q;
    f.s.units[1].attack!.due = 1;
    for (const u of f.s.units.slice(0, 3)) u.hp = 1;
    step(f.s);
    expect(f.s.outcome).toBe("draw");
  });
  it("reordered entities produce identical multi-target damage and knockback", () => {
    const { s } = fixture();
    const copy = structuredClone(s);
    copy.units.reverse();
    for (let i = 0; i < 40; i++) {
      step(s);
      step(copy);
      expect(stateHash(s)).toBe(stateHash(copy));
    }
  });
});
