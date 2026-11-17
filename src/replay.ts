// Original reenactment keyed to inspected 30fps source presentation timestamps.
// Coordinates/interpolation/HP/fall are authored, not extracted source sprites or physics.
export const SOURCE_FPS=30;
export const SOURCE_FRAME_COUNT=264;
export const SOURCE_TIMES=Array.from({length:SOURCE_FRAME_COUNT},(_,i)=>i/SOURCE_FPS);
export const REPLAY_DURATION=8.8;
export const FINAL_CONTACT_FRAME=260;
export type Move = 'high'|'turn'|'rise'|'air'|'low'|'jab'|'body'|'finish';
export type Exchange={frame:number;at:number;move:Move;actor:'left'|'right';label:string;damage:number;kind:'parry'|'hit';confidence:'visible'|'occluded'};
const parryFrames=[7,17,26,35,45,55,64,79,89,98,107,117,126,135,156];
// First visible impact/score-transition frame; later white particles can outlast contact.
const hitFrames=[170,179,186,218,227,234,242,250,256,260];
const hitMoves:Move[]=['air','low','jab','body','body','high','jab','jab','high','finish'];
const damage=[12,7,10,12,10,9,8,7,6,19];
export const EXCHANGES:Exchange[]=[
 ...parryFrames.map((frame,i):Exchange=>({frame,at:frame/30,move:i===14?'rise':i<7?'high':'turn',actor:'left',label:i===14?'공중 패링 · 피해 없음':'연속 킥 · 패링 · 피해 없음',damage:0,kind:'parry',confidence:'visible'})),
 ...hitFrames.map((frame,i):Exchange=>({frame,at:frame/30,move:hitMoves[i],actor:'right',label:i===9?'마지막 접촉 · 석호 KO':i===0?'공중 반격':i===1?'착지 · 하단 킥':i===2?'근접 스트레이트':'연속 반격',damage:damage[i],kind:'hit',confidence:i>=6?'occluded':'visible'}))
];
export function sourceFrame(input:number){return Math.max(0,Math.min(263,Math.floor((Number.isFinite(input)?input:0)*30+1e-7)));}
export function stepSourceFrame(input:number,direction:-1|1){return SOURCE_TIMES[Math.max(0,Math.min(263,sourceFrame(input)+direction))];}
export type Point = [number,number];
export type Pose = {hip:Point;neck:Point;head:Point;elbow:Point;hand:Point;backElbow:Point;backHand:Point;knee:Point;foot:Point;backKnee:Point;backFoot:Point};
export function standing():Pose {return {hip:[0,0],neck:[0,-39],head:[2,-53],elbow:[17,-22],hand:[26,-42],backElbow:[-13,-25],backHand:[9,-46],knee:[15,25],foot:[25,50],backKnee:[-16,25],backFoot:[-23,50]};}
const mix=(a:number,b:number,p:number)=>a+(b-a)*p;
function blend(a:Pose,b:Pose,p:number):Pose {return Object.fromEntries(Object.keys(a).map(k=>{const key=k as keyof Pose;return [key,[mix(a[key][0],b[key][0],p),mix(a[key][1],b[key][1],p)]];})) as Pose;}
function strike(move:Move):Pose {
 const p=standing();
 if(move==='high'||move==='turn'){p.neck=[-12,-37];p.head=[-11,-52];p.knee=[33,-25];p.foot=[88,-44];p.backKnee=[-3,26];p.backFoot=[-6,50];p.elbow=[-22,-21];p.hand=[-36,-28];if(move==='turn'){p.backElbow=[-24,-36];p.backHand=[-41,-43];}}
 if(move==='rise'){p.neck=[-24,-24];p.head=[-31,-34];p.knee=[26,-34];p.foot=[49,-87];p.backKnee=[-6,23];p.backFoot=[-15,50];p.elbow=[-31,-3];p.hand=[-37,15];}
 if(move==='air'||move==='finish'){p.knee=[32,9];p.foot=[85,0];p.backKnee=[-16,8];p.backFoot=[-27,26];p.neck=[9,-38];p.head=[13,-53];p.hand=[47,-26];p.elbow=[26,-26];}
 if(move==='low'){p.hip=[0,26];p.neck=[10,-9];p.head=[15,-22];p.knee=[35,39];p.foot=[89,47];p.backKnee=[-20,37];p.backFoot=[-30,50];p.elbow=[26,3];p.hand=[37,-16];p.backElbow=[-5,4];p.backHand=[17,-18];}
 if(move==='jab'){p.neck=[15,-37];p.head=[18,-52];p.elbow=[43,-38];p.hand=[80,-39];p.backHand=[22,-48];p.knee=[25,24];p.foot=[38,50];}
 if(move==='body'){p.neck=[-8,-38];p.head=[-9,-53];p.knee=[38,-6];p.foot=[88,-12];p.backKnee=[-4,24];p.backFoot=[-10,50];}
 return p;
}

