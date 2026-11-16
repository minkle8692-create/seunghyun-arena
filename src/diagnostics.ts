import * as sim from "./sim";
export function installDiagnostics(snapshot?: () => sim.Battle) {
  Object.assign(window, {
    arenaDiagnostics: {
      ...sim,
      snapshot,
      worker: () =>
        new Worker(new URL("./batch.worker.ts", import.meta.url), {
          type: "module",
        }),
    },
  });
}
