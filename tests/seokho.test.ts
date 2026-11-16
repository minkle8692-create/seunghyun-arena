import {it,expect} from 'vitest';
import {createBattle,DEFAULT,LOCK,Q,step,damage,effectiveStats,normalDelay,attackDelay,canonical,stateHash,type Config,type Event} from '../src/sim';
const config:Config={A:{count:1,character:'seokho',stats:[7,7,9,8,6,3]},B:{count:1,character:'youth',stats:[10,10,1,1,1,10]}};
function fixture(seed=5){const s=createBattle(config,seed),[a,b]=s.units;a.x=140*Q;b.x=230*Q;a.y=b.y=250*Q;b.stunnedUntil=9999;b.hp=b.maxHp=100000;return s;}
it('exact half effective stats in both slots; no adult speed or kick and legacy defaults unchanged',()=>{
 expect(effectiveStats('seokho',DEFAULT.B.stats)).toEqual([17.5,17.5,22.5,20,15,7.5]);
 expect(normalDelay('seokho',15,1000)).toBe(attackDelay(15,1000));
 const s=createBattle({A:config.A,B:config.A},3);expect(s.units[0].stats).toEqual(s.units[1].stats);
 expect(canonical({A:{count:50,stats:DEFAULT.A.stats},B:{count:1,stats:DEFAULT.B.stats}})).toEqual(DEFAULT);
 expect(s.units[0].maxHp).toBe(21250);
});
it('ordered lock dash left right prone; distinct IDs, first landed crit only; recovery alive stationary',()=>{
 const s=fixture(),a=s.units[0],events:Event[]=[];
 while(s.tick<160){step(s);events.push(...s.events);if(a.lock?.phase==='prone')break;}
 const seq=events.filter(e=>e.kind.startsWith('lock_'));
 expect(seq.map(e=>e.kind)).toEqual(['lock_start','lock_dash','lock_left','lock_right','lock_prone']);
 const left=seq[2],right=seq[3];expect(left.reason).toBe('critical');expect(right.reason).toBe('normal');
 expect(left.attack!.serial).not.toBe(right.attack!.serial);
 expect(left.damage).toBe(damage(20,10,left.attack!.damage,true));
 expect(s.counts.lockHit).toBe(2);expect(s.counts.lockCrit).toBe(1);expect(s.counts.hit).toBe(0);
 const position=[a.x,a.y],hp=a.hp,until=a.lock!.due;
 while(s.tick<until-1){step(s);expect([a.x,a.y]).toEqual(position);expect(a.hp).toBe(hp);expect(a.attack).toBeNull();}
 expect(a.hp).toBeGreaterThan(0);step(s);expect(a.lock).toBeNull();
 expect(a.energy).toBe(a.maxEnergy-LOCK.cost);
});
it('no stamina/cooldown spam, blocked dash cannot cross allies; range miss does not auto-hit',()=>{
 const s=fixture();s.units[0].energy=0;step(s);expect(s.units[0].lock).toBeNull();
 const b=createBattle({...config,A:{...config.A,count:2}},5),[a,ally,target]=b.units;
 a.x=100*Q;ally.x=140*Q;target.x=200*Q;a.y=ally.y=target.y=250*Q;
 ally.stunnedUntil=target.stunnedUntil=9999;target.hp=100000;
 const events:Event[]=[];for(let i=0;i<130;i++){step(b);events.push(...b.events);expect(a.x).toBeLessThan(ally.x);}
 expect(events.filter(e=>e.actor===a.id&&e.kind==='lock_start')).toHaveLength(1);
 expect(events.filter(e=>e.actor===a.id&&['lock_left','lock_right'].includes(e.kind)).every(e=>!e.damage)).toBe(true);
});
it('target death cancels without reacquiring; KO clears sequence',()=>{
 const s=fixture();step(s);s.units[1].hp=0;step(s);expect(s.units[0].lock?.phase).toBe('prone');
 const t=fixture();step(t);t.units[0].hp=1;
 t.projectiles.push({id:1,actor:1,team:'B',x:t.units[0].x,y:t.units[0].y,vx:256,vy:0,left:2560,power:50,skill:50});
 step(t);expect(t.units[0].hp).toBe(0);expect(t.units[0].lock).toBeNull();
});
it('first miss allows right as first landed critical; ordinary hits remain probabilistic',()=>{
 let found=false;
 for(let seed=0;seed<200&&!found;seed++){
  const s=fixture(seed);s.units[1].stats=[10,10,22.5,1,1,10];const ev:Event[]=[];
  for(let i=0;i<120;i++){step(s);ev.push(...s.events);}
  const left=ev.find(e=>e.kind==='lock_left'),right=ev.find(e=>e.kind==='lock_right');
  if(left?.reason==='miss'&&right?.damage){expect(right.reason).toBe('critical');found=true;}
 }expect(found).toBe(true);
});
it('same seed determinism with mirror fractional archetypes, finite outputs and simultaneous signature damage',()=>{
 const c={A:config.A,B:config.A};const a=createBattle(c,37),b=createBattle(c,37);
 for(let i=0;i<600&&!a.outcome;i++){step(a);step(b);expect(stateHash(a)).toBe(stateHash(b));for(const u of a.units)expect([u.x,u.y,u.hp,u.energy].every(Number.isFinite)).toBe(true);}
 const s=createBattle(c,1);for(const [i,u]of s.units.entries()){u.x=(180+i*20)*Q;u.y=250*Q;u.hp=1;u.rng=0;u.lock={target:1-i,phase:'left',due:1,began:0,serial:1,landed:false};u.stats=[17.5,17.5,50,20,15,7.5];}
 step(s);expect(s.outcome).toBe('draw');
});
