import { it, expect } from 'vitest';
import { createBattle, DEFAULT, MAGE_STATS, MAGE, Q, R, W, H, step, stateHash, summarize, normalDamage, damage, type Character } from '../src/sim';
import { readSaved, save } from '../src/storage';
const config=(a:Character='mage',b:Character='youth')=>({A:{count:1,stats:[...MAGE_STATS] as typeof MAGE_STATS,character:a},B:{count:1,stats:[...MAGE_STATS] as typeof MAGE_STATS,character:b}});
function fixture(){const s=createBattle(config(),19);const [m,e]=s.units;m.x=160*Q;e.x=260*Q;m.y=e.y=256*Q;e.next=10000;e.stunnedUntil=10000;return s;}
it('identity, not slot, determines every buff, kick and visual archetype',()=>{
 for(const a of ['youth','adult','mage'] as Character[]) for(const b of ['youth','adult','mage'] as Character[]){
  const s=createBattle(config(a,b),1);
  for(const u of s.units) expect(u.stats).toEqual(MAGE_STATS.map(n=>n*(u.character==='adult'?5:1)));
  expect(summarize(s).effectiveStats.A).toEqual(s.units[0].stats);
  for(const u of s.units){u.x=(180+u.id*20)*Q;u.y=250*Q;}
  step(s); for(const u of s.units) if(u.kick) expect(u.character).toBe('adult');
 }
 expect(normalDamage('mage',6,5,100,false)).toBe(damage(6,5,100,false));
 const old={A:{count:50,stats:DEFAULT.A.stats},B:{count:1,stats:DEFAULT.B.stats}};
 expect(createBattle(old,1).config).toEqual(DEFAULT);
 expect(createBattle(config('mage'),1).configHash).not.toBe(createBattle(config('youth'),1).configHash);
});
it('mage flees close enemies before casting, uses hysteresis and holds still through cast/recovery',()=>{
 const s=fixture(),[m,e]=s.units;e.x=210*Q;
 step(s); expect(m.x).toBeLessThan(160*Q);expect(m.cast).toBeNull();expect(m.fleeing).toBe(true);
 // Hysteresis: 90 is above trigger but below safe distance.
 e.x=m.x+90*Q;step(s);expect(m.fleeing).toBe(true);
 e.x=m.x+115*Q;step(s);expect(m.fleeing).toBe(false);expect(m.cast).not.toBeNull();
 const pos=[m.x,m.y],energy=m.energy;
 while(m.cast){step(s);expect([m.x,m.y]).toEqual(pos);expect(m.energy).toBe(energy);}
 expect(s.projectiles.length).toBe(1);
 for(let i=0;i<MAGE.recovery;i++){step(s);expect([m.x,m.y]).toEqual(pos);}
});
it('stationary telegraph pays stamina once, cooldown and projectile first-body blocking; no adult buffs',()=>{
 const s=fixture(),m=s.units[0],initial=m.energy;step(s);
 expect(m.energy).toBe(initial-MAGE.cost);expect(m.cast?.due).toBe(1+MAGE.windup);
 while(s.tick<1+MAGE.windup)step(s);
 expect(s.projectiles.length).toBe(1);const hp=s.units[1].hp;
 for(let i=0;i<20;i++)step(s);
 expect(s.units[1].hp).toBeLessThan(hp);expect(m.cast).toBeNull();
 const low=fixture();low.units[0].energy=MAGE.cost-1;low.units[0].last=0;step(low);expect(low.units[0].cast).toBeNull();
 const cd=fixture();cd.units[0].castNext=100;step(cd);expect(cd.units[0].cast).toBeNull();
 for(const friendly of [true,false]) {
  const x=createBattle({A:{...config().A,count:2},B:config().B},1);const [caster,body,enemy]=x.units;
  caster.x=100*Q;body.x=130*Q;enemy.x=170*Q;for(const u of x.units){u.y=200*Q;u.stunnedUntil=1000;}
  if(!friendly)body.team='B';
  x.projectiles.push({id:1,actor:caster.id,team:'A',x:110*Q,y:200*Q,vx:7*Q,vy:0,left:150*Q,power:6,skill:8});
  const before=enemy.hp,bodyHp=body.hp;for(let i=0;i<10;i++)step(x);
  expect(enemy.hp).toBe(before);expect(body.hp).toBe(friendly?bodyHp:bodyHp-Math.floor(damage(6,body.stats[5],100,false)*1.24));expect(x.projectiles).toHaveLength(0);
 }
});
it('magic and melee simultaneous KO is a draw, projectiles stop at walls',()=>{
 const s=fixture(),[m,e]=s.units;m.hp=e.hp=1;m.x=150*Q;e.x=170*Q;e.stunnedUntil=0;
 m.stunnedUntil=10;m.castNext=1000;m.next=1000;e.next=1000;e.attack={target:0,due:1,serial:1,hit:0,damage:100,crit:5};
 s.projectiles.push({id:1,actor:0,team:'A',x:159*Q,y:m.y,vx:7*Q,vy:0,left:150*Q,power:6,skill:8});step(s);expect(s.outcome).toBe('draw');
 const w=fixture();w.projectiles.push({id:1,actor:0,team:'A',x:W-Q,y:Q,vx:7*Q,vy:0,left:150*Q,power:6,skill:8});step(w);expect(w.projectiles).toHaveLength(0);
});
it('mage deterministic mirror/mixed runs and 200-unit bounded safety',()=>{
 for(const opponent of ['mage','youth','adult'] as Character[]){
  const a=createBattle(config('mage',opponent),7),b=createBattle(config('mage',opponent),7);b.units.reverse();
  for(let i=0;i<600&&!a.outcome;i++){step(a);step(b);expect(stateHash(a)).toBe(stateHash(b));}
 }
 const s=createBattle({A:{...config().A,count:100},B:{...config('mage','mage').B,count:100}},3);let max=0;
 for(let i=0;i<600&&!s.outcome;i++){
  step(s);max=Math.max(max,s.projectiles.length);
  for(const u of s.units){expect(u.x>=R&&u.x<=W-R&&u.y>=R&&u.y<=H-R).toBe(true);expect([u.hp,u.energy,u.x,u.y].every(Number.isFinite)).toBe(true);}
 }
 expect(max).toBeLessThanOrEqual(200);
},20000);
it('legacy saved slot configuration migrates; schema2 preserves selected archetypes',()=>{
 const map=new Map<string,string>();Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>map.set(k,v)}});
 map.set('old',JSON.stringify({schema:1,config:{A:{count:1,stats:DEFAULT.A.stats},B:{count:1,stats:DEFAULT.B.stats}}}));
 expect(readSaved('old').config?.B.character).toBe('adult');save('new',config('adult','mage'));expect(readSaved('new').config).toEqual(config('adult','mage'));
 delete (globalThis as any).localStorage;
});
it('mage six stats change actual coefficients and cast damage without inherited modifiers',()=>{
 const results:number[]=[];
 for(let index=0;index<6;index++){
  const a=fixture(),b=fixture();const c=config();c.A.stats[index]++;const higher=createBattle(c,19);b.units[0].stats=higher.units[0].stats;b.units[0].maxHp=higher.units[0].maxHp;b.units[0].maxEnergy=higher.units[0].maxEnergy;
  const m=a.units[0],n=b.units[0];
  if(index===0)expect(n.maxHp).toBeGreaterThan(m.maxHp);
  if(index===1){expect(n.maxEnergy).toBeGreaterThan(m.maxEnergy);m.energy=n.energy=0;step(a);step(b);expect(n.energy).toBeGreaterThan(m.energy);}
  if(index===2||index===3){for(let tick=0;tick<50;tick++){step(a);step(b);}expect(b.units[1].hp).toBeLessThan(a.units[1].hp);results.push(a.units[1].hp-b.units[1].hp);}
  if(index===4){m.castNext=n.castNext=100;a.units[1].x=b.units[1].x=210*Q;step(a);step(b);expect(n.x).toBeLessThan(m.x);}
  if(index===5)expect(damage(6,n.stats[5],100,false)).toBeLessThan(damage(6,m.stats[5],100,false));
 }
 expect(results.every(n=>n>0)).toBe(true);
});
it('a projectile cannot hit beyond its remaining travel distance',()=>{
 const s=fixture(),[m,e]=s.units;m.stunnedUntil=100;e.x=200*Q;const hp=e.hp;
 s.projectiles.push({id:1,actor:0,team:'A',x:188*Q,y:e.y,vx:7*Q,vy:0,left:2*Q,power:6,skill:8});step(s);expect(e.hp).toBe(hp);expect(s.projectiles).toHaveLength(0);
});
