// Original, staged choreography. No Battle, RNG, damage, or stored-stat dependencies.
export const REPLAY_DURATION = 8.8;
export type Move = 'high'|'turn'|'rise'|'air'|'low'|'jab'|'body'|'finish';
export const EXCHANGES: {at:number; move:Move; actor:'left'|'right'; label:string}[] = [
 {at:.12,move:'rise',actor:'left',label:'첫 올려차기'},
 ...[.48,.86,1.22,1.60,1.96,2.30].map(at=>({at,move:'high' as const,actor:'left' as const,label:'연속 상단 킥 · 패링'})),
 ...[2.66,3.03,3.39,3.76,4.12,4.48].map(at=>({at,move:'turn' as const,actor:'left' as const,label:'회전 연속 킥 · 패링'})),
 {at:5.22,move:'rise',actor:'left',label:'승현 점프 · 석호 올려차기'},
 {at:5.70,move:'air',actor:'right',label:'공중 반격'},
 {at:6.03,move:'low',actor:'right',label:'착지 · 하단 공격'},
 {at:6.28,move:'jab',actor:'right',label:'근접 스트레이트'},
 {at:6.65,move:'body',actor:'right',label:'몸통 킥'},
 {at:7.14,move:'body',actor:'right',label:'연결 킥'},
 {at:7.64,move:'jab',actor:'right',label:'근접 연타'},
 {at:8.68,move:'finish',actor:'right',label:'점프 피니시 · 큰 타격'}
];
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
export function replayFrame(input:number) {
 const t=Math.max(0,Math.min(REPLAY_DURATION,Number.isFinite(input)?input:0));
 const event=EXCHANGES.reduce((a,b)=>Math.abs(b.at-t)<Math.abs(a.at-t)?b:a);
 const delta=t-event.at;
 // 70 ms contact hold is built into the 8.8s choreography, not extra clock time.
 const intensity=delta<-.19||delta>.23?0:delta<-.035?(delta+.19)/.155:delta<.035?1:1-(delta-.035)/.195;
 const hitstop=Math.abs(delta)<=.035;
 let left=standing(),right=standing();
 if(intensity>0){
  if(event.actor==='left')left=blend(left,strike(event.move),intensity);else right=blend(right,strike(event.move),intensity);
  const block=standing();block.neck=[-6,-38];block.head=[-7,-52];block.elbow=[21,-26];block.hand=[29,-49];block.backElbow=[9,-22];block.backHand=[22,-39];
  if(event.actor==='left')right=blend(right,block,intensity);
  else {const recoil=standing();recoil.neck=[-17,-35];recoil.head=[-23,-47];recoil.hand=[19,-30];left=blend(left,recoil,intensity);}
 }
 const jump=t>=4.78&&t<5.92?Math.sin((t-4.78)/1.14*Math.PI)*63: t>=8.20?Math.sin(Math.min(1,(t-8.20)/.75)*Math.PI)*43:0;
 if(t>=4.78&&t<5.56){const tuck=Math.sin((t-4.78)/.78*Math.PI);right.knee=[25,25-20*tuck];right.foot=[18,50-27*tuck];right.backKnee=[-21,25-23*tuck];right.backFoot=[-31,50-27*tuck];
  if(intensity>0&&event.move==='rise'){left.knee=[28,-23];left.foot=[65,-62];}}
 const approach=t<5.65?0:Math.min(1,(t-5.65)/.4)*17;
 const retreat=t>7.8?Math.min(1,(t-7.8)/.4)*24:0;
 const jumpAdvance=t>=4.78&&t<5.7?Math.sin((t-4.78)/.92*Math.PI)*31:0;
 const finishAdvance=t>8.2?Math.min(1,(t-8.2)/.48)*55:0;
 const rightX=250-approach+retreat-finishAdvance,leftX=132+jumpAdvance-(t>5.7?Math.min(1,(t-5.7)/2)*16:0);
 const spark=delta>=-.025&&delta<.12;
 const hpLeft=100-EXCHANGES.filter(e=>e.actor==='right'&&e.at<=t).length*8;
 return {t,left,right,leftX,rightX,jump,event,intensity,hitstop,spark,hpLeft,hpRight:100,flash:event.move==='finish'&&spark,chapter:t<2.5?'01 · 연속 킥':t<4.78?'02 · 회전 킥과 패링':t<5.92?'03 · 점프와 공중 반격':t<8.2?'04 · 근접 반격':'05 · 마지막 타격',label:intensity>0?event.label:t<4.78?'공방 계속':t<8.2?'거리 회복':'마지막 도약'};
}
