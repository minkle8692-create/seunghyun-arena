// Authority for all combat. Integer centi-HP and 1/256-pixel coordinates.
// Exact half-stat inputs may regenerate half-cent energy (binary-exact .5), never truncated.
export const VERSION = "arena-2.1.0",
  Q = 256,
  W = 384 * Q,
  H = 512 * Q,
  R = 8 * Q,
  RANGE = 22 * Q,
  CAP = 5400;
// Explicit adult-only sweep: 0.4s wind-up, 4s cooldown, 24 energy, 44px/360°, 6 targets.
export const KICK = {
  windup: 12,
  cooldown: 120,
  cost: 2400,
  range: 44 * Q,
  limit: 6,
  knockback: 44 * Q,
  recoilTicks: 12,
  recoveryTicks: 6,
} as const;
export type Kick = { due: number; dx: number; dy: number };
export type Stats = [number, number, number, number, number, number];
export type Character = "youth" | "adult" | "mage" | "seokho";
export const NAMES = { youth: "14세 승현", adult: "35세 승현", mage: "14세 동우", seokho: "25세 석호" };
export const MAGE = { range: 150 * Q, flee: 76 * Q, safe: 108 * Q, windup: 24, cooldown: 75, recovery: 12, cost: 1800, projectileSpeed: 7 * Q } as const;
export const MAGE_STATS: Stats = [7, 8, 8, 6, 6, 5];
export const LOCK = { range: 120*Q, windup: 30, dashTicks: 30, dashSpeed: 4*Q, gap: 9, recovery: 45, cooldown: 210, cost: 3000 } as const;
export type LockSequence = { target:number; phase:"lock"|"dash"|"left"|"right"|"prone"; due:number; began:number; serial:number; landed:boolean };
export type Cast = { due: number; target: number };
export type Projectile = { id: number; actor: number; team: Team; x: number; y: number; vx: number; vy: number; left: number; power: number; skill: number };
export const identity = (c: Character | Team): Character => c === "A" ? "youth" : c === "B" ? "adult" : c;
export const characterOf = (c: Config, t: Team): Character => c[t].character ?? identity(t);
export type Config = {
  A: { count: number; stats: Stats; character?: Character };
  B: { count: number; stats: Stats; character?: Character };
};
export const DEFAULT: Config = {
  A: { character: "youth", count: 50, stats: [10, 10, 4, 6, 8, 8] },
  B: { character: "adult", count: 1, stats: [7, 7, 9, 8, 6, 3] },
};
export type Team = "A" | "B";
export const STAT_MULTIPLIERS = { youth: 1, adult: 5, mage: 1, seokho: 2.5 } as const;
// Config and persistence always contain BASE stats. Apply exactly once at spawn.
export function effectiveStats(team: Team | Character, base: Stats): Stats {
  return base.map(n => n * STAT_MULTIPLIERS[identity(team)]) as Stats;
}
// Preserve original 1..10 curves; extended inputs remain positive and bounded.
export const defenseFactor = (defense: number) => defense <= 10
  ? 1000 - 35 * defense : Math.floor(65000 / (100 + 7 * (defense - 10)));
export const attackDelay = (speed: number, fatigue: number) => Math.max(6, Math.ceil(
  (speed <= 10 ? 42 - 2 * speed : 220 / speed) * 1000 /
  (650 + Math.floor(350 * Math.max(0, Math.min(1000, fatigue)) / 1000))
));
export const COMBAT_MODIFIERS = { youthDamage: 1.3, adultAttackSpeed: 1.5 } as const;
export const normalDelay = (team: Team | Character, speed: number, fatigue: number) =>
  identity(team) === "adult" ? Math.max(4, Math.ceil(attackDelay(speed, fatigue) * 2 / 3)) : attackDelay(speed, fatigue);
export const normalDamage = (team: Team | Character, power: number, defense: number, jitter: number, crit: boolean) => {
  const base = damage(power, defense, jitter, crit);
  return identity(team) === "youth" ? Math.floor((base * 13 + 5) / 10) : base;
};
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
  character: Character;
  lock: LockSequence | null;
  lockNext: number;
  cast: Cast | null;
  castNext: number;
  fleeing: boolean;
  fleeTicks: number;
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
  kick: Kick | null;
  kickNext: number;
  kickPoseUntil: number;
  kx: number;
  ky: number;
  recoilLeft: number;
  stunnedUntil: number;
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
  projectiles: Projectile[];
  projectileSerial: number;
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
    spellCast: number;
    spellHit: number;
  };
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
export const round = (n: number) =>
  Math.sign(n) * Math.floor(Math.abs(n) + 0.5);
