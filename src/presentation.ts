import { identity, type Character, type Battle } from './sim';
export const actorScale = (team: 'A' | 'B' | Character) => identity(team) === 'adult' ? 1.4 : identity(team) === 'seokho' ? 1.22 : 1.05;
export function cries(outcome: Battle['outcome'], team: 'A' | 'B', hp: number) {
  return hp > 0 && outcome === `${team}_win`;
}
export function sobFrame(clock: number, id: number, reduced: boolean) {
  const phase = clock / 150 + id * 0.7;
  return { bob: reduced ? 0 : Math.sin(phase) * 1.5,
    angle: reduced ? 0 : Math.sin(phase) * 5,
    drop: reduced ? 4 : ((clock / 65 + id * 3) % 12) };
}
