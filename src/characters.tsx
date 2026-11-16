import { identity, type Character } from "./sim";
// Original hand-authored pixels only. No reference image is bundled or loaded.
export type PixelRect = readonly [number, number, number, number, number];
const ink = 0x10131e, skin = 0xffd2ad, shade = 0xd99b7d;
export const characters: Record<Character, readonly PixelRect[]> = {
  youth: [
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
  adult: [
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
  seokho: [
    // Upright short hair, gray jacket and fitted black trousers; original pixels only.
    [5,24,15,2,ink],[7,20,4,5,0x161922],[14,20,4,5,0x161922],
    [3,12,19,10,ink],[4,13,17,8,0x7c818c],[10,13,5,9,0x252934],
    [4,13,5,8,0x9398a2],[16,13,5,8,0x9398a2],
    [8,13,2,5,0xb5bac2],[15,13,2,5,0xb5bac2],
    [2,14,3,5,0x7c818c],[21,14,3,5,0x7c818c],
    [2,19,3,3,skin],[21,19,3,3,skin],
    [6,3,13,9,ink],[7,5,11,8,skin],[5,7,2,4,skin],[18,7,2,4,skin],
    [6,2,13,3,ink],[7,0,2,3,ink],[10,0,2,3,ink],[13,0,2,3,ink],[16,0,2,3,ink],
    [7,3,11,1,0x303541],[8,7,3,1,ink],[14,7,3,1,ink],
    [9,8,1,1,ink],[15,8,1,1,ink],[10,11,5,1,0xffffff],
  ],
  mage: [
    [5,24,6,2,ink],[14,24,6,2,ink],[5,21,15,3,0x405273],
    [3,11,19,13,ink],[1,14,23,8,ink],[2,14,21,8,0xffffff],
    [4,12,17,12,0xf9fcff],[3,20,19,3,0xd6e2f0],
    [0,16,3,5,skin],[22,16,3,5,skin],[5,18,15,1,0xe7edf4],
    [5,2,15,11,ink],[6,4,13,9,skin],[4,7,2,4,skin],[19,7,2,4,skin],
    [5,1,14,4,ink],[7,0,4,2,ink],[6,4,3,2,ink],
    [8,7,2,2,ink],[15,7,2,2,ink],[8,10,2,1,0xef9d91],[16,10,2,1,0xef9d91],
    [11,10,4,2,0xffffff],[10,14,5,3,0xb4a0f8],
    // Rimless lenses: open skin-coloured centres, pale glints, thin bridge/temples.
    [6,7,1,1,0x9aafb9],[19,7,1,1,0x9aafb9],
    [7,6,4,1,0xd9f3fa],[14,6,4,1,0xd9f3fa],
    [7,7,1,2,0xb8d4df],[17,7,1,2,0xb8d4df],
    [8,9,3,1,0xc8e3eb],[14,9,3,1,0xc8e3eb],
    [11,7,3,1,0x9aafb9],[8,6,1,1,0xffffff],[15,6,1,1,0xffffff],
  ],
};
export const descriptions = {
  youth: "14세 승현 · 삐죽 검은 머리, 네모 안경, 파란 깃 하늘색 반팔 교복",
  adult: "35세 승현 · 검은 머리, 검은 반팔 티셔츠, 넓은 어깨와 근육질 체형",
  seokho: "25세 석호 · 짧게 세운 검은 머리, 회색 재킷과 검은 밀착 바지, 중간 체격의 록온 격투가",
  mage: "14세 동우 · 무테안경, 둥글고 넓은 체형, 흰옷의 야심!만만 메이지",
};
export function CharacterPreview({ team }: { team: "A" | "B" | Character }) {
  return <svg className={`characterPreview ${identity(team)}`} viewBox="0 0 26 26" role="img" aria-label={descriptions[identity(team)]} shapeRendering="crispEdges">
    {characters[identity(team)].map(([x,y,w,h,color], i) => <rect key={i} x={x} y={y} width={w} height={h} fill={`#${color.toString(16).padStart(6,"0")}`} />)}
  </svg>;
}
