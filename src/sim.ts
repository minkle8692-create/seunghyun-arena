// Authority for all combat. Integer centi-HP/energy and 1/256-pixel coordinates.
export const VERSION = "arena-1.0.0",
  Q = 256,
  W = 384 * Q,
  H = 512 * Q,
  R = 8 * Q,
  RANGE = 22 * Q,
  CAP = 5400;
export type Stats = [number, number, number, number, number, number];
export type Config = {
  A: { count: number; stats: Stats };
  B: { count: number; stats: Stats };
};
export const DEFAULT: Config = {
  A: { count: 50, stats: [10, 10, 4, 6, 8, 8] },
  B: { count: 1, stats: [7, 7, 9, 8, 6, 3] },
};
export type Team = "A" | "B";
export type Attack = {
  target: number;
  due: number;
  serial: number;
  hit: number;
  damage: number;
  crit: number;
};
export type Unit = {
  id: number;
  team: Team;
  stats: Stats;
  x: number;
  y: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  rng: number;
  target: number;
  next: number;
  last: number;
  serial: number;
  attack: Attack | null;
  kx: number;
  ky: number;
  rem: number;
  flash: string;
  flashUntil: number;
};
export type Event = {
  tick: number;
  kind: string;
  actor: number;
  target: number;
  attack?: Attack;
  damage?: number;
  actual?: number;
  overkill?: number;
  reason?: string;
};
export type Outcome = "A_win" | "B_win" | "draw" | "timeout";
export type Battle = {
  config: Config;
  configHash: string;
  seed: number;
  tick: number;
  units: Unit[];
  events: Event[];
  outcome: Outcome | null;
  counts: {
    started: number;
    hit: number;
    crit: number;
    dodge: number;
    invalid: number;
    canceled: number;
    ko: number;
    damage: number;
  };
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const round = (n: number) =>
  Math.sign(n) * Math.floor(Math.abs(n) + 0.5);
export function canonical(c: Config): Config {
  for (const t of ["A", "B"] as const) {
    if (
      !c?.[t] ||
      !Number.isInteger(c[t].count) ||
      c[t].count < 1 ||
      c[t].count > 100 ||
      !Array.isArray(c[t].stats) ||
      c[t].stats.length !== 6 ||
      c[t].stats.some((n) => !Number.isInteger(n) || n < 1 || n > 10)
    )
      throw Error("인원 1–100, 스탯 1–10 정수가 필요합니다.");
  }
  return {
    A: { count: c.A.count, stats: [...c.A.stats] },
    B: { count: c.B.count, stats: [...c.B.stats] },
  };
}
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++)
    h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(16);
}
export function mix(n: number) {
  n = (n + 0x9e3779b9) >>> 0;
  n = Math.imul(n ^ (n >>> 16), 0x21f0aaad);
  n = Math.imul(n ^ (n >>> 15), 0x735a2d97);
  return (n ^ (n >>> 15)) >>> 0;
}
// Full-period LCG32, rejection-sampled uniform integers; individual streams.
export function roll(u: { rng: number }, n: number) {
  const limit = 4294967296 - (4294967296 % n);
  do {
    u.rng = (Math.imul(u.rng, 1664525) + 1013904223) >>> 0;
  } while (u.rng >= limit);
  return u.rng % n;
}
export const trialSeed = (seed: number, i: number) =>
  (seed + Math.imul(i, 0x9e3779b9)) >>> 0;
