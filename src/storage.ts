import { canonical, type Config } from "./sim";
export function readSaved(key: string): { config?: Config; error?: string } {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const data = JSON.parse(raw);
    if (data.schema !== 1) throw Error("이전 저장 형식");
    return { config: canonical(data.config) };
  } catch {
    return { error: "저장 설정을 읽지 못해 기본값으로 복구했습니다." };
  }
}
export function save(key: string, config: Config) {
  try {
    localStorage.setItem(key, JSON.stringify({ schema: 1, config }));
    return "";
  } catch {
    return "자동저장 불가 · 현재 탭에서는 정상 작동합니다.";
  }
}
