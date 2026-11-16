import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=`evidence/boxing/${process.env.LIVE?'live':'local'}`;
for(const side of ['A','B'])test('real boxing guard/right-left/dogeza and cleanup '+side,async({page})=>{
 mkdirSync(dir,{recursive:true});if(side==='B'){await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
 await page.goto('/?diagnostics=1');
 const foe=side==='A'?'B':'A';
 await page.getByLabel(side+' 캐릭터',{exact:true}).selectOption('seokho');await page.getByLabel(foe+' 캐릭터',{exact:true}).selectOption('youth');
 for(const t of ['A','B'])await page.getByLabel(t+' 인원',{exact:true}).fill('1');
 for(const stat of ['체력','방어'])await page.getByLabel(foe+' '+stat,{exact:true}).fill('10');
 await page.evaluate(()=>{(window as any).frames=[];(window as any).capture=setInterval(()=>{const d=(window as any).arenaDiagnostics;if(d)(window as any).frames.push({s:structuredClone(d.snapshot()),r:JSON.parse(document.querySelector('.arena')?.getAttribute('data-render')||'[]')});},16);});
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 for(const phase of ['dash','right','left','prone']){
 await page.waitForFunction(p=>JSON.parse(document.querySelector('.arena')?.getAttribute('data-render')||'[]').some((a:any)=>a.lockPhase===p&&(p!=='right'&&p!=='left'||a.poseExtension>.7)),phase,{polling:10});
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();
 await page.waitForTimeout(70);
 const before=await page.locator('.arena').getAttribute('data-render');await page.waitForTimeout(150);expect(await page.locator('.arena').getAttribute('data-render')).toBe(before);
 await page.locator('.arena').screenshot({path:`${dir}/${side}-${phase}.png`});
 await page.getByRole('button',{name:/재개/}).click();
 }
 const frames:any[]=await page.evaluate(()=>{clearInterval((window as any).capture);return (window as any).frames;});
 const actor=frames.flatMap(f=>f.r).filter((a:any)=>a.character==='seokho');
 expect(actor.some(a=>a.bodyPose==='boxing-guard')).toBe(true);
 for(const phase of ['right','left']){const rows=actor.filter(a=>a.lockPhase===phase&&a.poseExtension>.7);expect(rows.length).toBeGreaterThan(0);for(const a of rows){expect(a.poseRight.y).toBeGreaterThan(0);expect(a.poseLeft.y).toBeLessThan(0);expect((phase==='right'?a.poseRight:a.poseLeft).x).toBeGreaterThan(24);expect((phase==='right'?a.poseLeft:a.poseRight).x).toBe(10);}}
 expect(actor.some(a=>a.hp>0&&a.bodyPose==='dogeza')).toBe(true);
 const events=[...new Map(frames.flatMap(f=>f.s.events).filter((e:any)=>['lock_right','lock_left'].includes(e.kind)).map((e:any)=>[e.actor+':'+e.attack.serial,e])).values()] as any[];
 expect(events.slice(0,2).map(e=>e.kind)).toEqual(['lock_right','lock_left']);
 for(const e of events)if(e.damage)expect(e.reason).toBe(e.kind==='lock_right'||e.attack.crit<5?'critical':'normal');
 await page.getByRole('button',{name:'↻ 같은 시드 재시작',exact:true}).click();
 await expect.poll(async()=>JSON.parse(await page.locator('.arena').getAttribute('data-render')||'[]').some((a:any)=>a.bodyPose!=='standing')).toBe(false);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 writeFileSync(`${dir}/${side}.json`,JSON.stringify({events,frames},null,2));
});
