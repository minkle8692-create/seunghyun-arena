import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=process.env.SCENARIO_EVIDENCE||`evidence/scenario/${process.env.LIVE?'live':'local'}`;
test.beforeAll(()=>mkdirSync(dir,{recursive:true}));
for(const mobile of [false,true])test(`scenario complete actual battle, same-engine result, controls and normal preservation ${mobile?'mobile reduced':'desktop'}`,async({page})=>{
 const tag=mobile?'mobile':'desktop';const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 if(mobile){await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
 await page.goto('/?diagnostics=1&scenario=verify');
 await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 await page.getByLabel('A 캐릭터',{exact:true}).selectOption('mage');
 await page.getByLabel('A 인원',{exact:true}).fill('3');
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();
 await page.waitForTimeout(450);
 const before=await page.evaluate(()=>({s:(window as any).arenaDiagnostics.snapshot(),draft:localStorage.getItem('arena.draft'),last:localStorage.getItem('arena.last')}));
 await page.getByRole('button',{name:'▶ 승현 VS 석호 시나리오',exact:true}).click();
 await expect(page.getByTestId('scenario-intro')).toContainText('두 남자');
 await page.getByRole('button',{name:'시나리오 일시정지',exact:true}).click();
 await page.waitForTimeout(2600);
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','0');
 expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(0);
 await page.screenshot({path:`${dir}/${tag}-intro.png`,fullPage:true});
 if(mobile)expect(await page.locator('.scenarioPortraits svg').first().evaluate(e=>getComputedStyle(e).animationName)).toBe('none');
 await page.evaluate(()=>{
 (window as any).records=[];(window as any).capture=setInterval(()=>{
 const s=(window as any).arenaDiagnostics.snapshot();
 const r=JSON.parse(document.querySelector('.arena')!.getAttribute('data-render')||'[]');
 const events=s.events.filter((e:any)=>e.kind.startsWith('lock')||e.kind.startsWith('kick'));
 (window as any).records.push({tick:s.tick,events,r});
 },20);});
 await page.getByRole('button',{name:'시나리오 재개',exact:true}).click();
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','1',{timeout:4000});
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','2',{timeout:6000});
 for(const phase of ['sumo','dash','right','left','prone']) {
 await expect(page.getByTestId('showcase')).toHaveAttribute('data-phase',phase,{timeout:4000});
 await page.locator('.watch').screenshot({path:`${dir}/${tag}-intro-${phase}.png`});
 }
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','battle',{timeout:6000});
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.arena')!.getAttribute('data-render')||'[]').some((u:any)=>u.lockPhase==='lock'),{},{polling:16});
 await page.locator('.watch').screenshot({path:`${dir}/${tag}-lock.png`});

 await page.getByRole('button',{name:'시나리오 일시정지',exact:true}).click();
 const tick=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick);
 await page.waitForTimeout(200);expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(tick);
 await page.getByRole('button',{name:'시나리오 재개',exact:true}).click();
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','ending',{timeout:100000});
 const actual=await page.evaluate(()=>{clearInterval((window as any).capture); const d=(window as any).arenaDiagnostics,s=d.snapshot(),b=d.createBattle(s.config,s.seed);while(!b.outcome)d.step(b);return{summary:d.summarize(s),direct:d.summarize(b),records:(window as any).records};});
 expect(actual.summary).toEqual(actual.direct);
 const ended=JSON.parse(await page.locator('.arena').getAttribute('data-render')||'[]');
 expect(ended.every((a:any)=>!a.stanceVisible)).toBe(true);
 expect(ended.filter((a:any)=>a.hp===0).every((a:any)=>a.bodyPose==='standing')).toBe(true);
 const kinds=actual.records.flatMap((r:any)=>r.events.map((e:any)=>e.kind));
 for(const k of ['kick','lock_start'])expect(kinds).toContain(k);
 await page.screenshot({path:`${dir}/${tag}-ending.png`,fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:'시나리오 다시보기',exact:true}).click();
 expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(0);
 await page.getByRole('button',{name:'소개 건너뛰기',exact:true}).click();
 await expect(page.getByTestId('scenario-stage')).toHaveAttribute('data-chapter','battle');
 await page.getByRole('button',{name:'일반 모드로 돌아가기',exact:true}).click();
 const after=await page.evaluate(()=>({s:(window as any).arenaDiagnostics.snapshot(),draft:localStorage.getItem('arena.draft'),last:localStorage.getItem('arena.last')}));
 expect(after).toEqual(before);
 await expect(page.getByLabel('A 캐릭터',{exact:true})).toHaveValue('mage');
 await expect(page.getByLabel('A 인원',{exact:true})).toHaveValue('3');
 expect(errors).toEqual([]);
 writeFileSync(`${dir}/${tag}.json`,JSON.stringify({actual,before,after,errors},null,2));
});
