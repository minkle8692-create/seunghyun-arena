import {it,expect} from 'vitest';
import {createBattle,DEFAULT,step,Q,R,KICK,damage,normalDamage,normalDelay,attackDelay} from '../src/sim';
it('A rounds normal damage x1.3 exactly once, B damage unchanged; adult intervals explicitly faster',()=>{
 for(const crit of [false,true]) for(let p=1;p<=10;p++) {
 const d=damage(p,15,97,crit);
 expect(normalDamage('A',p,15,97,crit)).toBe(Math.floor((d*13+5)/10));
 expect(normalDamage('B',p,15,97,crit)).toBe(d);
 }
 for(let speed=5;speed<=50;speed+=5) for(const fatigue of [0,500,1000]){
 expect(normalDelay('B',speed,fatigue)).toBeLessThan(attackDelay(speed,fatigue));
 expect(normalDelay('B',speed,fatigue)).toBeGreaterThanOrEqual(4);
 }
});
it('44px smooth actual recoil; no AI walk-back or attacks during recovery; wall clamps',()=>{
 for(const wall of [false,true]){
 const s=createBattle({A:{...DEFAULT.A,count:1},B:{...DEFAULT.B,count:1}},3);
 const [a,b]=s.units;
 b.x=(wall?340:160)*Q;b.y=250*Q;a.x=b.x+30*Q;a.y=b.y;
 a.attack={target:b.id,due:999,serial:1,hit:0,damage:100,crit:999};
 b.kick={due:1,dx:Q,dy:0}; b.next=999;b.kickNext=999;
 step(s);b.attack={target:a.id,due:999,serial:1,hit:0,damage:100,crit:999};const start=a.x;let last=a.x;
 for(let i=0;i<KICK.recoilTicks;i++) {step(s);expect(a.x).toBeGreaterThanOrEqual(last);expect(a.x-last).toBeLessThanOrEqual(4*Q);last=a.x;expect(a.attack).toBeNull();}
 expect((a.x-start)/Q).toBeCloseTo(wall?6:44,2);
 for(let i=0;i<KICK.recoveryTicks;i++){step(s);expect(a.x).toBe(last);expect(a.attack).toBeNull();}
 expect(a.x).toBeLessThanOrEqual(384*Q-R);
 }
});
it('actual adult normal attack starts are faster with identical effective stats and no kick',()=>{
 const s=createBattle({A:{...DEFAULT.A,count:1},B:{...DEFAULT.B,count:1}},8);
 const [a,b]=s.units;a.x=160*Q;b.x=180*Q;a.y=b.y=250*Q;
 a.stats=[7,7,9,8,30,3];b.stats=[...a.stats];b.kickNext=99999;
 const starts:number[][]=[[],[]];
 for(let i=0;i<90;i++){
 for(const u of s.units){u.hp=u.maxHp=10000000;u.energy=u.maxEnergy=10000000;u.kx=u.ky=0;u.x=(u.id===0?160:180)*Q;}
 step(s);for(const u of s.units)if(u.attack?.due===s.tick+(u.team==='B'?4:6))starts[u.id].push(s.tick);
 }
 expect(starts[1].length).toBeGreaterThan(starts[0].length);
});
