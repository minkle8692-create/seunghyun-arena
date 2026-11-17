import {useEffect,useRef,useState} from 'react';
import {EXCHANGES,REPLAY_DURATION,SOURCE_FPS,SOURCE_FRAME_COUNT,SOURCE_TIMES,sourceFrame,stepSourceFrame,replayFrame,type Pose,type Point} from './replay';

function paint(ctx:CanvasRenderingContext2D,t:number,reduced:boolean){
 const f=replayFrame(t),rect=(x:number,y:number,w:number,h:number,c:string)=>{ctx.fillStyle=c;ctx.fillRect(Math.round(x),Math.round(y),w,h);};
 ctx.imageSmoothingEnabled=false;
 rect(0,0,384,240,'#111c32');rect(0,76,384,137,'#192941');
 // Original pixel-lit training courtyard; no source artwork or video textures.
 for(let i=0;i<6;i++){const x=i*76-25;rect(x,43,56,166,'#24344d');rect(x+4,48,48,5,'#52647c');rect(x+8,62,32,5,'#111c30');for(let j=0;j<3;j++){rect(x+9,86+j*30,28,20,'#101b2f');rect(x+11,88+j*30,3,14,'#3f6175');}}
 rect(0,54,384,3,'#758498');rect(0,58,384,2,'#304658');rect(17,36,5,166,'#41647b');rect(18,39,2,102,'#9ae5d7');rect(357,36,5,166,'#41647b');rect(358,39,2,102,'#9ae5d7');
 rect(0,209,384,31,'#314252');rect(0,209,384,3,'#9ab7b7');rect(0,230,384,2,'#1d2b3f');
 for(let i=0;i<8;i++)rect(i*57,214,1,26,'#536372');
 for(const x of [f.leftX,f.rightX]){rect(x-35,211,70,4,'#182338');rect(x-26,215,52,2,'#213044');}
 function fighter(p:Pose,x:number,y:number,face:number,adult:boolean,yaw=0){
  ctx.save();ctx.translate(Math.round(x),Math.round(y));ctx.scale(face,1);
  const skin=adult?'#dca982':'#e3b393',shade='#a86f57',shirt=adult?'#1b222d':'#8e99a5',light=adult?'#343d49':'#b8c4cd';
  const line=(a:Point,b:Point,w:number,c:string)=>{ctx.strokeStyle=c;ctx.lineWidth=w;ctx.lineCap='square';ctx.beginPath();ctx.moveTo(Math.round(a[0]),Math.round(a[1]));ctx.lineTo(Math.round(b[0]),Math.round(b[1]));ctx.stroke();};
  const limb=(a:Point,b:Point,c:Point,w:number,color:string,highlight:string)=>{line(a,b,w+3,'#0c1422');line(b,c,w+2,'#0c1422');line(a,b,w,color);line(b,c,w-1,color);line([a[0]-2,a[1]],[b[0]-2,b[1]],2,highlight);};
  limb(p.hip,p.backKnee,p.backFoot,9,'#161e2b','#303a49');rect(p.backFoot[0]-6,p.backFoot[1]-2,17,5,'#0b111c');rect(p.backFoot[0]-5,p.backFoot[1]+2,18,2,'#74818b');
  limb([p.neck[0]-8,p.neck[1]+7],p.backElbow,p.backHand,adult?10:8,adult?shade:'#606e80',adult?skin:'#8392a1');rect(p.backHand[0]-4,p.backHand[1]-4,8,9,shade);
  ctx.save();ctx.scale(Math.max(.48,Math.abs(Math.cos(yaw))),1);
  // Broad adult shoulders, fitted torso; Seokho's zipped gray jacket.
  ctx.fillStyle='#0c1422';ctx.beginPath();ctx.moveTo(p.neck[0]-17,p.neck[1]+2);ctx.lineTo(p.neck[0]+(adult?19:14),p.neck[1]+2);ctx.lineTo(p.hip[0]+12,p.hip[1]+4);ctx.lineTo(p.hip[0]-12,p.hip[1]+4);ctx.closePath();ctx.fill();
  limb([p.neck[0],p.neck[1]+12],[p.hip[0],p.hip[1]-15],p.hip,adult?28:21,shirt,light);
  if(adult){line([p.neck[0]-11,p.neck[1]+11],[p.neck[0]+11,p.neck[1]+11],11,shirt);line([p.neck[0]-10,p.neck[1]+18],[p.neck[0]+9,p.neck[1]+18],2,'#47505a');}
  line([p.neck[0]+3,p.neck[1]+13],[p.hip[0]+3,p.hip[1]-2],2,adult?'#48515b':'#d2d7d9');
  if(!adult){line([p.neck[0]-10,p.neck[1]+4],[p.neck[0],p.neck[1]+13],4,'#d1d9dc');line([p.neck[0]+10,p.neck[1]+4],[p.neck[0]+4,p.neck[1]+13],3,'#505e6f');}
  ctx.restore();
  rect(p.hip[0]-11,p.hip[1]-2,23,5,'#0e1521');rect(p.hip[0]+1,p.hip[1]-1,4,3,'#667380');
  limb(p.hip,p.knee,p.foot,10,'#202835','#404c59');rect(p.foot[0]-5,p.foot[1]-3,18,6,'#0a101b');rect(p.foot[0]-4,p.foot[1]+2,19,2,'#a3adb5');
  line([p.neck[0],p.neck[1]+3],p.head,10,skin);
  const [hx,hy]=p.head;rect(hx-10,hy-12,21,24,'#101827');rect(hx-8,hy-10,17,21,skin);rect(hx-8,hy+2,5,8,shade);rect(hx+8,hy-2,4,6,skin);rect(hx+5,hy-4,3,2,'#17202d');rect(hx+4,hy+5,5,2,'#8e5546');rect(hx-10,hy-13,20,8,'#101722');rect(hx-10,hy-8,5,12,'#17202c');
  if(adult){rect(hx-8,hy-14,15,4,'#101722');rect(hx+4,hy-8,5,4,'#101722');rect(hx-6,hy-12,9,2,'#344051');}else{for(let i=0;i<5;i++)rect(hx-9+i*4,hy-18-(i%2)*2,3,10,'#121a25');rect(hx-5,hy-16,2,6,'#394552');}
  limb([p.neck[0]+9,p.neck[1]+9],p.elbow,p.hand,adult?11:8,adult?skin:shirt,adult?'#f1c29b':light);
  if(adult){line([p.neck[0]+9,p.neck[1]+8],[(p.neck[0]+9+p.elbow[0])/2,(p.neck[1]+8+p.elbow[1])/2],14,shirt);rect(p.elbow[0]-5,p.elbow[1]-5,9,9,skin);}
  rect(p.hand[0]-4,p.hand[1]-5,10,10,skin);rect(p.hand[0]+3,p.hand[1]-4,3,8,shade);rect(p.hand[0]-4,p.hand[1]+3,6,2,'#eac3a5');
  ctx.restore();
 }
 fighter(f.left,f.leftX,160,1,false,f.yaw);fighter(f.right,f.rightX,160-f.jump,-1,true);
 if(f.ko){ctx.fillStyle='#fff1bc';ctx.font='bold 19px monospace';ctx.textAlign='center';ctx.fillText('K.O.',192,38);ctx.font='bold 10px sans-serif';ctx.fillText('승현 승리',192,54);}
 if(f.spark){const isLeft=f.event.actor==='left';const contact=(f.event.move==='jab'||f.event.move==='finish')?(isLeft?f.left.hand:f.right.hand):(isLeft?f.left.foot:f.right.foot);const x=isLeft?f.leftX+contact[0]:f.rightX-contact[0],y=160+(isLeft?0:-f.jump)+contact[1];
  const color=isLeft?'#89f5e5':'#ffbe6a';
  if(!reduced){for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.strokeStyle=i%2?color:'#fff5d1';ctx.lineWidth=i%3?2:3;ctx.beginPath();ctx.moveTo(x+Math.cos(a)*7,y+Math.sin(a)*7);ctx.lineTo(x+Math.cos(a)*(i%2?19:27),y+Math.sin(a)*(i%2?19:27));ctx.stroke();}}
  rect(x-3,y-7,6,14,color);rect(x-7,y-3,14,6,'#fff8dc');
 }
 // One bounded final flash; reduced motion omits flash and radial streaks.
 if(f.flash&&!reduced){ctx.fillStyle='rgba(255,237,199,.48)';ctx.fillRect(0,0,384,240);rect(94,87,4,71,'#fff6d9');rect(73,112,66,4,'#fff6d9');}
}
export function SideviewReplay({onReturn}:{onReturn:()=>void}){
 const canvas=useRef<HTMLCanvasElement>(null);const [time,setTime]=useState(0),[playing,setPlaying]=useState(false);
 const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const m=matchMedia('(prefers-reduced-motion: reduce)');const change=()=>{setReduced(m.matches);if(m.matches)setPlaying(false);};m.addEventListener('change',change);return()=>m.removeEventListener('change',change);},[]);
 useEffect(()=>{if(!playing)return;let raf=0,last=0;const tick=(now:number)=>{if(!document.hidden&&last){const dt=Math.min((now-last)/1000,.08);setTime(t=>Math.min(REPLAY_DURATION,t+dt));}last=document.hidden?0:now;raf=requestAnimationFrame(tick);};raf=requestAnimationFrame(tick);return()=>cancelAnimationFrame(raf);},[playing]);
 useEffect(()=>{if(time>=REPLAY_DURATION)setPlaying(false);const c=canvas.current?.getContext('2d');if(c)paint(c,time,reduced);},[time,reduced]);
 const f=replayFrame(time);
 return <section className="sideReplay panel" data-testid="side-replay" data-time={time.toFixed(3)} data-frame={f.frame} data-hp-left={f.hpLeft} data-hp-right={f.hpRight} data-ko={f.ko} data-phase={f.phase} data-playing={playing} data-event={f.event.move} data-hitstop={f.hitstop} data-reduced={reduced}>
  <div className="replayHeading"><div><div className="eyebrow">SIDEVIEW / CHOREOGRAPHED REPLAY</div><h1>막고, 뛰고, <span>뒤집다.</span></h1><p>25세 석호 <b>VS</b> 35세 승현 · 8.8초의 공방</p></div><span className="replayBadge">연출 애니메이션</span></div>
  <p className="replayDisclosure">고정 측면 시점 · 정해진 동작을 재생합니다. HP는 연출용이며 일반 모드의 결정론적 시뮬레이션·능력치·승패와 무관합니다.</p>
  <div className="replayScreen"><div className="replayHUD"><div><strong>25 <span>석호</span></strong><div className="replayHP" role="meter" aria-label="석호 연출 HP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={f.hpLeft}><i style={{width:`${f.hpLeft}%`}}/></div><small>GRAY JACKET / PRESSURE</small></div><div className="replayClock">{(REPLAY_DURATION-time).toFixed(1)}<small>REPLAY</small></div><div className="rightHUD"><strong><span>승현</span> 35</strong><div className="replayHP" role="meter" aria-label="승현 연출 HP" aria-valuemin={0} aria-valuemax={100} aria-valuenow={100}><i style={{width:'100%'}}/></div><small>BLACK SHIRT / COUNTER</small></div></div>
  <canvas ref={canvas} width={384} height={240} aria-label="왼쪽 회색 재킷 석호와 오른쪽 검은 티셔츠 승현의 전신 픽셀 격투 리플레이" role="img"/>
  <div className="replayCaption"><span>{f.chapter}</span><strong>{time>=REPLAY_DURATION?'REPLAY END · 석호 KO · 승현 승리':f.label}</strong></div></div>
  <div className="replayTransport"><button className="primary" onClick={()=>{if(time>=REPLAY_DURATION)setTime(0);setPlaying(p=>!p);}}>{playing?'리플레이 일시정지':time>=REPLAY_DURATION?'리플레이 다시 재생':'리플레이 재생'}</button><button onClick={()=>{setTime(0);setPlaying(false);}}>처음으로</button><button onClick={onReturn}>일반 모드로 돌아가기</button><button disabled={f.frame===0} onClick={()=>{setPlaying(false);setTime(stepSourceFrame(time,-1));}}>이전 프레임</button><button disabled={f.frame===SOURCE_FRAME_COUNT-1} onClick={()=>{setPlaying(false);setTime(stepSourceFrame(time,1));}}>다음 프레임</button><output>{time.toFixed(3)} / 8.800초 · F{f.frame} / 263 · {SOURCE_FPS}fps</output></div>
  <label className="replaySeek">장면 탐색<input type="range" min="0" max={SOURCE_FRAME_COUNT-1} step="1" value={sourceFrame(time)} onChange={e=>{setPlaying(false);setTime(SOURCE_TIMES[Number(e.target.value)]);}}/></label>
  <div className="replayChapters">{[{t:0,s:'연속 킥'},{t:79/30,s:'회전 · 패링'},{t:156/30,s:'점프'},{t:218/30,s:'반격'},{t:260/30,s:'피니시'}].map(c=><button key={c.t} onClick={()=>{setTime(c.t);setPlaying(false);}}>{c.s}</button>)}</div>
  <p className="replayNote">{reduced?'동작 줄이기 적용: 자동 재생 없음 · 섬광/방사 효과 생략. 장면 버튼으로 정지 동작을 볼 수 있습니다.':'재생 버튼으로 시작 · 슬라이더와 장면 버튼으로 동작을 자세히 확인하세요.'} {EXCHANGES.length}개의 연출 접촉 · 패링 피해 0 · 마지막 접촉에서만 KO. 가려진 동작과 쓰러짐은 보완 연출이며 원본의 정밀 복제는 아닙니다.</p>
 </section>;
}
