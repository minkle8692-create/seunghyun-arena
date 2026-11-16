import {test,expect} from '@playwright/test';
import {writeFileSync} from 'node:fs';
test('body spins with extended leg and actual sustained recoil in live rendered battle',async({page})=>{
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 const frames:any[]=await page.evaluate(()=>{(window as any).motionFrames=[];return [];});
 await page.evaluate(()=>{(window as any).motionTimer=setInterval(()=>{
 const d=(window as any).arenaDiagnostics,s=d.snapshot();
 const r=JSON.parse(document.querySelector('.arena')?.getAttribute('data-render')||'[]');
 if(s.units.some((u:any)=>u.kick||u.recoilLeft>0||u.kickPoseUntil>=s.tick&&s.tick>0))
 (window as any).motionFrames.push({tick:s.tick,render:r,units:s.units.map((u:any)=>({id:u.id,x:u.x,y:u.y,hp:u.hp,recoil:u.recoilLeft,stunnedUntil:u.stunnedUntil})),events:s.events});
 },16);});
 await page.getByRole('button',{name:'▶ 전투 시작 / 재개'}).click();
 await page.waitForFunction(()=>JSON.parse(document.querySelector('.arena')!.getAttribute('data-render')!).some((a:any)=>a.kickPhase==='spin-recovery'&&a.legVisible),{}, {polling:16});
 await page.screenshot({path:'evidence/body-spin.png'});
 await page.waitForFunction(()=>{const f=(window as any).motionFrames;const hit=f.find((r:any)=>r.events.some((e:any)=>e.kind==='kick_hit'));return hit&&f.at(-1).tick>=hit.tick+18;});
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();
 frames.push(...await page.evaluate(()=>{clearInterval((window as any).motionTimer);return (window as any).motionFrames;}));
 const spinning=frames.flatMap(f=>f.render.filter((a:any)=>a.kickPhase==='spin-recovery'));
 expect(spinning.length).toBeGreaterThan(2);expect(new Set(spinning.map(a=>Math.round(a.angle))).size).toBeGreaterThan(2);
 const impact=frames.find(f=>f.events.some((e:any)=>e.kind==='kick_hit'));
 const trajectory=impact.events.filter((e:any)=>e.kind==='kick_hit').map((e:any)=>{
 const origin=impact.units.find((u:any)=>u.id===e.target);
 const samples=frames.filter(f=>f.tick>=impact.tick&&f.tick<=impact.tick+18).map(f=>{const u=f.units.find((v:any)=>v.id===e.target);return{tick:f.tick,x:u.x/256,y:u.y/256,recoil:u.recoil,hp:u.hp,distance:Math.hypot(u.x-origin.x,u.y-origin.y)/256};});return{id:e.target,samples};});
 expect(trajectory.some((t:any)=>t.samples.some((v:any)=>v.distance>30))).toBe(true);
 await page.screenshot({path:'evidence/recoil-after.png'});
 writeFileSync('evidence/body-motion.json',JSON.stringify({frames,trajectory},null,2));
});
