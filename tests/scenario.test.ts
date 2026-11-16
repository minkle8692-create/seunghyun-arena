import { expect, test } from 'vitest';
import { createBattle, step, summarize, DEFAULT } from '../src/sim';
import { scenarioConfig, SCENARIO_SEED } from '../src/scenario';
test('scenario uses original stats, exact HP, independent config and reproducible unforced outcome',()=>{
 const c=scenarioConfig(); expect(c.A.count).toBe(1);expect(c.B.count).toBe(1);
 expect(c.A.stats).toEqual(DEFAULT.B.stats);expect(c.B.stats).toEqual(DEFAULT.B.stats);
 const a=createBattle(c,SCENARIO_SEED),b=createBattle(scenarioConfig(),SCENARIO_SEED);
 expect(a.units[1].maxHp).toBe(42500); const events:string[]=[];
 while(!a.outcome){step(a);events.push(...a.events.map(e=>e.kind));}
 while(!b.outcome)step(b);
 expect(summarize(a)).toEqual(summarize(b));
 expect(events).toContain('kick');expect(events).toContain('lock_start');
 c.A.stats[0]=1;expect(scenarioConfig().A.stats[0]).toBe(7);
});
