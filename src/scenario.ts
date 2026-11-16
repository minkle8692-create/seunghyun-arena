import { DEFAULT, type Config } from './sim';
export const SCENARIO_SEED = 20261116;
export function scenarioConfig(): Config {
  return { A: { character: 'adult', count: 1, stats: [...DEFAULT.B.stats] },
    B: { character: 'seokho', count: 1, stats: [...DEFAULT.B.stats] } };
}
export const SCENARIO_CHAPTERS = [
  { title: '두 남자, 하나의 경기장', line: '35세 승현 VS 25세 석호 · 마지막까지 서 있는 한 사람' },
  { title: '35세 승현 · 회전의 힘', line: '전방위 회전킥과 빠른 연타. 기회가 오면 단숨에 밀어낸다.' },
  { title: '25세 석호 · 자신있게 맞아줄게', line: '낮게 앉아 무릎 탁탁. 록온 뒤 오른손, 왼손! 그리고… 사과할 시간.' },
];
export function scenarioCaption(kind?: string): string {
  if (kind?.startsWith('kick')) return '35세 승현 · 몸을 돌려 회전킥!';
  if (kind === 'lock_start') return '25세 석호 · 록온! 자신있게 맞아줄게';
  if (kind === 'lock_dash') return '25세 석호 · 목표를 향해 돌진';
  if (kind === 'lock_right') return '25세 석호 · 오른손 먼저! 명중하면 치명타';
  if (kind === 'lock_left') return '25세 석호 · 이어지는 왼손';
  if (kind === 'lock_prone') return '25세 석호 · 내가 잘못했어 ㅠㅠ';
  return '각자의 기술이 부딪히는 순간 · 승패는 실제 전투로 결정됩니다';
}