type Shape='stand'|Move|'guard'|'crouch'|'tuck'|'recoil'|'coil'|'recover';
function shape(name:Shape):Pose {
 const p=standing();
 if(['high','turn','rise','air','low','jab','body','finish'].includes(name)){
  const s=strike(name as Move);
  if(name==='finish'){s.neck=[5,-39];s.head=[8,-54];s.elbow=[19,-64];s.hand=[28,-89];s.knee=[25,2];s.foot=[38,23];s.backKnee=[-14,18];s.backFoot=[-23,42];} // final rising fist, NOT a flying side kick
  return s;
 }
 if(name==='guard'){p.hip=[0,5];p.neck=[-5,-34];p.head=[-7,-48];p.elbow=[17,-23];p.hand=[28,-43];p.backElbow=[5,-18];p.backHand=[20,-34];p.knee=[24,27];p.foot=[33,50];p.backKnee=[-18,28];}
 if(name==='crouch'){p.hip=[0,22];p.neck=[5,-10];p.head=[8,-25];p.elbow=[21,0];p.hand=[30,-20];p.backHand=[13,-23];p.knee=[29,34];p.foot=[39,50];p.backKnee=[-23,37];p.backFoot=[-33,50];}
 if(name==='tuck'){p.knee=[23,2];p.foot=[17,24];p.backKnee=[-19,3];p.backFoot=[-28,25];p.elbow=[22,-37];p.hand=[25,-58];p.backElbow=[-18,-37];p.backHand=[-9,-58];}
 if(name==='recoil'){p.neck=[-18,-34];p.head=[-24,-46];p.elbow=[7,-15];p.hand=[26,-25];p.backElbow=[-28,-17];p.backHand=[-31,-33];p.knee=[21,24];p.foot=[32,50];}
 if(name==='coil'){p.neck=[-12,-33];p.head=[-10,-48];p.knee=[28,-12];p.foot=[13,15];p.elbow=[-21,-23];p.hand=[-29,-40];p.backElbow=[18,-27];p.backHand=[24,-44];}
 if(name==='recover'){p.knee=[31,-9];p.foot=[51,-15];p.neck=[-8,-37];p.head=[-6,-52];p.elbow=[-19,-25];p.hand=[-27,-36];}
 return p;
}
export type PoseKey={frame:number;left:Pose;right:Pose;leftX:number;rightX:number;jump:number;yaw:number;phase:string};
const keys=new Map<number,PoseKey>();
function key(frame:number,l:Shape,r:Shape,x=130,rx=246,jump=0,yaw=0,phase='guard'){
 keys.set(frame,{frame,left:shape(l),right:shape(r),leftX:x,rightX:rx,jump,yaw,phase});
}
// Source begins in a special-move startup; the vertical flash is not counted as a hit.
key(0,'coil','stand');key(3,'coil','stand');key(5,'high','stand');
for(const f of parryFrames.filter(f=>f<150)){
 const turn=f>=79;key(f-2,'recover','stand',130,246,0,turn?.55:0,'kick extension');
 key(f,turn?'turn':'high','guard',130,246,0,turn?.9:0,'parry');
 key(f+1,turn?'turn':'high','guard',130,246,0,turn?.9:0,'parry hold');
 key(f+4,'recover','guard',130,246,0,turn?.55:0,'kick retract');
}
key(71,'recover','stand');key(73,'coil','stand',130,246,0,1.35,'body turn');key(76,'coil','stand',130,246,0,2.25,'back shoulder turn');
key(141,'recover','crouch',130,246,0,.4,'jump preparation');
key(144,'recover','crouch');key(145,'recover','tuck',130,246,6,0,'takeoff');
key(150,'coil','tuck',135,242,48,0,'jump ascent');key(153,'rise','tuck',140,240,64,0,'rising kick');
key(156,'rise','guard',144,240,85,0,'air parry');key(157,'rise','guard',144,240,85,0,'air parry hold');
key(162,'rise','tuck',144,237,55,0,'air recovery');key(168,'rise','air',140,227,31,0,'descending counter');
key(170,'recoil','air',132,217,25,0,'air hit');key(171,'recoil','air',132,217,25,0,'hitstop');
key(175,'recoil','crouch',125,212,0,0,'landing');key(177,'recoil','crouch',125,212,0,0,'landing compression');
key(179,'recoil','low',122,211,0,0,'low hit');key(180,'recoil','low',122,211,0,0,'hitstop');
key(184,'stand','crouch',120,210);key(186,'recoil','jab',119,210,0,0,'straight hit');key(187,'recoil','jab',119,210,0,0,'hitstop');
key(192,'recoil','stand',117,207);key(196,'recoil','coil',117,204,0,0,'counter coil');
key(198,'recoil','coil',117,204,0,0,'super freeze');key(217,'recoil','coil',117,204,0,0,'super freeze');
for(const [i,f] of hitFrames.entries()){
 if(i<3)continue;
 const move=hitMoves[i];const x=116-(i-3)*3,rx=207-(i-3)*3;
 if(i!==3)key(f-2,'recoil',i===9?'tuck':'coil',x,rx,i===9?7:0,0,'counter windup');
 key(f,'recoil',move,x,rx,i===9?23:0,0,i===9?'final contact':'counter hit');
 if(i!==9)key(f+1,'recoil',move,x,rx,0,0,'hitstop');
}
key(261,'recoil','finish',95,184,32,0,'KO hold');key(263,'recoil','finish',95,184,39,0,'authored fall');
// Authored contact constraints: sparks coincide with the defending guard / struck body,
// not empty space. Preserve the same constraints for the following hitstop frame.
for(const e of EXCHANGES){
 for(const n of [e.frame,e.frame+1]){
  const k=keys.get(n);if(!k)continue;
  if(e.actor==='left'){
   if(e.move==='rise'){k.right.knee=[23,2];k.right.foot=[17,24];k.right.backKnee=[-19,3];k.right.backFoot=[-28,25];k.left.knee=[32,-28];}
   const guard=e.move==='rise'?k.right.foot:k.right.hand;
   k.left.foot=[k.rightX-guard[0]-k.leftX,guard[1]-k.jump];
  }else{
   if(e.move!=='air'){k.rightX=k.leftX+78;}
   if(e.move==='finish')for(const p of Object.values(k.left))p[1]-=25;
   const target:Point=e.move==='low'?[k.left.knee[0],42]:e.move==='body'?[k.left.neck[0]+5,-22]:[k.left.head[0]+6,k.left.head[1]];
   const endpoint:Point=[k.rightX-k.leftX-target[0],target[1]+k.jump];
   if(e.move==='jab'||e.move==='finish'){k.right.hand=endpoint;k.right.elbow=[endpoint[0]*.54,endpoint[1]+15];}
   else {k.right.foot=endpoint;k.right.knee=[endpoint[0]*.48,endpoint[1]+12];}
  }
 }
}
export const POSE_TIMELINE=[...keys.values()].sort((a,b)=>a.frame-b.frame);
const lerpPose=(a:Pose,b:Pose,p:number)=>blend(a,b,p);
function fallen(p:Pose,amount:number):Pose {const a=-1.42*amount;return Object.fromEntries(Object.entries(p).map(([k,[x,y]])=>[k,[x*Math.cos(a)-y*Math.sin(a),x*Math.sin(a)+y*Math.cos(a)+23*amount]])) as Pose;}
export function replayFrame(input:number){
 const t=Math.max(0,Math.min(REPLAY_DURATION,Number.isFinite(input)?input:0)),frame=sourceFrame(t);
 const a=POSE_TIMELINE.filter(k=>k.frame<=frame).at(-1)!,b=POSE_TIMELINE.find(k=>k.frame>frame)??a;
 const progress=a===b?0:(frame-a.frame)/(b.frame-a.frame);
 let left=lerpPose(a.left,b.left,progress);const right=lerpPose(a.right,b.right,progress);
 const last=EXCHANGES.filter(e=>e.frame<=frame).at(-1);
 const event=last??EXCHANGES[0],spark=!!last&&frame-last.frame<=1;
 const ko=frame>=FINAL_CONTACT_FRAME;
 const fall=ko?Math.max(0,(frame-FINAL_CONTACT_FRAME-1)/2):0;
 if(ko)left=fallen(left,fall);
 const hpLeft=100-EXCHANGES.filter(e=>e.frame<=frame).reduce((n,e)=>n+e.damage,0);
 return {t,frame,left,right,leftX:mix(a.leftX,b.leftX,progress),rightX:mix(a.rightX,b.rightX,progress),jump:mix(a.jump,b.jump,progress),yaw:mix(a.yaw,b.yaw,progress),phase:a.phase,event,intensity:spark?1:0,hitstop:spark||(frame>=198&&frame<=217),spark,hpLeft,hpRight:100,ko,fall,loser:ko?'left':null,flash:frame===FINAL_CONTACT_FRAME||frame===FINAL_CONTACT_FRAME+1,chapter:frame<73?'01 · 연속 킥':frame<145?'02 · 회전 킥과 패링':frame<175?'03 · 점프와 공중 반격':frame<256?'04 · 근접 반격':'05 · 마지막 타격',label:ko?'KO · 석호 / 승현 승리':spark?event.label:frame>=198&&frame<=217?'반격 준비 · 정지':a.phase==='landing'?'착지':frame<145?'패링 공방':frame<175?'공중 공방':'연속 반격'};
}
