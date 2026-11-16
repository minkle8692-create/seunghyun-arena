import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=process.env.HP_EVIDENCE||'evidence/seokho-hp/local';
for(const mobile of [false,true])test('exact final HP and persisted identity '+mobile,async({page})=>{
 mkdirSync(dir,{recursive:true});if(mobile)await page.setViewportSize({width:390,height:844});
 await page.goto('/?diagnostics=1');
 for(const t of ['A','B']){await page.getByLabel(t+' 캐릭터',{exact:true}).selectOption('seokho');await page.getByLabel(t+' 인원',{exact:true}).fill('1');await expect(page.getByTestId('effective-'+t)).toContainText('425 HP');}
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();
 const s=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot());
 for(const u of s.units){expect(u.maxHp).toBe(42500);expect(u.stats).toEqual([17.5,17.5,22.5,20,15,7.5]);expect(u.maxEnergy).toBe(16750);}
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:dir+'/'+(mobile?'mobile':'desktop')+'.png',fullPage:true});
 await page.waitForFunction(()=>JSON.parse(localStorage.getItem("arena.draft")||"{}").config?.A.character==="seokho" && JSON.parse(localStorage.getItem("arena.draft")||"{}").config?.B.character==="seokho");
 await page.reload();await expect(page.getByTestId('effective-A')).toContainText('425 HP');
 writeFileSync(dir+'/'+(mobile?'mobile':'desktop')+'.json',JSON.stringify(s,null,2));
});
