import type { summarize } from "./sim";
type Result = ReturnType<typeof summarize>;
export function aggregate(rows: Result[]) {
  const valid = rows.filter((r) => r.outcome !== null);
  const N = valid.length;
  const sum = (f: (r: Result) => number) => valid.reduce((n, r) => n + f(r), 0);
  const count = (o: string) => valid.filter((r) => r.outcome === o).length;
  const hits = sum((r) => r.counts.hit),
    dodges = sum((r) => r.counts.dodge),
    crits = sum((r) => r.counts.crit);
  const resolved = valid.filter((r) => r.outcome !== "timeout");
  return {
    N,
    A: count("A_win"),
    B: count("B_win"),
    draw: count("draw"),
    timeout: count("timeout"),
    hits,
    dodges,
    crits,
    critRate: hits ? crits / hits : null,
    hitRate: hits + dodges ? hits / (hits + dodges) : null,
    meanSeconds: N ? sum((r) => r.tick / 30) / N : null,
    resolvedMeanSeconds: resolved.length
      ? resolved.reduce((n, r) => n + r.tick / 30, 0) / resolved.length
      : null,
    meanAliveA: N ? sum((r) => r.A.alive) / N : null,
    meanAliveB: N ? sum((r) => r.B.alive) / N : null,
  };
}
