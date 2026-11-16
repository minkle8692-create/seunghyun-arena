import { it, expect } from 'vitest';
import { createBattle, DEFAULT, effectiveStats, damage, hitThreshold, attackDelay, step, summarize, Q, type Stats } from '../src/sim';
import { readSaved, save } from '../src/storage';
it('applies all six adult inputs once while retaining canonical base config and explicit result semantics', () => {
 const s=createBattle(DEFAULT,1), b=s.units.at(-1)!;
 expect(b.stats).toEqual([35,35,45,40,30,15]);
 expect(s.units[0].stats).toEqual(DEFAULT.A.stats);
 expect(b.maxHp).toBe(37000); expect(b.maxEnergy).toBe(29000);
 expect(s.config.B.stats).toEqual([7,7,9,8,6,3]);
 const r=summarize(s); expect(r.statMultipliers).toEqual({A:1,B:5}); expect(r.effectiveStats.B).toEqual(b.stats);
 expect(createBattle(s.config,1).units.at(-1)!.stats).toEqual(b.stats);
});
it('each effective stat affects its actual engine coefficient without a clamp back to ten', () => {
 const make=(stats:Stats)=>createBattle({A:{...DEFAULT.A,count:1}, B:{count:1,stats}},3);
 const base:Stats=[3,3,3,3,3,3];
 for(let i=0;i<6;i++) {
  const next=[...base] as Stats; next[i]++;
  const x=make(base), y=make(next), a=x.units[1],b=y.units[1];
  expect(b.stats[i]).toBe(20); expect(a.stats[i]).toBe(15);
  if(i===0) expect(b.maxHp).toBeGreaterThan(a.maxHp);
  if(i===1) { expect(b.maxEnergy).toBeGreaterThan(a.maxEnergy); a.energy=b.energy=0; step(x);step(y);expect(b.energy).toBeGreaterThan(a.energy); }
  if(i===2) expect(hitThreshold(b.stats[2],15)).toBeGreaterThan(hitThreshold(a.stats[2],15));
  if(i===3) expect(damage(b.stats[3],15,100,false)).toBeGreaterThan(damage(a.stats[3],15,100,false));
  if(i===4) { step(x);step(y);expect(b.y).toBeLessThan(a.y);expect(attackDelay(b.stats[4],1000)).toBeLessThan(attackDelay(a.stats[4],1000)); }
  if(i===5) expect(damage(15,b.stats[5],100,false)).toBeLessThan(damage(15,a.stats[5],100,false));
 }
});
it('extended range damage stays positive, probabilities bounded and timers finite at every supported input',()=>{
 for(let a=1;a<=50;a++) for(let b=1;b<=50;b++) {
  expect(damage(a,b,95,false)).toBeGreaterThan(0);
  expect(damage(a,b,105,true)).toBeLessThan(30000);
  expect(hitThreshold(a,b)).toBeGreaterThanOrEqual(50);expect(hitThreshold(a,b)).toBeLessThanOrEqual(950);
  for(const f of [0,1000]) {const delay=attackDelay(a,f);expect(Number.isInteger(delay)).toBe(true);expect(delay).toBeGreaterThanOrEqual(6);}
 }
 const s=createBattle({A:{count:100,stats:[10,10,10,10,10,10]},B:{count:100,stats:[10,10,10,10,10,10]}},7);
 for(let i=0;i<600&&!s.outcome;i++) {step(s);for(const e of s.events) if(e.attack&&['hit','crit','dodge','invalid'].includes(e.kind)) expect(s.units[e.actor].next).toBeGreaterThanOrEqual(s.tick);}
 expect(s.units.every(u=>[u.hp,u.energy,u.x,u.y,u.next].every(Number.isFinite)&&u.hp>=0&&u.energy>=0)).toBe(true);
},15000);
it('old saved base settings load without multiplying storage and new saves round-trip unchanged',()=>{
 const map=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)}});
 map.set('old',JSON.stringify({schema:1,config:DEFAULT}));
 const c=readSaved('old').config!;expect(c).toEqual(DEFAULT);
 save('new',c);expect(readSaved('new').config).toEqual(c);
 expect(effectiveStats('B',readSaved('new').config!.B.stats)).toEqual([35,35,45,40,30,15]);
 delete (globalThis as any).localStorage;
});