export function isqrt(n: number) {
  let x = Math.floor(Math.sqrt(n));
  while ((x + 1) * (x + 1) <= n) x++;
  while (x * x > n) x--;
  return x;
}
const norm = (x: number, y: number, m: number) => {
  const d = isqrt(x * x + y * y);
  return d ? [round((x * m) / d), round((y * m) / d)] : [0, 0];
};
const dist = (a: Unit, b: Unit) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
export function damage(
  power: number,
  defense: number,
  j: number,
  crit: boolean,
) {
  return Math.floor(
    ((700 + 300 * power) * (1000 - 35 * defense) * j * (crit ? 3 : 2) +
      100000) /
      200000,
  );
}
export const hitThreshold = (a: number, b: number) => 500 + 40 * (a - b);
export function createBattle(input: Config, seed: number): Battle {
  const config = canonical(input);
  Object.freeze(config.A.stats);
  Object.freeze(config.B.stats);
  Object.freeze(config.A);
  Object.freeze(config.B);
  Object.freeze(config);
  const units: Unit[] = [];
  for (const team of ["A", "B"] as const) {
    const { count, stats } = config[team];
    const cols = Math.min(10, count);
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const id = units.length;
      units.push({
        id,
        team,
        stats,
        x: (192 + ((i % cols) - (cols - 1) / 2) * 20) * Q,
        y:
          (team === "A"
            ? 40 + Math.floor(i / cols) * 20
            : 472 - Math.floor(i / cols) * 20) * Q,
        hp: (55 + 9 * stats[0]) * 100,
        maxHp: (55 + 9 * stats[0]) * 100,
        energy: (45 + 7 * stats[1]) * 100,
        maxEnergy: (45 + 7 * stats[1]) * 100,
        rng: mix(seed ^ mix(id)),
        target: -1,
        next: 0,
        last: -30,
        serial: 0,
        attack: null,
        kx: 0,
        ky: 0,
        rem: 0,
        flash: "idle",
        flashUntil: 0,
      });
    }
    void rows;
  }
  return {
    config,
    configHash: hash(
      JSON.stringify({
        config,
        VERSION,
        rng: "lcg32-reject-v1",
        spawn: 1,
        crit: [5, 1000, 3, 2],
      }),
    ),
    seed: seed >>> 0,
    tick: 0,
    units,
    events: [],
    outcome: null,
    counts: {
      started: 0,
      hit: 0,
      crit: 0,
      dodge: 0,
      invalid: 0,
      canceled: 0,
      ko: 0,
      damage: 0,
    },
  };
}
export class Grid {
  cells = new Map<string, Unit[]>();
  constructor(units: Unit[]) {
    for (const u of units) {
      const key = `${Math.floor(u.x / (32 * Q))},${Math.floor(u.y / (32 * Q))}`;
      const a = this.cells.get(key) || [];
      a.push(u);
      this.cells.set(key, a);
    }
  }
  near(x: number, y: number, r: number) {
    const out: Unit[] = [];
    for (
      let a = Math.floor((x - r) / (32 * Q));
      a <= Math.floor((x + r) / (32 * Q));
      a++
    )
      for (
        let b = Math.floor((y - r) / (32 * Q));
        b <= Math.floor((y + r) / (32 * Q));
        b++
      )
        out.push(...(this.cells.get(`${a},${b}`) || []));
    return out.sort((a, b) => a.id - b.id);
  }
}
export function occluded(a: Unit, b: Unit, grid: Grid) {
  const dx = b.x - a.x,
    dy = b.y - a.y,
    l = dx * dx + dy * dy;
  if (!l) return false;
  for (const u of grid.near((a.x + b.x) / 2, (a.y + b.y) / 2, RANGE + R)) {
    if (u.id === a.id || u.id === b.id) continue;
    const dot = (u.x - a.x) * dx + (u.y - a.y) * dy;
    if (dot <= 0 || dot >= l) continue;
    const cross = (u.x - a.x) * dy - (u.y - a.y) * dx;
    if (cross * cross < R * R * l) return true;
  }
  return false;
}
function collision(live: Unit[]) {
  for (let iter = 0; iter < 48; iter++) {
    const grid = new Grid(live),
      delta = new Map<number, number[]>();
    for (const a of live)
      for (const b of grid.near(a.x, a.y, 2 * R)) {
        if (b.id <= a.id) continue;
        let dx = b.x - a.x,
          dy = b.y - a.y;
        let d = isqrt(dx * dx + dy * dy);
        if (d >= 2 * R) continue;
        if (!d) {
          dx = mix(a.id ^ mix(b.id)) & 1 ? 1 : -1;
          dy = 0;
          d = 1;
        }
        const push = Math.ceil((2 * R - d) / 2);
        const [x, y] = norm(dx, dy, push);
        const aa = delta.get(a.id) || [0, 0],
          bb = delta.get(b.id) || [0, 0];
        aa[0] -= x;
        aa[1] -= y;
        bb[0] += x;
        bb[1] += y;
        delta.set(a.id, aa);
        delta.set(b.id, bb);
      }
    if (!delta.size) break;
    for (const u of live) {
      const d = delta.get(u.id) || [0, 0];
      u.x = clamp(u.x + d[0], R, W - R);
      u.y = clamp(u.y + d[1], R, H - R);
    }
  }
}
export function step(s: Battle) {
  if (s.outcome) return s;
  s.tick++;
  s.events = [];
  const live = s.units.filter((u) => u.hp > 0).sort((a, b) => a.id - b.id),
    byId = new Map(s.units.map((u) => [u.id, u]));
  const grid = new Grid(live);
  const moves = new Map<number, number[]>();
  for (const u of live) {
    let t = byId.get(u.target);
    if (!t || t.hp <= 0 || s.tick % 6 === u.id % 6) {
      let best: Unit | undefined;
      let dd = Infinity;
      for (const v of live) {
        if (v.team === u.team) continue;
        const d = dist(u, v);
        if (
          d < dd ||
          (d === dd &&
            mix(s.seed ^ v.id ^ mix(u.id)) <
              mix(s.seed ^ (best?.id || 0) ^ mix(u.id)))
        ) {
          best = v;
          dd = d;
        }
      }
      if (!t || t.hp <= 0 || (best && dd < dist(u, t) * 0.64)) t = best;
      u.target = t?.id ?? -1;
    }
    let mx = 0,
      my = 0;
    if (t && !u.attack && dist(u, t) > (19 * Q) ** 2) {
      let dx = t.x - u.x,
        dy = t.y - u.y;
      let blocked = false;
      for (const v of grid.near(u.x, u.y, 23 * Q)) {
        if (v.id === u.id) continue;
        const d = dist(u, v);
        if (d < (19 * Q) ** 2 && (v.x - u.x) * dx + (v.y - u.y) * dy > 0)
          blocked = true;
      }
      if (blocked) {
        const sign = mix(s.seed ^ u.id) & 1 ? 1 : -1;
        const ox = dx;
        dx = round(dx * 0.25) - sign * dy;
        dy = round(dy * 0.25) + sign * ox;
      }
      const f = Math.min(1000, Math.floor((u.energy * 4000) / u.maxEnergy));
      const numerator =
        (42 + 4 * u.stats[4]) * Q * (550 + Math.floor((450 * f) / 1000)) +
        u.rem;
      const speed = Math.floor(numerator / 30000);
      u.rem = numerator % 30000;
      [mx, my] = norm(dx, dy, speed);
      if (s.tick > u.flashUntil) u.flash = "walk";
    } else if (s.tick > u.flashUntil) u.flash = "idle";
    moves.set(u.id, [mx + u.kx, my + u.ky]);
    u.kx = 0;
    u.ky = 0;
    if (!u.attack && s.tick - u.last >= 30)
      u.energy = Math.min(u.maxEnergy, u.energy + 12 + 3 * u.stats[1]);
  }
  for (const u of live) {
    const m = moves.get(u.id)!;
    u.x = clamp(u.x + m[0], R, W - R);
    u.y = clamp(u.y + m[1], R, H - R);
  }
  collision(live);
  const post = new Grid(live);
  const hits = new Map<
    number,
    { sum: number; x: number; y: number; ids: number[] }
  >();
  for (const u of live) {
    const t = byId.get(u.target);
    if (
      !u.attack &&
      t &&
      t.hp > 0 &&
      s.tick >= u.next &&
      u.energy >= 800 &&
      dist(u, t) <= RANGE * RANGE &&
      !occluded(u, t, post)
    ) {
      const f = Math.min(1000, Math.floor((u.energy * 4000) / u.maxEnergy));
      u.next =
        s.tick +
        Math.ceil(
          ((42 - 2 * u.stats[4]) * 1000) / (650 + Math.floor((350 * f) / 1000)),
        );
      u.energy -= 800;
      u.last = s.tick;
      u.attack = {
        target: t.id,
        due: s.tick + 6,
        serial: ++u.serial,
        hit: roll(u, 1000),
        damage: 95 + roll(u, 11),
        crit: roll(u, 1000),
      };
      s.counts.started++;
      u.flash = "attack";
      u.flashUntil = s.tick + 6;
    }
    const a = u.attack;
    if (!a) continue;
    u.last = s.tick;
    if (a.due > s.tick) continue;
    u.attack = null;
    const v = byId.get(a.target)!;
    const ev: Event = {
      tick: s.tick,
      kind: "invalid",
      actor: u.id,
      target: a.target,
      attack: { ...a },
    };
    if (!v || v.hp <= 0) ev.reason = "target_KO";
    else if (dist(u, v) > RANGE * RANGE) ev.reason = "range";
    else if (occluded(u, v, post)) ev.reason = "occluded";
    else if (a.hit >= hitThreshold(u.stats[2], v.stats[2])) {
      ev.kind = "dodge";
      s.counts.dodge++;
      v.flash = "dodge";
      v.flashUntil = s.tick + 7;
    } else {
      const crit = a.crit < 5;
      ev.kind = crit ? "crit" : "hit";
      ev.damage = damage(u.stats[3], v.stats[5], a.damage, crit);
      s.counts.hit++;
      if (crit) s.counts.crit++;
      const h = hits.get(v.id) || { sum: 0, x: 0, y: 0, ids: [] };
      const [x, y] = norm(v.x - u.x, v.y - u.y, (1 + 0.25 * u.stats[3]) * Q);
      h.sum += ev.damage;
      h.x += x;
      h.y += y;
      h.ids.push(u.id);
      hits.set(v.id, h);
      v.flash = crit ? "crit" : "hit";
      v.flashUntil = s.tick + 8;
    }
    if (ev.kind === "invalid") s.counts.invalid++;
    s.events.push(ev);
  }
  for (const u of live) {
    const h = hits.get(u.id);
    if (h) {
      const actual = Math.min(u.hp, h.sum);
      u.hp -= actual;
      s.counts.damage += actual;
      const len = isqrt(h.x * h.x + h.y * h.y);
      [u.kx, u.ky] = len > 4 * Q ? norm(h.x, h.y, 4 * Q) : [h.x, h.y];
      s.events.push({
        tick: s.tick,
        kind: "damage",
        actor: -1,
        target: u.id,
        damage: h.sum,
        actual,
        overkill: h.sum - actual,
      });
    }
    if (u.hp === 0) {
      s.counts.ko++;
      u.flash = "ko";
      u.flashUntil = s.tick + 45;
      s.events.push({ tick: s.tick, kind: "ko", actor: -1, target: u.id });
      if (u.attack) {
        s.events.push({
          tick: s.tick,
          kind: "canceled",
          actor: u.id,
          target: u.attack.target,
          attack: u.attack,
          reason: "attacker_KO",
        });
        s.counts.canceled++;
        u.attack = null;
      }
    }
  }
  const A = live.some((u) => u.team === "A" && u.hp > 0),
    B = live.some((u) => u.team === "B" && u.hp > 0);
  s.outcome =
    !A && !B
      ? "draw"
      : !B
        ? "A_win"
        : !A
          ? "B_win"
          : s.tick >= CAP
            ? "timeout"
            : null;
  return s;
}
export function summarize(s: Battle) {
  const team = (t: Team) => ({
    alive: s.units.filter((u) => u.team === t && u.hp > 0).length,
    hp: s.units.filter((u) => u.team === t).reduce((a, u) => a + u.hp, 0),
    maxHp: s.units.filter((u) => u.team === t).reduce((a, u) => a + u.maxHp, 0),
  });
  return {
    simVersion: VERSION,
    configSchemaVersion: 1,
    resultSchemaVersion: 1,
    rngVersion: "lcg32-reject-v1",
    spawnVersion: 1,
    mapVersion: "empty-384x512-v1",
    config: s.config,
    configHash: s.configHash,
    seed: s.seed,
    tick: s.tick,
    outcome: s.outcome,
    winner: s.outcome === "A_win" ? "A" : s.outcome === "B_win" ? "B" : null,
    reason:
      s.outcome === "timeout"
        ? "time_cap"
        : s.outcome === "draw"
          ? "simultaneous_all_KO"
          : s.outcome
            ? "opponent_all_KO"
            : null,
    A: team("A"),
    B: team("B"),
    counts: { ...s.counts },
    pending: s.units.filter((u) => u.attack).length,
  };
}
export function stateHash(s: Battle) {
  return hash(
    JSON.stringify({ ...s, units: [...s.units].sort((a, b) => a.id - b.id) }),
  );
}
