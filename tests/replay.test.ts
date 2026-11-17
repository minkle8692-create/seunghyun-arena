import {test,expect} from 'vitest';
import {EXCHANGES,REPLAY_DURATION,replayFrame,standing} from '../src/replay';
test('reference order: opening rise, repeated high/turn parries, jump then counter, final at 8.68',()=>{
 expect(REPLAY_DURATION).toBe(8.8);expect(EXCHANGES.length).toBe(21);
 expect(EXCHANGES.map(e=>e.at)).toEqual([...EXCHANGES.map(e=>e.at)].sort((a,b)=>a-b));
 expect(EXCHANGES.filter(e=>e.actor==='left'&&e.at<4.78)).toHaveLength(13);
 expect(replayFrame(5.22).jump).toBeGreaterThan(50);
 expect(replayFrame(6.03).event.move).toBe('low');
 expect(replayFrame(8.68).flash).toBe(true);expect(replayFrame(8.8).flash).toBe(false);
});
test('real joint motion and contact hold: extended kick, opposite planted leg, distinct counter poses',()=>{
 const kick=replayFrame(1.60);expect(kick.left.foot[0]).toBe(88);expect(kick.left.foot[1]).toBe(-44);expect(kick.left.backFoot[1]).toBe(50);
 expect(kick.right.hand).not.toEqual(standing().hand);expect(kick.hpRight).toBe(100);
 expect(replayFrame(1.58).left).toEqual(replayFrame(1.62).left);
 expect(replayFrame(1.4).left).not.toEqual(kick.left);
 expect(replayFrame(6.03).right.hip[1]).toBe(26);expect(replayFrame(6.28).right.hand[0]).toBe(80);
 expect(replayFrame(6.65).right.foot[1]).toBe(-12);
});
test('bounded deterministic pure timeline, no accumulated HP, NaN/endpoint handling',()=>{
 const end=replayFrame(8.8);for(let i=0;i<=880;i++){const f=replayFrame(i/100);expect(f.hpLeft).toBeGreaterThanOrEqual(0);expect(f.hpLeft).toBeLessThanOrEqual(100);expect(f.jump).toBeGreaterThanOrEqual(0);for(const p of [f.left,f.right])for(const v of Object.values(p))expect(v.every(Number.isFinite)).toBe(true);}
 expect(replayFrame(8.8)).toEqual(end);expect(replayFrame(-1).t).toBe(0);expect(replayFrame(NaN).t).toBe(0);expect(replayFrame(999).t).toBe(8.8);expect(replayFrame(0).hpLeft).toBe(100);
});
