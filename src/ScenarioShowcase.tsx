import { characters } from './characters';
import { seokhoPose } from './seokhoPose';
// Presentation-only timeline: never writes to a Battle or consumes its PRNG.
export function ScenarioShowcase({chapter, elapsed, reduced}: {chapter:number;elapsed:number;reduced:boolean}) {
 const seokho=chapter===2, t=elapsed/1000;
 const phase=seokho?(t<1.8?'sumo':t<2.8?'dash':t<3.5?'right':t<4.2?'left':t<6.5?'prone':'ready'):(t<1.2?'ready':t<3?'spin':'ready');
 const slap=phase==='sumo'&&((t>.45&&t<.7)||(t>1.1&&t<1.35));
 const x=phase==='dash'?70+(t-1.8)*75:seokho&&t>=2.8?145:70;
 const boxing=seokho&&['dash','right','left','prone'].includes(phase);
 const pose=seokhoPose(phase,reduced?0.5:phase==='right'?(t-2.8)/.7:phase==='left'?(t-3.5)/.7:0);
 const rotation=phase==='spin'&&!reduced?(t-1.2)*400:phase==='prone'?85:0;
 const squat=phase==='sumo', actor=seokho?'seokho':'adult';
 const words=phase==='prone'?'내가 잘못했어 ㅠㅠ':seokho?'자신있게 맞아줄게':'360° 회전킥!';
 return <div className="showcase" data-testid="showcase" data-phase={phase} data-body-pose={boxing?pose.pose:phase}>
  <svg viewBox="0 0 300 150" role="img" aria-label={seokho?'석호 기술 소개: 무릎 두 번, 돌진, 오른손, 왼손, 무릎 꿇고 머리를 숙인 도게자 회복':'승현 기술 소개: 준비 후 몸통 회전과 돌려차기'}>
   <path d="M15 130H285" stroke="#577083"/>
   <circle cx="242" cy="104" r={seokho&&t<1.8?29-t*8:18} fill="none" stroke={seokho?'#ff7979':'#88e8ce'} strokeWidth="2"/>
   <g transform="translate(222 71) scale(1.6)" opacity=".45">{characters[seokho?'adult':'seokho'].map(([a,b,w,h,c],i)=><rect key={i} x={a} y={b} width={w} height={h} fill={'#'+c.toString(16).padStart(6,'0')}/>)}</g>
   <g transform={`translate(${reduced?100:x} ${squat?101:91})`}>
    {squat&&<g stroke="#101622" strokeWidth="10" fill="none"><path d="M-8 12L-26 21L-31 35M8 12L26 21L31 35"/></g>}
    {!boxing&&<g transform={`rotate(${rotation}) scale(${seokho?1.8:2.1}) translate(-13 -13)`}>
     {characters[actor].filter(([,y])=>!squat||y<20).map(([a,b,w,h,c],i)=><rect key={i} x={a} y={b} width={w} height={h} fill={'#'+c.toString(16).padStart(6,'0')}/>)}
     {phase==='spin'&&<path d="M17 20L31 21L36 18" stroke="#151d2a" strokeWidth="5" fill="none"/>}
    </g>}
    {boxing&&<g transform="scale(1.8)">{pose.shapes.map((s,i)=>{const fill='#'+s.color.toString(16).padStart(6,'0');return s.kind==='line'?<line key={i} x1={s.x} y1={s.y} x2={s.x2} y2={s.y2} stroke={fill} strokeWidth={s.thickness} strokeLinecap="round"/>:s.kind==='circle'?<circle key={i} cx={s.x} cy={s.y} r={s.r} fill={fill}/>:<rect key={i} x={s.x} y={s.y} width={s.w} height={s.h} fill={fill}/>;})}</g>}
    {squat&&<g stroke="#9398a2" strokeWidth="8" fill="none"><path d={slap?'M-13 0L-25 20M13 0L25 20':'M-13 0L-38 -6M13 0L38 -6'}/></g>}

   </g>
   <rect x="30" y="3" width="240" height="31" rx="12" fill="#fffdf0"/>
   <text x="150" y="24" textAnchor="middle" fill="#182235" fontSize="16" fontWeight="bold">{words}</text>
   <text x="150" y="147" textAnchor="middle" fill="#d5e4ef" fontSize="11">{phase==='right'?'본인 오른손 · 명중 시 치명타':phase==='left'?'본인 왼손 · 두 번째 타격':phase==='prone'?'살아 있는 회복 자세 · KO 아님':slap?'탁!':phase==='sumo'?'낮은 스모 자세 · 무릎 두 번':phase==='dash'?'록온 후 돌진':'기술 소개 · 실제 전투 피해 없음'}</text>
  </svg>
 </div>;
}
