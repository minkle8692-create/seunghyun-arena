import {
  createBattle,
  step,
  summarize,
  trialSeed,
  stateHash,
  VERSION,
  type Battle,
  type Config,
} from "./sim";
type Job = {
  id: number;
  config: Config;
  seed: number;
  total: number;
  index: number;
  state: Battle | null;
  results: unknown[];
  paused: boolean;
  trace: boolean;
  configHash: string;
  lastReport: number;
  hashes: string[];
};
let job: Job | null = null;
function send(status: string, extra = {}) {
  if (job)
    postMessage({
      jobId: job.id,
      simVersion: VERSION,
      configHash: job.configHash,
      tick: job.state?.tick ?? 0,
      seed: job.seed,
      trialIndex: job.index,
      status,
      results: job.results,
      total: job.total,
      ...extra,
    });
}
onmessage = (e: MessageEvent) => {
  const m = e.data;
  if (m.type === "start") {
    if (job) return;
    job = {
      id: m.jobId,
      config: m.config,
      seed: m.seed,
      total: m.total ?? 100,
      index: 0,
      state: null,
      results: [],
      paused: false,
      trace: !!m.trace,
      configHash: "",
      lastReport: performance.now(),
      hashes: [],
    };
    send("running");
    setTimeout(chunk, 0);
  } else if (job && m.jobId === job.id) {
    if (m.type === "pause") {
      job.paused = true;
      send("paused");
    }
    if (m.type === "resume" && job.paused) {
      job.paused = false;
      send("running");
      setTimeout(chunk, 0);
    }
    if (m.type === "cancel" && job) {
      send("canceled", { canceled: 1, unstarted: job.total - job.index - 1 });
      job = null;
    }
  }
};
function chunk() {
  if (!job || job.paused) return;
  const deadline = performance.now() + 12;
  try {
    while (job && performance.now() < deadline) {
      if (!job.state)
        job.state = createBattle(job.config, trialSeed(job.seed, job.index));
      step(job.state);
      job.configHash = job.state.configHash;
      if (job.trace) job.hashes.push(stateHash(job.state));
      if (job.state.outcome) {
        job.results.push({
          ...summarize(job.state),
          trialIndex: job.index,
          stateHash: stateHash(job.state),
          ...(job.trace ? { hashes: job.hashes } : {}),
        });
        job.index++;
        job.state = null;
        job.hashes = [];
        send(job.index === job.total ? "complete" : "running");
        if (job.index === job.total) {
          job = null;
          return;
        }
      }
    }
    if (job && performance.now() - job.lastReport >= 250) {
      job.lastReport = performance.now();
      send("running");
    }
    setTimeout(chunk, 0);
  } catch (error) {
    if (!job) return;
    send("error", {
      error: String(error),
      errors: 1,
      unstarted: job.total - job.index - 1,
    });
    job = null;
  }
}
