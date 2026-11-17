import {test,expect} from '@playwright/test';
import {mkdirSync,writeFileSync} from 'node:fs';
const dir=`evidence/frame-revision/${process.env.LIVE?'live':'local'}`;
for(const mobile of [false,true])test(`source frame contact HP and KO ${mobile?'mobile':'desktop'}`,async({page})=>{
 mkdirSync(dir,{recursive:true});if(mobile){await page.setViewportSize({width:390,height:844});await page.emulateMedia({reducedMotion:'reduce'});}
 await page.goto('/');await page.getByRole('button',{name:'▶ 측면 격투 리플레이',exact:true}).click();const r=page.getByTestId('side-replay');const seek=page.getByLabel('장면 탐색',{exact:true});
 const go=async(n:number)=>{await seek.evaluate((e:HTMLInputElement,n)=>{Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(e,String(n));e.dispatchEvent(new Event('input',{bubbles:true}));},n);await expect(r).toHaveAttribute('data-frame',String(n));};
 const rows=[];let hp=100;
 for(let n=0;n<264;n++){
  await go(n);const v=Number(await r.getAttribute('data-hp-left'));expect(v).toBeLessThanOrEqual(hp);expect(v).toBe(n<170?100:n<260?Math.max(1,v):0);await expect(r).toHaveAttribute('data-ko',String(n>=260));
  if(n<260)expect(v).toBeGreaterThan(0);await expect(page.getByRole('meter',{name:'석호 연출 HP'})).toHaveAttribute('aria-valuenow',String(v));
  rows.push({frame:n,hp:v,ko:n>=260});hp=v;
  if([7,73,79,145,156,170,175,179,186,198,218,250,259,260,261,263].includes(n))await r.screenshot({path:`${dir}/${mobile?'mobile':'desktop'}-F${n}.png`});
 }
 await page.getByRole('button',{name:'이전 프레임',exact:true}).click();await expect(r).toHaveAttribute('data-frame','262');await page.getByRole('button',{name:'다음 프레임',exact:true}).click();await expect(r).toHaveAttribute('data-frame','263');
 await expect(page.getByRole('button',{name:'다음 프레임',exact:true})).toBeDisabled();await go(259);const before=await r.locator('canvas').evaluate((e:HTMLCanvasElement)=>e.toDataURL());await page.getByRole('button',{name:'다음 프레임',exact:true}).click();await expect(r).toHaveAttribute('data-hp-left','0');await page.getByRole('button',{name:'이전 프레임',exact:true}).click();await expect(r).toHaveAttribute('data-hp-left','19');expect(await r.locator('canvas').evaluate((e:HTMLCanvasElement)=>e.toDataURL())).toBe(before);
 await go(0);await expect(page.getByRole('button',{name:'이전 프레임',exact:true})).toBeDisabled();await page.getByRole('button',{name:'리플레이 재생',exact:true}).click();await page.waitForTimeout(100);await page.getByRole('button',{name:'다음 프레임',exact:true}).click();await expect(r).toHaveAttribute('data-playing','false');const frozen=await r.getAttribute('data-frame');await page.waitForTimeout(100);await expect(r).toHaveAttribute('data-frame',frozen!);
 writeFileSync(`${dir}/${mobile?'mobile':'desktop'}-all-frames.json`,JSON.stringify(rows,null,2));
});
