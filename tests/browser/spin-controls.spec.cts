import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('body kick pause freezes, restart clears and reduced motion removes rotation',async({page})=>{
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 await page.getByRole('button',{name:'▶ 전투 시작 / 재개'}).click();
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.arena')!.getAttribute('data-render')!).some((a:any)=>a.kickPhase==='spin-recovery'),{}, {polling:8});
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();await page.waitForTimeout(100);
 const actors=()=>page.locator('.arena').getAttribute('data-render').then(x=>JSON.parse(x!));const frozen=await actors();
 expect(frozen.some((a:any)=>a.kickPhase==='spin-recovery'&&a.legVisible)).toBe(true);
 await page.waitForTimeout(220);expect(await actors()).toEqual(frozen);
 await page.emulateMedia({reducedMotion:'reduce'});await page.waitForTimeout(100);
 const reduced=await actors();expect(reduced.filter((a:any)=>a.kickPhase!=='none').every((a:any)=>a.angle===0)).toBe(true);
 await page.getByRole('button',{name:'↻ 같은 시드 재시작',exact:true}).click();
 await expect.poll(async()=> (await actors()).every((a:any)=>a.kickPhase==='none'&&!a.legVisible)).toBe(true);
 writeFileSync('evidence/spin-controls.json',JSON.stringify({frozen,reduced},null,2));
});
