// Shared presentation geometry, +x = facing, +y = actor's RIGHT.
// No simulation imports, mutation, time source, or random numbers.
export type PoseShape = {kind:'line'|'rect'|'circle'; x:number;y:number; x2?:number;y2?:number;w?:number;h?:number;r?:number;color:number; thickness?:number};
export function seokhoPose(phase:string, progress=0) {
 const shapes:PoseShape[]=[];
 const line=(x:number,y:number,x2:number,y2:number,color:number,thickness:number)=>shapes.push({kind:'line',x,y,x2,y2,color,thickness});
 const rect=(x:number,y:number,w:number,h:number,color:number)=>shapes.push({kind:'rect',x,y,w,h,color});
 const circle=(x:number,y:number,r:number,color:number)=>shapes.push({kind:'circle',x,y,r,color});
 const pants=0x161922,jacket=0x9398a2,shade=0x7c818c,skin=0xf1c6a6,hair=0x101622;
 if(phase==='prone') {
  // Knees folded behind hips, both palms planted ahead, forehead down between hands.
  line(-10,-7,-18,-10,pants,7);line(-18,-10,-22,-5,pants,5);
  line(-10,7,-18,10,pants,7);line(-18,10,-22,5,pants,5);
  line(-10,0,4,0,shade,17);line(-8,-5,3,-5,jacket,5);
  line(0,-7,9,-12,jacket,5);line(9,-12,16,-11,shade,4);
  line(0,7,9,12,jacket,5);line(9,12,16,11,shade,4);
  rect(14,-14,7,5,skin);rect(14,9,7,5,skin);
  circle(12,0,7,hair);rect(15,-3,5,6,skin);rect(8,-5,5,2,0x303541);
  return {shapes,pose:'dogeza',right:null,left:null,extension:0,footStep:0};
 }
 const strike=phase==='right'||phase==='left';
 const p=Math.max(0,Math.min(1,progress));
 const extension=strike?Math.sin(Math.PI*p):0;
 const side=phase==='left'?-1:1;
 const turn=extension*side*3,step=extension*5;
 // Staggered fitted trousers and planted feet, small forward step with striking side.
 for(const s of [-1,1]) {const foot=-7+(s===side?step:0);line(-3,s*6,-10,s*10,pants,5);line(-10,s*10,foot,s*15,pants,4);line(foot-3,s*15,foot+5,s*15,hair,4);}
 line(-2,-7+turn,1,7+turn,shade,14);line(1,-6+turn,4,5+turn,jacket,7);
 // Original identity: short upright dark hair, thick eyebrows, no glasses.
 circle(4,0,6,skin);rect(-2,-6,7,12,hair);rect(-4,-5,3,3,hair);rect(-4,1,3,3,hair);
 rect(6,-4,2,2,hair);rect(6,2,2,2,hair);
 const hand=(s:number)=>{const punching=strike&&s===side;const x=10+(punching?20*extension:0),y=s*(punching?6-3*extension:6);
 line(0,s*8+turn,punching?8+10*extension:3,s*(punching?9:12),jacket,5);
 line(punching?8+10*extension:3,s*(punching?9:12),x,y,shade,4);circle(x,y,3.5,skin);return{x,y};};
 const left=hand(-1),right=hand(1);
 return {shapes,pose:strike?'boxing-'+phase:'boxing-guard',right,left,extension,footStep:step};
}
