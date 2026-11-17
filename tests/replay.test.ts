import {test,expect} from 'vitest';
import {EXCHANGES,FINAL_CONTACT_FRAME,POSE_TIMELINE,REPLAY_DURATION,SOURCE_TIMES,replayFrame,sourceFrame,stepSourceFrame} from '../src/replay';
test('observed 264-frame clock and ordered fifteen parries / ten counter contacts',()=>{
 expect(SOURCE_TIMES).toHaveLength(264);expect(SOURCE_TIMES.at(-1)).toBe(263/30);
 expect(EXCHANGES.filter(e=>e.kind==='parry').map(e=>e.frame)).toEqual([7,17,26,35,45,55,64,79,89,98,107,117,126,135,156]);
 expect(EXCHANGES.filter(e=>e.kind==='hit').map(e=>e.frame)).toEqual([170,179,186,218,227,234,242,250,256,260]);
 expect(POSE_TIMELINE.map(k=>k.frame)).toEqual([...new Set(POSE_TIMELINE.map(k=>k.frame))].sort((a,b)=>a-b));
});
test('HP only steps at damaging contact; no early KO, no parry damage; final exact zero',()=>{
 let previous=100;
 for(let n=0;n<264;n++){
  const f=replayFrame(n/30),event=EXCHANGES.find(e=>e.frame===n);
  expect(f.hpLeft).toBe(previous-(event?.damage??0));expect(f.hpRight).toBe(100);
  expect(f.ko).toBe(n>=FINAL_CONTACT_FRAME);expect(f.hpLeft).toBeGreaterThanOrEqual(0);
  if(n<FINAL_CONTACT_FRAME)expect(f.hpLeft).toBeGreaterThan(0);else expect(f.hpLeft).toBe(0);
  previous=f.hpLeft;
 }
 expect(replayFrame(260/30-1e-6).hpLeft).toBe(19);expect(replayFrame(260/30).hpLeft).toBe(0);
 expect(replayFrame(263/30).fall).toBe(1);expect(replayFrame(259/30).loser).toBe(null);
});
test('observed jump, landing, super freeze, torso turn and final rising fist pose',()=>{
 expect(replayFrame(145/30).jump).toBeGreaterThan(0);expect(replayFrame(156/30).jump).toBe(85);
 expect(replayFrame(175/30).jump).toBe(0);expect(replayFrame(177/30).right.hip[1]).toBe(22);
 expect(replayFrame(198/30).right).toEqual(replayFrame(215/30).right);
 expect(replayFrame(198/30).rightX).toBe(replayFrame(217/30).rightX);expect(replayFrame(198/30).leftX).toBe(replayFrame(217/30).leftX);expect(replayFrame(198/30).hitstop).toBe(true);expect(replayFrame(76/30).yaw).toBeGreaterThan(2);
 expect(replayFrame(260/30).right.hand[1]).toBeLessThan(replayFrame(260/30).right.elbow[1]);
 for(const e of EXCHANGES){const f=replayFrame(e.at);expect(f.spark).toBe(true);expect(f.hitstop).toBe(true);
  if(e.kind==='parry'){const guard=e.move==='rise'?f.right.foot:f.right.hand;expect(f.leftX+f.left.foot[0]).toBeCloseTo(f.rightX-guard[0]);expect(f.left.foot[1]).toBeCloseTo(guard[1]-f.jump);}
 }
});
test('source frame stepping is adjacent, bounded and reversible; playback / arbitrary seek pure',()=>{
 for(let n=0;n<264;n++){
  expect(sourceFrame(SOURCE_TIMES[n])).toBe(n);
  expect(stepSourceFrame(n/30,1)).toBe(Math.min(263,n+1)/30);
  expect(stepSourceFrame(n/30,-1)).toBe(Math.max(0,n-1)/30);
  const f=replayFrame(n/30);expect(replayFrame(n/30+.001).left).toEqual(f.left);
  for(const p of [f.left,f.right])for(const xy of Object.values(p))expect(xy.every(Number.isFinite)).toBe(true);
 }
 expect(stepSourceFrame(REPLAY_DURATION,-1)).toBe(262/30);expect(replayFrame(NaN).frame).toBe(0);expect(replayFrame(999).t).toBe(8.8);
 const end=replayFrame(8.8);replayFrame(0);expect(replayFrame(8.8)).toEqual(end);
});
