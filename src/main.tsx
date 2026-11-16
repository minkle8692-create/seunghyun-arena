import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import { Arena, type Control } from "./Arena";
import {
  DEFAULT,
  effectiveStats,
  VERSION,
  createBattle,
  summarize,
  type Config,
  type Stats,
  type Event,
} from "./sim";
import { readSaved, save } from "./storage";
import "./style.css";
import { CharacterPreview } from "./characters";
import { aggregate } from "./statistics";
const labels = ["체력", "스태미너", "기술", "파워", "스피드", "방어"];
const titles: Record<string, string> = {
  A_win: "14세 승현 승리!",
  B_win: "35세 승현 승리!",
  draw: "동시 KO · 무승부",
  timeout: "시간 종료 · 미결",
};
const newSeed = () => crypto.getRandomValues(new Uint32Array(1))[0];
type Result = ReturnType<typeof summarize> & { trialIndex: number };
type Batch = {
  jobId: number;
  status: string;
  results: Result[];
  total: number;
  canceled?: number;
  errors?: number;
  unstarted?: number;
  error?: string;
};
function App() {
  const initial = useRef(readSaved("arena.draft"));
  const [draft, setDraft] = useState<Config>(
    initial.current.config || structuredClone(DEFAULT),
  );
  const [notice, setNotice] = useState(initial.current.error || "");
  const [seed, setSeed] = useState(20261116);
  const [speed, setSpeed] = useState(1);
  const [paused, setPaused] = useState(true);
  const [view, setView] = useState(() => summarize(createBattle(draft, seed)));
  const [logs, setLogs] = useState<Event[]>([]);
  const [batch, setBatch] = useState<Batch | null>(null);
  const [hidden, setHidden] = useState(document.hidden);
  const worker = useRef<Worker | null>(null),
    jobId = useRef(0),
    seen = useRef(0);
  const batchRef = useRef(batch);
  batchRef.current = batch;
  const control = useRef<Control>({
    state: createBattle(draft, seed),
    paused: true,
    speed: 1,
    hidden: false,
    onTick: () => {},
    actual: 0,
    events: [],
  });
  control.current.onTick = () => {
    const s = control.current.state;
    setView(summarize(s));
    if (s.tick !== seen.current) {
      seen.current = s.tick;
      const events = control.current.events.splice(0);
      if (events.length)
        setLogs((l) => [...events.reverse(), ...l].slice(0, 45));
    }
  };
  control.current.speed = speed;
  control.current.paused = paused;
  control.current.hidden = hidden;
  useEffect(() => {
    const id = setTimeout(() => {
      const e = save("arena.draft", draft);
      if (e) setNotice(e);
    }, 350);
    return () => clearTimeout(id);
  }, [draft]);
  const hiddenPaused = useRef(false);
  useEffect(() => {
    const visibility = () => {
      setHidden(document.hidden);
      const b = batchRef.current;
      if (document.hidden && b?.status === "running") {
        hiddenPaused.current = true;
        worker.current?.postMessage({ type: "pause", jobId: b.jobId });
      } else if (!document.hidden && hiddenPaused.current) {
        if (b?.status === "paused") {
          hiddenPaused.current = false;
          worker.current?.postMessage({ type: "resume", jobId: b.jobId });
        }
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      worker.current?.terminate();
    };
  }, []);
  useEffect(() => {
    if (new URLSearchParams(location.search).has("diagnostics"))
      import("./diagnostics").then((m) =>
        m.installDiagnostics(() => structuredClone(control.current.state)),
      );
  }, []);
  const busy = batch?.status === "running" || batch?.status === "paused";
  function start(config: Config, chosen: number) {
    control.current.state = createBattle(config, chosen);
    control.current.actual = 0;
    control.current.events = [];
    setSeed(chosen);
    setView(summarize(control.current.state));
    setLogs([]);
    seen.current = 0;
    setPaused(false);
    const e = save("arena.last", config);
    if (e) setNotice(e);
  }
  function edit(team: "A" | "B", index: number, value: number) {
    setDraft((d) => {
      const copy = structuredClone(d);
      if (index < 0) copy[team].count = value;
      else copy[team].stats[index] = value;
      return copy;
    });
  }
  function batchStart() {
    setPaused(true);
    worker.current?.terminate();
    const w = new Worker(new URL("./batch.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.current = w;
    const id = ++jobId.current;
    setBatch({ jobId: id, status: "running", results: [], total: 100 });
    w.onmessage = (e) => {
      if (e.data.jobId !== jobId.current) return;
      setBatch(e.data);
      if (
        e.data.status === "paused" &&
        hiddenPaused.current &&
        !document.hidden
      ) {
        hiddenPaused.current = false;
        w.postMessage({ type: "resume", jobId: e.data.jobId });
      }
    };
    w.onerror = (e) => {
      setBatch((b) =>
        b ? { ...b, status: "error", errors: 1, error: e.message } : b,
      );
    };
    w.postMessage({
      type: "start",
      jobId: id,
      config: draft,
      seed,
      total: 100,
    });
  }
  const stats = aggregate(batch?.results || []);
  const n = stats.N;
  const resultCount = (o: string) =>
    batch?.results.filter((r) => r.outcome === o).length || 0;
  const rate = (v: number) =>
    n ? `${((v / n) * 100).toFixed(1)}% (${v}/${n})` : "산출 불가";
  return (
    <main>
      <header>
        <a className="brand" href="#">
          S<span>✦</span>S <small>PIXEL ARENA</small>
        </a>
        <span className="version">LOCAL SIM · v1.4</span>
      </header>
      <section className="intro">
        <div className="eyebrow">같은 이름, 다른 전성기</div>
        <h1>
          승현 <span>VS</span> 승현
        </h1>
        <p>수적 우위와 한 끗의 기술. 마지막까지 살아남는 팀은?</p>
      </section>
      <div className="layout">
        <section className="watch">
          <div className="scoreboard">
            {(["A", "B"] as const).map((t) => (
              <div className={`score ${t}`} key={t}>
                <CharacterPreview team={t} />
                <div>
                  <b>{t === "A" ? "14세 승현" : "35세 승현"}</b>
                  <strong>
                    {view[t].alive}
                    <small> / {view.config[t].count}</small>
                  </strong>
                </div>
                <progress value={view[t].hp} max={view[t].maxHp} />
                <small>
                  팀 HP {(view[t].hp / 100).toFixed(0)} / {view[t].maxHp / 100}
                </small>
              </div>
            ))}
          </div>
          <div className="arenaWrap">
            <div className="matchLabel">
              <span className="dot" />{" "}
              {view.outcome ? "경기 종료" : paused ? "준비 / 일시정지" : "LIVE"}
              <b data-testid="time">
                {(view.tick / 30).toFixed(1)} <small>/ 180s</small>
              </b>
            </div>
            <Arena control={control} />
            {view.outcome && (
              <div className="result" role="status">
                <span>ROUND FINISHED</span>
                <h2>{titles[view.outcome]}</h2>
                <p>
                  {view.outcome === "timeout"
                    ? "양 팀 생존 · HP로 승자를 정하지 않습니다."
                    : view.outcome === "draw"
                      ? "동일 tick에 양 팀 모두 KO됐습니다."
                      : "상대 전원 KO + 우리 팀 생존 · 승자들의 감격의 눈물!"}
                </p>
              </div>
            )}
          </div>
          <div className="controls">
            <button
              className="primary"
              disabled={!!busy}
              onClick={() => {
                if (view.outcome) start(control.current.state.config, seed);
                else {
                  control.current.paused = !paused;
                  setView(summarize(control.current.state));
                  setPaused(!paused);
                }
              }}
            >
              {view.outcome
                ? "↻ 다시 관전"
                : paused
                  ? "▶ 전투 시작 / 재개"
                  : "Ⅱ 일시정지"}
            </button>
            {(view.outcome === "A_win" || view.outcome === "B_win") && (
              <button onClick={() => { control.current.paused = !paused; setPaused(!paused); }}>
                {paused ? "눈물 모션 재개" : "눈물 모션 일시정지"}
              </button>
            )}
            <div className="speeds">
              {[1, 2, 4].map((v) => (
                <button
                  key={v}
                  aria-pressed={speed === v}
                  onClick={() => setSpeed(v)}
                >
                  {v}×
                </button>
              ))}
            </div>
          </div>
          <div className="secondary">
            <button
              disabled={!!busy}
              onClick={() => start(control.current.state.config, seed)}
            >
              ↻ 같은 시드 재시작
            </button>
            <button disabled={!!busy} onClick={() => start(draft, newSeed())}>
              ✦ 새 시드 전투
            </button>
          </div>
          <div className="meta">
            SEED {seed} · 30Hz 고정 · 실효 {control.current.actual.toFixed(2)}×{" "}
            {hidden ? "· 탭 숨김 자동 정지" : ""}
          </div>
          <div className="metrics">
            <span>
              명중 <b>{view.counts.hit}</b>
            </span>
            <span>
              회피 <b>{view.counts.dodge}</b>
            </span>
            <span>
              KO <b>{view.counts.ko}</b>
            </span>
            <span>
              ✦ 치명 <b>{view.counts.crit}</b>
            </span>
          </div>
          <details className="panel logs">
            <summary>
              전투 기록 <small>최근 사건 · 진단 JSON 내려받기</small>
            </summary>
            <button
              onClick={() => download("battle.json", { ...view, events: logs })}
            >
              현재 요약 + 최근 로그 저장
            </button>
            <div>
              {logs.length ? (
                logs.map((e, i) => (
                  <p key={i}>
                    <time>{(e.tick / 30).toFixed(1)}s</time> #{e.target} ·{" "}
                    {
                      (
                        {
                          kick_windup: "35세 승현 · 돌려차기 예고",
                          kick_hit: "돌려차기 명중 · 넉백",
                          kick: "돌려차기 발동",
                          hit: "명중",
                          crit: "✦ 치명타",
                          dodge: "회피",
                          ko: "KO",
                          invalid: "무효",
                          damage: "HP 감소",
                          canceled: "공격 취소",
                        } as Record<string, string>
                      )[e.kind]
                    }{" "}
                    {e.kind === "kick"
                      ? `${e.actual}명 타격`
                      : e.actual !== undefined
                        ? `−${e.actual / 100} (초과 ${e.overkill! / 100})`
                        : e.reason || ""}
                  </p>
                ))
              ) : (
                <p>전투가 시작되면 기록이 표시됩니다.</p>
              )}
            </div>
          </details>
        </section>
        <aside>
          <details className="panel setup" open>
            <summary>
              전투 실험실 <span>설정 초안</span>
            </summary>
            <p className="hint">
              변경은 다음 새 전투에만 적용됩니다. 진행 중 규칙은 고정!
            </p>
            {(["A", "B"] as const).map((t) => (
              <section className={`teamConfig ${t}`} key={t}>
                <h3>
                  <span>{t === "A" ? "◆" : "✦"}</span>{" "}
                  {t === "A" ? "14세 승현" : "35세 승현"}{" "}
                  <small>TEAM {t}</small>
                </h3>
                <p>
                  {t === "A"
                    ? "작고 민첩한 몸, 묵직한 팔힘. 높은 지속력과 내구성."
                    : "명시적 강화: 기본 스탯 6종 ×5. 아래는 기본값이며 실제 적용값은 별도 표시합니다."}
                </p>
                <p data-testid={`effective-${t}`}>
                  {t === "B" ? "35세 승현 ×5" : "14세 승현 ×1"} · 실제 적용 스탯<br />
                  {labels.map((label, i) => `${label} ${effectiveStats(t, draft[t].stats)[i]}`).join(" / ")}
                </p>
                <label className="count">
                  인원{" "}
                  <input
                    aria-label={`${t} 인원`}
                    type="number"
                    min="1"
                    max="100"
                    value={draft[t].count}
                    onChange={(e) =>
                      edit(
                        t,
                        -1,
                        Math.max(1, Math.min(100, Number(e.target.value) || 1)),
                      )
                    }
                  />
                  <span>명 / 최대 100</span>
                </label>
                {labels.map((label, i) => (
                  <label className="stat" key={label}>
                    <span>{label}</span>
                    <input
                      aria-label={`${t} ${label} 슬라이더`}
                      type="range"
                      min="1"
                      max="10"
                      value={draft[t].stats[i]}
                      onChange={(e) => edit(t, i, Number(e.target.value))}
                    />
                    <input
                      aria-label={`${t} ${label}`}
                      type="number"
                      min="1"
                      max="10"
                      value={draft[t].stats[i]}
                      onChange={(e) =>
                        edit(
                          t,
                          i,
                          Math.max(
                            1,
                            Math.min(10, Number(e.target.value) || 1),
                          ),
                        )
                      }
                    />
                  </label>
                ))}
              </section>
            ))}
            <div className="draftSummary">
              다음 전투:{" "}
              <b>
                {draft.A.count} vs {draft.B.count}
              </b>{" "}
              · HP {55 + 9 * draft.A.stats[0]} / {55 + 9 * effectiveStats("B", draft.B.stats)[0]}
            </div>
            <button
              className="primary wide"
              disabled={!!busy}
              onClick={() => start(draft, seed)}
            >
              이 설정으로 시작 · 같은 시드
            </button>
            <div className="secondary">
              <button onClick={() => setDraft(structuredClone(DEFAULT))}>
                기본값 복원
              </button>
              <button
                onClick={() => {
                  const s = readSaved("arena.last");
                  if (s.config) setDraft(s.config);
                  else setNotice(s.error || "마지막 실행 설정이 없습니다.");
                }}
              >
                마지막 실행 불러오기
              </button>
            </div>
            {notice && (
              <p role="status" className="notice">
                {notice}
              </p>
            )}
          </details>
          <section className="panel batch">
            <div className="eyebrow">SAME ENGINE · 100 SEEDS</div>
            <h2>100번 붙으면?</h2>
            <p>
              현재 초안으로 반복 실험합니다.
              <br />
              관전은 멈추고, 같은 규칙을 Worker에서 실행해요.
            </p>
            <button
              className="primary wide"
              disabled={!!busy}
              onClick={batchStart}
            >
              100회 실험 시작
            </button>
            {batch && (
              <>
                <progress max="100" value={n} />
                <b data-testid="batch-status">
                  유효 종료 {n}/100 ·{" "}
                  {
                    (
                      {
                        running: "중간 집계",
                        paused: "일시정지",
                        complete: "완료",
                        canceled: "취소 · 부분 집계",
                        error: "오류 · 부분 집계",
                      } as Record<string, string>
                    )[batch.status]
                  }
                </b>
                <div className="secondary">
                  <button
                    disabled={!busy}
                    onClick={() => {
                      hiddenPaused.current = false;
                      worker.current?.postMessage({
                        type: batch.status === "paused" ? "resume" : "pause",
                        jobId: batch.jobId,
                      });
                    }}
                  >
                    {batch.status === "paused" ? "실험 재개" : "실험 일시정지"}
                  </button>
                  <button
                    disabled={!busy}
                    onClick={() =>
                      worker.current?.postMessage({
                        type: "cancel",
                        jobId: batch.jobId,
                      })
                    }
                  >
                    실험 취소
                  </button>
                </div>
                <div className="rates">
                  {["A_win", "B_win", "draw", "timeout"].map((o) => (
                    <div key={o}>
                      <span>{titles[o]}</span>
                      <b>{rate(resultCount(o))}</b>
                    </div>
                  ))}
                </div>
                <p className="hint">
                  분모 N = A승 + B승 + 무승부 + 미결. 취소 {batch.canceled || 0}{" "}
                  · 오류 {batch.errors || 0} · 진행 {busy ? 1 : 0} · 미실행{" "}
                  {batch.unstarted ??
                    Math.max(0, 100 - n - (busy ? 1 : 0) - (batch.errors || 0))}
                </p>
                {batch.error && <p role="alert">{batch.error}</p>}
                <p className="hint">
                  평균 관측 종료:{" "}
                  {n
                    ? (
                        batch.results.reduce((a, r) => a + r.tick / 30, 0) / n
                      ).toFixed(2) + "초"
                    : "산출 불가"}{" "}
                  (미결 포함)
                </p>
                <p className="hint">
                  종결 평균 (미결 제외):{" "}
                  {stats.resolvedMeanSeconds?.toFixed(2) ?? "산출 불가"}초<br />
                  평균 잔존 A / B (미결 포함):{" "}
                  {stats.meanAliveA?.toFixed(1) ?? "—"} /{" "}
                  {stats.meanAliveB?.toFixed(1) ?? "—"}
                  <br />
                  관측 치명률:{" "}
                  {stats.critRate === null
                    ? "산출 불가"
                    : `${(stats.critRate * 100).toFixed(2)}% (${stats.crits}/${stats.hits} 명중)`}
                  <br />
                  명중률 (유효 대결만):{" "}
                  {stats.hitRate === null
                    ? "산출 불가"
                    : `${(stats.hitRate * 100).toFixed(1)}%`}
                </p>
                <button
                  onClick={() =>
                    download("batch.json", { ...batch, statistics: stats })
                  }
                >
                  회차별 결과 JSON 저장
                </button>
                <details>
                  <summary>회차별 결과 보기</summary>
                  <div className="trials">
                    {batch.results.map((r) => (
                      <p key={r.trialIndex}>
                        #{r.trialIndex + 1} · {titles[r.outcome!]} ·{" "}
                        {(r.tick / 30).toFixed(1)}초 · {r.A.alive}:{r.B.alive} ·
                        seed {r.seed}
                      </p>
                    ))}
                  </div>
                </details>
              </>
            )}
            <p className="hint">
              게임 알고리즘의 표본이며 현실 승률이 아닙니다. 0/100도 불가능을
              뜻하지 않아요.
            </p>
          </section>
        </aside>
      </div>
      <footer>
        <section className="panel" data-testid="multiplier-rules">
          <b>35세 승현 · 모든 기본 스탯 ×5</b>
          <p>인원은 그대로, 체력·스태미너·기술·파워·스피드·방어 입력만 5배로 계산합니다.
          슬라이더와 저장값은 기본 1~10, 실제 적용값은 5~50입니다. 최종 HP·피해를 다시 5배 하지 않습니다.</p>
          <p>HP = 55 + 9×체력 · 에너지 = 45 + 7×스태미너 · 이동속도 = 42 + 4×스피드 px/s (피로 시 감소).
          평타 명중률은 기술 차이에 따라 5~95%. 방어 10 초과 피해계수는 650/(100+7×(방어−10)),
          보정 전 평타 간격은 스피드 10 초과 시 220/스피드 틱 (피로 반영·최소 6틱). 회전킥 비용·쿨다운은 그대로입니다.</p>
        </section>
        <section className="panel" data-testid="kick-rules">
          <b>35세 승현 전용 · 킥복싱 돌려차기</b>
          <p>
            자동 발동 · 준비 0.4초 · 재사용 4초 · 스태미너 24 소모
            <br />
            전방위 360° · 중심 거리 44px · 가까운 적 최대 6명 · 몸통 뒤 관통
            없음
            <br />
            예고 범위에 남은 적에게 기본 평타 피해의 80% 확정 명중 · 치명타 없음
            · 넉백 목표 44px / 0.4초 + 회복 0.2초 (동안 이동·공격 불가, 벽·몸통은 실제 거리를 제한)
            <br />
            주변 모든 방향을 공격합니다. 14세 승현은 평타 피해 ×1.3 (최종 센티HP 반올림, 파워 스탯 불변). 35세 승현은 평타 공속 ×1.5 (×5 스탯 계산 후 간격을 2/3로 올림, 최소 4틱·준비 4틱). 치명타 확률·배율은 그대로입니다.
          </p>
        </section>
        <b>큰 픽셀, 투명한 규칙.</b>
        <p>
          양 팀 몸통·평타 사거리 동일 · 숨은 나이 / 인원 보정 없음
          <br />
          명중한 평타의 치명 확률 0.5% · 피해 1.5배 · 기술과 독립
          <br />
          동시 전멸만 무승부 · 180초 양 팀 생존은 미결
        </p>
        <small>
          {VERSION} · 오리지널 픽셀 아트 · 서버 없이 브라우저에서 실행
        </small>
      </footer>
    </main>
  );
}
function download(name: string, data: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(data, null, 2)], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
