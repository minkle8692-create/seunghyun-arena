import {test,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const dir=`evidence/frame-revision/${process.env.LIVE?'live':'local'}`;
test.beforeAll(()=>mkdirSync(dir,{recursive:true}));
test('mage selection, actual flee-stop-cast-projectile and bounded renderer hit feedback on mobile',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 await page.getByLabel('A 캐릭터',{exact:true}).selectOption('mage');await page.getByLabel('B 캐릭터',{exact:true}).selectOption('youth');
 await page.getByLabel('A 인원',{exact:true}).fill('3');await page.getByLabel('B 인원',{exact:true}).fill('3');
 await expect(page.getByTestId('effective-A')).toContainText('14세 동우 ×1');await expect(page.getByTestId('effective-B')).toContainText('14세 승현 ×1');
 await page.evaluate(()=>{(window as any).mageFrames=[];(window as any).mageTimer=setInterval(()=>{
 const s=(window as any).arenaDiagnostics.snapshot();const arena=document.querySelector('.arena')!;
 if(s.tick>0)(window as any).mageFrames.push({tick:s.tick,outcome:s.outcome,units:s.units.map((u:any)=>({id:u.id,character:u.character,team:u.team,x:u.x,y:u.y,hp:u.hp,cast:u.cast,fleeing:u.fleeing})),events:s.events,projectiles:s.projectiles,render:JSON.parse(arena.getAttribute('data-render')||'[]'),feedback:JSON.parse(arena.getAttribute('data-feedback')||'{}')});
 if((window as any).mageFrames.length>5000)(window as any).mageFrames.shift();},16);});
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.arena')!.getAttribute('data-render')!).some((u:any)=>u.cast),{},{polling:16});
 await page.screenshot({path:`${dir}/mage-cast.png`,fullPage:true});
 await page.waitForFunction(()=>{const f=(window as any).mageFrames;return f.some((f:any)=>f.events.some((e:any)=>e.kind==='spell_hit'))&&f.some((f:any)=>f.units.some((u:any)=>u.fleeing))&&f.some((f:any)=>f.feedback.particles>0);},{},{timeout:60000,polling:16});
 await page.waitForFunction(()=>{
  const f=(window as any).mageFrames;
  return f.some((row:any,i:number)=>{
    if(!i||row.tick===f[i-1].tick)return false;
    return row.units.some((u:any)=>{const prev=f[i-1].units.find((v:any)=>v.id===u.id);
      if(u.character!=='mage'||!prev.fleeing||prev.cast)return false;
      const enemies=f[i-1].units.filter((v:any)=>v.team!==prev.team&&v.hp>0).sort((a:any,b:any)=>Math.hypot(a.x-prev.x,a.y-prev.y)-Math.hypot(b.x-prev.x,b.y-prev.y));
      return enemies[0]&&(u.x-prev.x)*(enemies[0].x-prev.x)+(u.y-prev.y)*(enemies[0].y-prev.y)<0;
    });
  }) && f.some((row:any)=>row.tick>120&&row.events.some((e:any)=>e.kind==='spell_cast'));
 },{},{timeout:30000,polling:16});
 await page.screenshot({path:`${dir}/mage-kite-cycle.png`});
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();await page.waitForTimeout(100);
 const frames:any[]=await page.evaluate(()=>{clearInterval((window as any).mageTimer);return (window as any).mageFrames;});
 expect(frames.some(f=>f.projectiles.length>0)).toBe(true);expect(frames.some(f=>f.render.some((u:any)=>u.hitStop))).toBe(true);
 expect(Math.max(...frames.map(f=>f.feedback.particles||0))).toBeLessThanOrEqual(120);
 const castGroups=new Map<string,any[]>();for(const f of frames)for(const u of f.units)if(u.cast){const key=`${u.id}-${u.cast.due}`;const a=castGroups.get(key)||[];a.push(u);castGroups.set(key,a);}
 expect([...castGroups.values()].some(g=>g.length>5 && new Set(g.map(u=>`${u.x},${u.y}`)).size===1)).toBe(true);
 await page.locator('.logs summary').click();await expect(page.locator('.logs')).toContainText('야심!만만');
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:`${dir}/mage-mobile.png`,fullPage:true});
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);expect(JSON.parse((await page.locator('.arena').getAttribute('data-feedback'))!).shake).toBe(0);
 const before=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot());await page.waitForTimeout(120);expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(before.tick);
 await page.getByRole('button',{name:'↻ 같은 시드 재시작',exact:true}).click();
 await expect.poll(async()=>JSON.parse((await page.locator('.arena').getAttribute('data-feedback'))!).particles).toBe(0);
 expect(errors).toEqual([]);writeFileSync(`${dir}/mage-motion.json`,JSON.stringify({frames,errors,stationaryGroups:[...castGroups.values()].filter(g=>g.length>5&&new Set(g.map(u=>`${u.x},${u.y}`)).size===1).length},null,2));
});
test('mage real Worker100 parity and 200-body mirror safety',async({page})=>{
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 const evidence=await page.evaluate(async()=>{
 const d=(window as any).arenaDiagnostics;const config={A:{count:1,character:'mage',stats:[7,8,8,6,6,5]},B:{count:1,character:'youth',stats:[6,6,6,6,6,6]}};
 const rows:any[]=await new Promise((resolve,reject)=>{const w=d.worker();w.onerror=reject;w.onmessage=(e:any)=>{if(e.data.status==='complete'){w.terminate();resolve(e.data.results);}if(e.data.status==='error'){w.terminate();reject(e.data.error);}};w.postMessage({type:'start',jobId:91,config,seed:0,total:100,trace:true});});
 let ticks=0;for(const r of rows){const s=d.createBattle(config,r.seed);for(const h of r.hashes){d.step(s);if(d.stateHash(s)!==h)throw Error('mage parity '+s.tick);ticks++;}}
 const stress=[];for(const character of ['mage','adult']){const s=d.createBattle({A:{...config.A,count:100},B:{...config.B,count:100,character}},3);let penetration=0,bolts=0;const start=performance.now();for(let i=0;i<900&&!s.outcome;i++){d.step(s);bolts=Math.max(bolts,s.projectiles.length);for(const u of s.units)if(![u.x,u.y,u.hp,u.energy].every(Number.isFinite)||u.x<d.R||u.x>d.W-d.R||u.y<d.R||u.y>d.H-d.R)throw Error('bounds');if(i%30===0){const live=s.units.filter((u:any)=>u.hp>0);for(const a of live)for(const b of live)if(a.id<b.id)penetration=Math.max(penetration,16-Math.hypot(a.x-b.x,a.y-b.y)/256);}}stress.push({character,ticks:s.tick,penetration,bolts,elapsedMs:performance.now()-start});}
 return {trials:rows.length,ticks,stress,sample:rows[0]};});
 writeFileSync(`${dir}/mage-worker-safety.json`,JSON.stringify(evidence,null,2));
 expect(evidence.trials).toBe(100);expect(evidence.stress.every(s=>s.penetration<0.5&&s.bolts<=200),JSON.stringify(evidence.stress)).toBe(true);
});
test('mage survivor cries after actual victory, both slots preserve character identity',async({page})=>{
 await page.goto('/?diagnostics=1');await page.getByLabel('A 캐릭터',{exact:true}).selectOption('adult');await page.getByLabel('B 캐릭터',{exact:true}).selectOption('mage');
 await expect(page.getByTestId('effective-A')).toContainText('35세 승현 ×5');await expect(page.getByTestId('effective-B')).toContainText('14세 동우 ×1');
 await page.getByLabel('A 캐릭터',{exact:true}).selectOption('youth');
 for(const t of ['A','B']){await page.getByLabel(`${t} 인원`,{exact:true}).fill(t==='B'?'3':'1');for(const label of ['체력','스태미너','기술','파워','스피드','방어'])await page.getByLabel(`${t} ${label}`,{exact:true}).fill(t==='B'?'10':'1');}
 await page.getByRole('button',{name:'4×',exact:true}).click();await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 await page.waitForFunction(()=>(window as any).arenaDiagnostics?.snapshot().outcome==='B_win');
 await expect(page.locator('.result h2')).toContainText('14세 동우');
 const actors=JSON.parse((await page.locator('.arena').getAttribute('data-render'))!);
 expect(actors.some((u:any)=>u.character==='mage'&&u.crying)).toBe(true);expect(actors.every((u:any)=>u.crying===(u.team==='B'&&u.hp>0))).toBe(true);expect(actors.every((u:any)=>u.scale===1.05)).toBe(true);
 await page.screenshot({path:`${dir}/mage-victory.png`,fullPage:true});writeFileSync(`${dir}/mage-victory.json`,JSON.stringify(actors,null,2));
});
