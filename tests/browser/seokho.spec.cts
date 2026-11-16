import {test,expect} from '@playwright/test';
import {writeFileSync,mkdirSync} from 'node:fs';
const dir=process.env.SEOKHO_EVIDENCE||'evidence/seokho/local';
test.beforeAll(()=>mkdirSync(dir,{recursive:true}));
for(const side of ['A','B'])test('Seokho visible full sequence '+side,async({page})=>{
 if(side==='B')await page.setViewportSize({width:390,height:844});
 await page.goto('/?diagnostics=1');
 await page.getByLabel(side+' 캐릭터',{exact:true}).selectOption('seokho');
 const foe=side==='A'?'B':'A';
 await page.getByLabel(foe+' 캐릭터',{exact:true}).selectOption('youth');
 for(const t of ['A','B'])await page.getByLabel(t+' 인원',{exact:true}).fill('1');
 await page.getByLabel(foe+' 체력',{exact:true}).fill('10');
 await page.getByLabel(foe+' 방어',{exact:true}).fill('10');
 await expect(page.getByTestId('effective-'+side)).toContainText('25세 석호 ×2.5');
 await page.evaluate(()=>{(window as any).frames=[];(window as any).capture=setInterval(()=>{
 const arena=document.querySelector('.arena');const d=(window as any).arenaDiagnostics;
 if(d)(window as any).frames.push({s:d.snapshot(),r:JSON.parse(arena?.getAttribute('data-render')||'[]'),b:JSON.parse(arena?.getAttribute('data-speech')||'[]')});
 },30);});
 await page.getByRole('button',{name:'이 설정으로 시작 · 같은 시드',exact:true}).click();
 for(const phase of ['lock','dash','left','right','prone']){
 await page.waitForFunction(p=>JSON.parse(document.querySelector('.arena')?.getAttribute('data-render')||'[]').some((u:any)=>u.lockPhase===p),phase,{polling:16,timeout:60000});
 await page.locator('.arena').screenshot({path:dir+'/'+side+'-'+phase+'.png'});
 }
 await page.getByRole('button',{name:'Ⅱ 일시정지',exact:true}).click();
 const frames:any[]=await page.evaluate(()=>{clearInterval((window as any).capture);return (window as any).frames;});
 expect(frames.some(f=>f.b.some((b:any)=>b.phrase==='자신있게 맞아줄게'))).toBe(true);
 expect(frames.some(f=>f.b.some((b:any)=>b.phrase==='내가 잘못했어 ㅠㅠ'))).toBe(true);
 expect(frames.some(f=>f.r.some((u:any)=>u.lockPhase==='prone'&&u.hp>0))).toBe(true);
 const events=frames.flatMap(f=>f.s.events).filter((e:any)=>e.kind==='lock_left'||e.kind==='lock_right');
 expect(events.some((e:any)=>e.damage&&e.reason==='critical')).toBe(true);
 const tick=await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick);
 await page.waitForTimeout(150);expect(await page.evaluate(()=>(window as any).arenaDiagnostics.snapshot().tick)).toBe(tick);
 await page.setViewportSize({width:390,height:844});
 await page.screenshot({path:dir+'/'+side+'-mobile.png',fullPage:true});
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 expect(frames.flatMap(f=>f.b).every((b:any)=>b.x-b.width/2>=0&&b.x+b.width/2<=384)).toBe(true);
 await page.getByRole('button',{name:'↻ 같은 시드 재시작',exact:true}).click();
 await expect.poll(async()=>JSON.parse((await page.locator('.arena').getAttribute('data-speech'))||'[]')).toEqual([]);
 writeFileSync(dir+'/'+side+'-sequence.json',JSON.stringify({events,frames},null,2));
});
test('Seokho mirror mixed Worker100 parity and crowd200',async({page})=>{
 await page.goto('/?diagnostics=1');await page.waitForFunction(()=>!!(window as any).arenaDiagnostics);
 const evidence=await page.evaluate(async()=>{
 const d=(window as any).arenaDiagnostics;
 const config={A:{character:'seokho',count:1,stats:[7,7,9,8,6,3]},B:{character:'seokho',count:1,stats:[7,7,9,8,6,3]}};
 const rows:any[]=await new Promise((resolve,reject)=>{const w=d.worker();w.onerror=reject;w.onmessage=(e:any)=>{if(e.data.status==='complete'){w.terminate();resolve(e.data.results);}if(e.data.status==='error'){w.terminate();reject(e.data.error);}};w.postMessage({type:'start',jobId:612,config,seed:0,total:100,trace:true});});
 let ticks=0;for(const row of rows){const s=d.createBattle(config,row.seed);for(const hash of row.hashes){d.step(s);if(d.stateHash(s)!==hash)throw Error('parity');ticks++;}}
 const stress:any[]=[];
 for(const character of ['seokho','mage','adult']){const s=d.createBattle({A:{...config.A,count:100},B:{...config.B,character,count:100}},3);let overlap=0;for(let i=0;i<600&&!s.outcome;i++){d.step(s);for(const u of s.units)if(![u.x,u.y,u.hp,u.energy].every(Number.isFinite)||u.x<d.R||u.x>d.W-d.R||u.y<d.R||u.y>d.H-d.R)throw Error('bounds');if(i%30===0){const live=s.units.filter((u:any)=>u.hp>0);for(const a of live)for(const b of live)if(a.id<b.id)overlap=Math.max(overlap,16-Math.hypot(a.x-b.x,a.y-b.y)/256);}}stress.push({character,overlap,tick:s.tick});}
 return{trials:rows.length,ticks,stress,results:rows.map(({hashes,...r}:any)=>r)};});
 writeFileSync(dir+'/worker-stress.json',JSON.stringify(evidence,null,2));
 expect(evidence.trials).toBe(100);expect(evidence.stress.every(s=>s.overlap<0.5)).toBe(true);
});
