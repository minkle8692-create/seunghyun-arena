// Original hand-authored pixels only. No reference image is bundled or loaded.
export type PixelRect = readonly [number, number, number, number, number];
const ink = 0x10131e, skin = 0xffd2ad, shade = 0xd99b7d;
export const characters: Record<"A" | "B", readonly PixelRect[]> = {
  A: [
    [6,24,12,2,0x162333], [7,20,4,5,0x293d59], [13,20,4,5,0x293d59],
    [5,13,14,9,ink], [6,14,12,7,0xeef8ff], [6,17,12,4,0xc5e8f5],
    [3,14,3,4,0xeef8ff], [18,14,3,4,0xeef8ff],
    [3,18,3,3,skin], [18,18,3,3,skin],
    [9,13,6,2,skin], [7,14,3,2,0x4889c6], [14,14,3,2,0x4889c6],
    [10,15,2,2,0x4889c6], [12,15,2,2,0x4889c6], [12,18,1,1,0x4889c6],
    [6,3,12,10,ink], [7,5,10,8,skin], [5,7,2,3,skin], [17,7,2,3,skin],
    [6,2,12,4,ink], [7,0,2,3,ink], [11,1,3,3,ink], [16,1,2,3,ink],
    [7,3,3,1,0x303645], [6,5,2,2,ink],
    [7,7,5,4,ink], [13,7,5,4,ink], [11,8,3,1,ink],
    [8,8,3,2,0xdaf1fb], [14,8,3,2,0xdaf1fb],
    [9,8,1,2,ink], [15,8,1,2,ink], [10,12,4,1,0xffffff],
  ],
  B: [
    [4,24,16,2,0x162333], [6,20,5,5,0x7c8798], [13,20,5,5,0x7c8798],
    [2,12,20,7,ink], [5,15,14,7,ink], [6,15,12,6,0x202431],
    [2,13,4,4,0x202431], [18,13,4,4,0x202431],
    [1,17,5,5,skin], [18,17,5,5,skin], [1,20,2,2,shade], [21,20,2,2,shade],
    [3,18,2,1,shade], [19,18,2,1,shade],
    [8,15,3,1,0x414859], [13,15,3,1,0x414859], [11,17,2,3,0x303645],
    [8,11,8,3,shade], [9,12,6,2,skin],
    [5,2,14,9,ink], [7,5,10,7,skin], [6,7,1,3,skin], [17,7,1,3,skin],
    [6,1,11,4,ink], [5,4,4,4,ink], [15,3,4,6,ink],
    [9,4,3,2,ink], [12,4,3,3,ink], [6,3,5,1,0x343b49],
    [8,8,3,1,ink], [14,8,2,1,ink], [11,11,4,1,0xffffff],
  ],
};
export const descriptions = {
  A: "14세 승현 · 삐죽 검은 머리, 네모 안경, 파란 깃 하늘색 반팔 교복",
  B: "35세 승현 · 검은 머리, 검은 반팔 티셔츠, 넓은 어깨와 근육질 체형",
};
export function CharacterPreview({ team }: { team: "A" | "B" }) {
  return <svg className="characterPreview" viewBox="0 0 24 26" role="img" aria-label={descriptions[team]} shapeRendering="crispEdges">
    {characters[team].map(([x,y,w,h,color], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={`#${color.toString(16).padStart(6,"0")}`} />)}
  </svg>;
}
