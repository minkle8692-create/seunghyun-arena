import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=`evidence/sideview/${process.env.LIVE?'live':'local'}`;
test.beforeAll(()=>mkdirSync(dir,{recursive:true}));
for(const mobile of [false,true])test(`sideview full flow ${mobile?'mobile reduced':'desktop'}`,async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 const tag=mobile?'mobile':'desktop';if(mobile){await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 await page.getByLabel('A 캐릭터',{exact:true}).selectOption('mage');await page.getByLabel('A 인원',{exact:true}).fill('3');
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();await page.waitForTimeout(450);
 const before=await page.evaluate(()=>({s:(window as any).arenaDiagnostics.snapshot(),draft:localStorage.getItem('arena.draft'),last:localStorage.getItem('arena.last')}));
 await page.getByRole('button',{name:'▶ 측면 격투 리플레이',exact:true}).click();const replay=page.getByTestId('side-replay');await expect(replay).toBeVisible();await expect(replay).toHaveAttribute('data-playing','false');await expect(replay).toContainText('HP는 연출용');
 await expect(page.getByLabel('A 캐릭터',{exact:true})).not.toBeVisible();
 const hudBox=await replay.locator('.replayHUD').boundingBox(),canvasBox=await replay.locator('canvas').boundingBox();expect(canvasBox!.y).toBeGreaterThanOrEqual(hudBox!.y+hudBox!.height-1);
 const frames:any[]=[];
 for(const [name,time] of [['연속 킥',0],['회전 · 패링',2.66],['점프',5.22],['반격',6.65],['피니시',8.68]] as const){await page.getByRole('button',{name,exact:true}).click();await expect(replay).toHaveAttribute('data-time',time.toFixed(3));const data=await replay.locator('canvas').evaluate((e:HTMLCanvasElement)=>e.toDataURL());frames.push({name,time,dataLength:data.length});await replay.screenshot({path:`${dir}/${tag}-${time}.png`});}
 await page.getByLabel('장면 탐색',{exact:true}).focus();await page.keyboard.press('Home');await expect(replay).toHaveAttribute('data-time','0.000');await page.keyboard.press('ArrowRight');await expect(replay).toHaveAttribute('data-time','0.010');
 await page.getByLabel('장면 탐색',{exact:true}).evaluate((e:HTMLInputElement)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(e,'1.6');e.dispatchEvent(new Event('input',{bubbles:true}));});await expect(replay).toHaveAttribute('data-hitstop','true');await replay.screenshot({path:`${dir}/${tag}-kick.png`});
 await page.getByRole('button',{name:'처음으로',exact:true}).click();await expect(replay).toHaveAttribute('data-time','0.000');
 await page.getByRole('button',{name:'리플레이 재생',exact:true}).click();await expect.poll(async()=>Number(await replay.getAttribute('data-time'))).toBeGreaterThan(.2);await page.getByRole('button',{name:'리플레이 일시정지',exact:true}).click();const frozen=await replay.getAttribute('data-time');const pixels=await replay.locator('canvas').evaluate((e:HTMLCanvasElement)=>e.toDataURL());await page.waitForTimeout(200);expect(await replay.getAttribute('data-time')).toBe(frozen);expect(await replay.locator('canvas').evaluate((e:HTMLCanvasElement)=>e.toDataURL())).toBe(pixels);
 await page.getByRole('button',{name:'처음으로',exact:true}).click();await page.getByRole('button',{name:'리플레이 재생',exact:true}).click();await expect(replay).toHaveAttribute('data-time','8.800',{timeout:12000});await expect(replay).toHaveAttribute('data-playing','false');await expect(replay).toContainText('REPLAY END');await replay.screenshot({path:`${dir}/${tag}-end.png`});
 const during=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot());expect(during).toEqual(before.s);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(replay).toHaveAttribute('data-reduced',String(mobile));
 await page.getByRole('button',{name:'리플레이 다시 재생',exact:true}).click();await expect.poll(async()=>Number(await replay.getAttribute('data-time'))).toBeLessThan(1);
 await page.getByRole('button',{name:'일반 모드로 돌아가기',exact:true}).click();await expect(replay).not.toBeVisible();const after=await page.evaluate(()=>({s:(window as any).arenaDiagnostics.snapshot(),draft:localStorage.getItem('arena.draft'),last:localStorage.getItem('arena.last')}));expect(after).toEqual(before);
 await expect(page.getByLabel('A 캐릭터',{exact:true})).toHaveValue('mage');await page.getByRole('button',{name:'▶ 측면 격투 리플레이',exact:true}).click();await expect(replay).toHaveAttribute('data-time','0.000');expect(errors).toEqual([]);
 writeFileSync(`${dir}/${tag}.json`,JSON.stringify({frames,before,after,errors,pausedTime:frozen},null,2));
});
test('running normal battle resumes; hidden playback freezes; live reduced-motion change pauses',async({page})=>{
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();await page.getByRole('button',{name:'▶ 측면 격투 리플레이',exact:true}).click();const replay=page.getByTestId('side-replay');
 const tick=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick);await page.getByRole('button',{name:'리플레이 재생',exact:true}).click();await expect.poll(async()=>Number(await replay.getAttribute('data-time'))).toBeGreaterThan(.15);
 await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(80);const frozen=await replay.getAttribute('data-time');await page.waitForTimeout(180);expect(await replay.getAttribute('data-time')).toBe(frozen);
 await page.evaluate(()=>{delete (document as any).hidden;document.dispatchEvent(new Event('visibilitychange'));});await expect.poll(async()=>Number(await replay.getAttribute('data-time'))).toBeGreaterThan(Number(frozen));
 await page.emulateMedia({reducedMotion:'reduce'});await expect(replay).toHaveAttribute('data-playing','false');await expect(replay).toHaveAttribute('data-reduced','true');expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(tick);
 await page.getByRole('button',{name:'일반 모드로 돌아가기',exact:true}).click();await expect.poll(async()=>page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBeGreaterThan(tick);
});
