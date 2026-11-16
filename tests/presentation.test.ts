import { expect, test } from 'vitest';
import { actorScale, cries, sobFrame } from '../src/presentation';
test('only winning survivors cry; draw/timeout/ongoing/dead/losers never cry', () => {
  for (const team of ['A','B'] as const) {
    expect(cries(`${team}_win`,team,1)).toBe(true);
    expect(cries(`${team}_win`,team,0)).toBe(false);
    for (const outcome of [null,'draw','timeout',team==='A'?'B_win':'A_win'] as const)
      expect(cries(outcome,team,1)).toBe(false);
  }
  expect(actorScale('A')).toBeLessThan(actorScale('B'));
});
test('animation freezes with clock and reduced motion is static', () => {
  expect(sobFrame(100,1,false)).toEqual(sobFrame(100,1,false));
  expect(sobFrame(100,1,false)).not.toEqual(sobFrame(250,1,false));
  expect(sobFrame(100,1,true)).toEqual(sobFrame(250,1,true));
});