export function canonical(c: Config): Config {
  for (const t of ["A", "B"] as const) {
    if (
      !c?.[t] ||
      (c[t].character !== undefined && !["youth", "adult", "mage", "seokho"].includes(c[t].character!)) ||
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
    A: { count: c.A.count, stats: [...c.A.stats], character: characterOf(c,"A") },
    B: { count: c.B.count, stats: [...c.B.stats], character: characterOf(c,"B") },
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
    ((700 + 300 * power) * defenseFactor(defense) * j * (crit ? 3 : 2) +
      100000) /
      200000,
  );
}
export const hitThreshold = (a: number, b: number) => clamp(500 + 40 * (a - b), 50, 950);
export function createBattle(input: Config, seed: number): Battle {
  const config = canonical(input);
  Object.freeze(config.A.stats);
  Object.freeze(config.B.stats);
  Object.freeze(config.A);
  Object.freeze(config.B);
  Object.freeze(config);
  const units: Unit[] = [];
  for (const team of ["A", "B"] as const) {
    const { count } = config[team];
    const stats = Object.freeze(effectiveStats(characterOf(config,team), config[team].stats)) as Stats;
    const cols = Math.min(10, count);
    const rows = Math.ceil(count / cols);
    for (let i = 0; i < count; i++) {
      const id = units.length;
      units.push({
        id,
        team,
        character: characterOf(config,team), lock: null, lockNext: 0, cast: null, castNext: 0, fleeing: false, fleeTicks: 0,
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
        kick: null,
        kickNext: 0,
        kickPoseUntil: 0,
        kx: 0,
        ky: 0,
        recoilLeft: 0,
        stunnedUntil: 0,
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
        statMultipliers: STAT_MULTIPLIERS,
        rng: "lcg32-reject-v1",
        spawn: 1,
        crit: [5, 1000, 3, 2],
      }),
    ),
    seed: seed >>> 0,
    tick: 0,
    units,
    projectiles: [], projectileSerial: 0,
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
      damage: 0, spellCast: 0, spellHit: 0,
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
  for (const u of grid.near((a.x + b.x) / 2, (a.y + b.y) / 2, Math.sqrt(l) / 2 + R)) {
    if (u.id === a.id || u.id === b.id) continue;
    const dot = (u.x - a.x) * dx + (u.y - a.y) * dy;
    if (dot <= 0 || dot >= l) continue;
    const cross = (u.x - a.x) * dy - (u.y - a.y) * dx;
    if (cross * cross < R * R * l) return true;
  }
  return false;
}
export function kickTargets(u: Unit, _kick: Kick, grid: Grid) {
  return grid
    .near(u.x, u.y, KICK.range)
    .filter((v) => {
      if (v.hp <= 0 || v.team === u.team) return false;
      const dx = v.x - u.x,
        dy = v.y - u.y,
        d = dx * dx + dy * dy;
      return d > 0 && d <= KICK.range ** 2 && !occluded(u, v, grid);
    })
    .sort((a, b) => dist(u, a) - dist(u, b) || a.id - b.id)
    .slice(0, KICK.limit);
}
function collision(live: Unit[]) {
  for (let iter = 0; iter < 256; iter++) {
    let maxPenetration = 0;
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
        maxPenetration = Math.max(maxPenetration, 2*R-d);
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
    // Early exit below 1/32px; reserve extra iterations for wall-packed crowds.
    if (!delta.size || maxPenetration <= Q/32) break;
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
    if (!t || t.hp <= 0 || t.team === u.team || s.tick % 6 === u.id % 6) {
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
      if (!t || t.hp <= 0 || t.team === u.team || (best && dd < dist(u, t) * 0.64)) t = best;
      u.target = t?.id ?? -1;
    }
    if (u.lock && u.lock.phase !== "prone") {
      const locked=byId.get(u.lock.target);
      if(!locked || locked.hp<=0 || locked.team===u.team) {
        s.events.push({tick:s.tick,kind:"lock_cancel",actor:u.id,target:u.lock.target,reason:"target_KO"});
        u.lock={...u.lock,phase:"prone",due:s.tick+LOCK.recovery};
      }
    }
    let mx = 0,
      my = 0;
    if (u.character === "mage" && t) {
      if (dist(u,t) < MAGE.flee ** 2) u.fleeing = true;
      else if (dist(u,t) > MAGE.safe ** 2) u.fleeing = false;
      u.fleeTicks = u.fleeing && !u.cast ? u.fleeTicks + 1 : 0;
    }
    const mageMove = u.character === "mage";
    if (s.tick > u.stunnedUntil && t && !u.attack && !u.kick && !u.cast && !u.lock &&
      (mageMove ? (u.fleeing || dist(u,t) > (MAGE.range * 0.85) ** 2) : dist(u, t) > (19 * Q) ** 2)) {
      let dx = t.x - u.x,
        dy = t.y - u.y;
      if (mageMove && u.fleeing) {
        dx = -dx; dy = -dy;
        // Follow a wall tangentially instead of repeatedly pushing into it.
        const margin = 14 * Q;
        if ((u.x < margin && dx < 0) || (u.x > W-margin && dx > 0)) { dy = dy || (u.y < H/2 ? 1 : -1); dx = 0; }
        if ((u.y < margin && dy < 0) || (u.y > H-margin && dy > 0)) { dx = dx || (u.x < W/2 ? 1 : -1); dy = 0; }
      }
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
    if (u.lock?.phase==="dash" && s.tick>u.stunnedUntil) {
      const target=byId.get(u.lock.target);
      if(target && target.hp>0 && dist(u,target)>(19*Q)**2) {
        const [dx,dy]=norm(target.x-u.x,target.y-u.y,Math.min(LOCK.dashSpeed,Math.max(0,isqrt(dist(u,target))-19*Q)));
        // Swept short dash blocked by the first body; never teleport through a crowd.
        let safe=true;
        for(const body of grid.near(u.x,u.y,LOCK.dashSpeed+2*R)) {
          if(body.id===u.id)continue;
          for(let n=1;n<=4;n++) {
            const x=u.x+dx*n/4,y=u.y+dy*n/4;
            if((x-body.x)**2+(y-body.y)**2<(2*R)**2 && (x-body.x)**2+(y-body.y)**2<dist(u,body)) safe=false;
          }
        }
        if(safe){mx=dx;my=dy;}
      }
    }
    if (u.recoilLeft > 0) {
      const rx = round(u.kx / u.recoilLeft), ry = round(u.ky / u.recoilLeft);
      moves.set(u.id, [rx, ry]);
      u.kx -= rx; u.ky -= ry; u.recoilLeft--;
    } else {
      moves.set(u.id, [mx + u.kx, my + u.ky]);
      u.kx = 0; u.ky = 0;
    }
    if (!u.attack && !u.kick && !u.cast && !u.lock && s.tick - u.last >= 30)
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
    { sum: number; x: number; y: number; ids: number[]; kick?: boolean }
  >();
  // Swept segment collision: first living body absorbs a bolt, including allies.
  // No homing; direction is fixed at release. Out-of-bounds bolts expire.
  const bolts: Projectile[] = [];
  for (const p of s.projectiles) {
    const [vx,vy]=p.left < MAGE.projectileSpeed ? norm(p.vx,p.vy,p.left) : [p.vx,p.vy];
    const ax=p.x, ay=p.y, bx=ax+vx, by=ay+vy;
    const l=vx*vx+vy*vy;
    if(!l) continue;
    const contacts = post.near((ax+bx)/2,(ay+by)/2, R+MAGE.projectileSpeed)
      .filter(v=>v.id!==p.actor).map(v=> {
        const dx=ax-v.x,dy=ay-v.y, dot=dx*vx+dy*vy, c=dx*dx+dy*dy-R*R;
        const disc=dot*dot-l*c;
        const entry=c<=0?0:disc>=0?(-dot-Math.sqrt(disc))/l:Infinity;
        return {v,t:entry};
      }).filter(c=>c.t>=0 && c.t<=1).sort((a,b)=>a.t-b.t || a.v.id-b.v.id);
    const contact=contacts[0];
    if (contact) {
      const v=contact.v;
      if(v.team!==p.team) {
        const amount=Math.floor(damage(p.power,v.stats[5],100,false)*(100+3*p.skill)/100);
        const h=hits.get(v.id)||{sum:0,x:0,y:0,ids:[]};
        h.sum+=amount; h.ids.push(p.actor); hits.set(v.id,h);
        v.flash="hit"; v.flashUntil=s.tick+8;
        s.counts.spellHit++;
        s.events.push({tick:s.tick,kind:"spell_hit",actor:p.actor,target:v.id,damage:amount});
      } else s.events.push({tick:s.tick,kind:"spell_block",actor:p.actor,target:v.id});
    } else {
      p.x=bx;p.y=by;p.left-=isqrt(l);
      if(p.left>0 && bx>=0 && bx<=W && by>=0 && by<=H) bolts.push(p);
    }
  }
  s.projectiles=bolts;
  for (const u of live) {
    if (s.tick <= u.stunnedUntil) continue;
    const t = byId.get(u.target);
    if(u.character==="seokho") {
      if(!u.lock && !u.attack && t && t.hp>0 && s.tick>=u.next && s.tick>=u.lockNext && u.energy>=LOCK.cost && dist(u,t)<=LOCK.range**2) {
        u.lock={target:t.id,phase:"lock",due:s.tick+LOCK.windup,began:s.tick,serial:++u.serial,landed:false};
        u.lockNext=s.tick+LOCK.cooldown;u.energy-=LOCK.cost;u.last=s.tick;
        s.events.push({tick:s.tick,kind:"lock_start",actor:u.id,target:t.id});
      }
      if(u.lock) {
        const seq=u.lock;u.last=s.tick;
        const target=byId.get(seq.target);
        if(seq.phase==="lock" && s.tick>=seq.due) {
          seq.phase="dash";seq.due=s.tick+LOCK.dashTicks;
          s.events.push({tick:s.tick,kind:"lock_dash",actor:u.id,target:seq.target});
        } else if(seq.phase==="dash" && (s.tick>=seq.due || (target && dist(u,target)<=RANGE**2))) {
          seq.phase="left";seq.due=s.tick+6;
        } else if((seq.phase==="left"||seq.phase==="right") && s.tick>=seq.due) {
          const side=seq.phase;
          const ev:Event={tick:s.tick,kind:"lock_"+side,actor:u.id,target:seq.target,
            attack:{target:seq.target,due:s.tick,serial:seq.serial*2+(side==="right"?1:0),hit:roll(u,1000),damage:95+roll(u,11),crit:roll(u,1000)}};
          const a=ev.attack!;
          if(!target || target.hp<=0)ev.reason="target_KO";
          else if(dist(u,target)>RANGE**2)ev.reason="range";
          else if(occluded(u,target,post))ev.reason="occluded";
          else if(a.hit>=hitThreshold(u.stats[2],target.stats[2]))ev.reason="miss";
          else {
            const crit=!seq.landed || a.crit<5;
            ev.reason=crit?"critical":"normal";seq.landed=true;
            ev.damage=damage(u.stats[3],target.stats[5],a.damage,crit);
            const h=hits.get(target.id)||{sum:0,x:0,y:0,ids:[]};
            h.sum+=ev.damage;h.ids.push(u.id);hits.set(target.id,h);
            s.counts.hit++;if(crit)s.counts.crit++;
            target.flash=crit?"crit":"hit";target.flashUntil=s.tick+8;
          }
          s.events.push(ev);
          if(side==="left"){seq.phase="right";seq.due=s.tick+LOCK.gap;}
          else {seq.phase="prone";seq.due=s.tick+LOCK.recovery;
            s.events.push({tick:s.tick,kind:"lock_prone",actor:u.id,target:seq.target});}
        } else if(seq.phase==="prone" && s.tick>=seq.due) {
          u.lock=null;u.next=s.tick+6;
        }
        continue;
      }
    }
    if (u.character === "mage") {
      if (u.cast) {
        u.last=s.tick;
        if(s.tick>=u.cast.due) {
          const target=byId.get(u.cast.target);
          if(target && target.hp>0) {
            const [vx,vy]=norm(target.x-u.x,target.y-u.y,MAGE.projectileSpeed);
            if(vx||vy) s.projectiles.push({id:++s.projectileSerial,actor:u.id,team:u.team,x:u.x,y:u.y,vx,vy,left:MAGE.range,power:u.stats[3],skill:u.stats[2]});
            s.events.push({tick:s.tick,kind:"spell_release",actor:u.id,target:target.id});
          }
          u.cast=null; u.stunnedUntil=s.tick+MAGE.recovery;
        }
      } else if(t && t.hp>0 && (!u.fleeing || u.fleeTicks>=18) && s.tick>=u.castNext && u.energy>=MAGE.cost && dist(u,t)<=MAGE.range**2 && !occluded(u,t,post)) {
        u.cast={due:s.tick+MAGE.windup,target:t.id};
        u.castNext=s.tick+MAGE.cooldown; u.energy-=MAGE.cost;u.last=s.tick;
        s.counts.spellCast++;
        s.events.push({tick:s.tick,kind:"spell_cast",actor:u.id,target:t.id});
      }
      continue;
    }
    if (
      u.character === "adult" &&
      !u.attack &&
      !u.kick &&
      t &&
      t.hp > 0 &&
      s.tick >= u.next &&
      s.tick >= u.kickNext &&
      u.energy >= KICK.cost &&
      dist(u, t) <= KICK.range ** 2 &&
      !occluded(u, t, post)
    ) {
      u.kick = { due: s.tick + KICK.windup, dx: t.x - u.x, dy: t.y - u.y };
      u.kickNext = s.tick + KICK.cooldown;
      u.next = s.tick + KICK.windup + 12;
      u.energy -= KICK.cost;
      u.last = s.tick;
      s.events.push({
        tick: s.tick,
        kind: "kick_windup",
        actor: u.id,
        target: t.id,
      });
    }
    if (u.kick) {
      u.last = s.tick;
      if (s.tick >= u.kick.due) {
        const victims = kickTargets(u, u.kick, post);
        for (const v of victims) {
          // Guaranteed contact inside the telegraphed arc; 80% normal base damage, no crit.
          const amount = Math.floor(
            damage(u.stats[3], v.stats[5], 100, false) * 0.8,
          );
          const h = hits.get(v.id) || { sum: 0, x: 0, y: 0, ids: [] };
          const [x, y] = norm(v.x - u.x, v.y - u.y, KICK.knockback);
          h.sum += amount;
          h.x += x;
          h.y += y;
          h.ids.push(u.id);
          h.kick = true;
          hits.set(v.id, h);
          v.flash = "hit";
          v.flashUntil = s.tick + 10;
          s.events.push({
            tick: s.tick,
            kind: "kick_hit",
            actor: u.id,
            target: v.id,
            damage: amount,
          });
        }
        u.kick = null;
        u.kickPoseUntil = s.tick + 10;
        u.flash = "kick";
        u.flashUntil = s.tick + 10;
        s.events.push({
          tick: s.tick,
          kind: "kick",
          actor: u.id,
          target: u.id,
          actual: victims.length,
        });
      }
    }
    if (
      !u.attack &&
      !u.kick &&
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
        normalDelay(u.character, u.stats[4], f);
      u.energy -= 800;
      u.last = s.tick;
      u.attack = {
        target: t.id,
        due: s.tick + (u.character === "adult" ? 4 : 6),
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
      ev.damage = normalDamage(u.character, u.stats[3], v.stats[5], a.damage, crit);
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
      const cap = h.kick ? KICK.knockback : 4 * Q;
      if (h.kick || u.recoilLeft === 0) {
        [u.kx, u.ky] = len > cap ? norm(h.x, h.y, cap) : [h.x, h.y];
      }
      if (h.kick) {
        u.recoilLeft = KICK.recoilTicks;
        u.stunnedUntil = s.tick + KICK.recoilTicks + KICK.recoveryTicks;
        // Resolution remains simultaneous; only future pending actions are interrupted.
        if (u.attack) {
          s.events.push({ tick:s.tick, kind:"canceled", actor:u.id, target:u.attack.target, attack:u.attack, reason:"kick_recoil" });
          s.counts.canceled++; u.attack = null;
        }
        u.kick = null;
        u.cast = null;
        if(u.lock) u.lock={...u.lock,phase:"prone",due:s.tick+KICK.recoilTicks+KICK.recoveryTicks+LOCK.recovery};
      }
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
      u.kick = null; u.cast = null; u.lock=null;
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
    configSchemaVersion: 2,
    resultSchemaVersion: 5,
    combatModifiers: { ...COMBAT_MODIFIERS },
    statMultipliers: { A: STAT_MULTIPLIERS[characterOf(s.config,"A")], B: STAT_MULTIPLIERS[characterOf(s.config,"B")] },
    effectiveStats: { A: effectiveStats(characterOf(s.config,"A"), s.config.A.stats), B: effectiveStats(characterOf(s.config,"B"), s.config.B.stats) },
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
