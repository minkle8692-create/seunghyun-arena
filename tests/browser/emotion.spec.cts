import { test, expect } from '@playwright/test';
import { writeFileSync } from 'node:fs';
for (const winner of ['A','B']) test(`actual ${winner} victory survivors cry, smaller youth and restart cleanup`, async ({page}) => {
  await page.goto('/?diagnostics=1');
  for (const t of ['A','B']) {
    await page.getByLabel(`${t} 인원`, {exact:true}).fill(t===winner?'3':'1');
    for (const label of ['체력','스태미너','기술','파워','스피드','방어'])
      await page.getByLabel(`${t} ${label}`,{exact:true}).fill(t===winner?'10':'1');
  }
  await page.getByRole('button',{name:'4×',exact:true}).click();
  await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
  await page.waitForFunction(w => (window as any).arenaDiagnostics?.snapshot().outcome===`${w}_win`, winner);
  const actors = () => page.locator('.arena').getAttribute('data-render').then(s=>JSON.parse(s!));
  await expect.poll(async()=> (await actors()).filter((a:any)=>a.crying).length).toBeGreaterThan(0);
  const first=await actors();
  expect(first.every((a:any)=>a.crying === (a.team===winner && a.hp>0))).toBe(true);
  expect(first.find((a:any)=>a.team==='A').scale).toBe(1.05);
  expect(first.find((a:any)=>a.team==='B').scale).toBe(1.4);
  await page.waitForTimeout(220);
  const second=await actors();
  expect(second.find((a:any)=>a.crying).drop).not.toBe(first.find((a:any)=>a.crying).drop);
  await page.screenshot({path:`evidence/emotion-${winner}-victory.png`,fullPage:true});
  await page.getByRole('button',{name:'눈물 모션 일시정지',exact:true}).click();
  await page.waitForTimeout(80);
  const frozen=await actors();
  await page.waitForTimeout(220);
  expect(await actors()).toEqual(frozen);
  await page.getByRole('button',{name:'눈물 모션 재개',exact:true}).click();
  await page.emulateMedia({reducedMotion:'reduce'});
  await page.waitForTimeout(100);
  const reduced=await actors();
  expect(reduced.filter((a:any)=>a.crying).every((a:any)=>a.angle===0 && a.y===-8 && a.drop===4)).toBe(true);
  await page.waitForTimeout(200);
  expect(await actors()).toEqual(reduced);
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:`evidence/emotion-${winner}-mobile.png`,fullPage:true});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  writeFileSync(`evidence/emotion-${winner}.json`,JSON.stringify({first,second,reduced},null,2));
  await page.getByRole('button',{name:'↻ 같은 시드 재시작',exact:true}).click();
  await expect.poll(async()=> (await actors()).some((a:any)=>a.crying)).toBe(false);
});
