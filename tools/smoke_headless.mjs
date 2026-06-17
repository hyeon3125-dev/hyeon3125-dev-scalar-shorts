#!/usr/bin/env node
/* 단편집 헤드리스 스모크 — 최소 DOM 스텁 위에서 SNZ 5레이어 엔진을 구동.
 * 커버: 완주(4작품 7유닛 전수)·라인 전수 출력·인터랙션 자동충족·저장/이어읽기.
 * SNZ 전용(가문 판정·16떡밥·도달분기)은 단편에 부재 → 검사 안 함(자동 휴면 확인).
 * SNZ_LANG=en|jp 으로 언어판 회귀 (번역 단계 이후).
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const GAME = new URL("../game/", import.meta.url).pathname;
const LANG = ["en", "jp"].includes(process.env.SNZ_LANG) ? process.env.SNZ_LANG : "ko";
const SUF = LANG === "en" ? "_en" : (LANG === "jp" ? "_jp" : "");
const SCRIPT_FILE = LANG === "en" ? "script.en.js" : (LANG === "jp" ? "script.jp.js" : "script.js");
const T = LANG === "en" ? { begin: "Begin", resume: "Continue" }
  : LANG === "jp" ? { begin: "読みはじめる", resume: "続きを読む" }
  : { begin: "읽기 시작", resume: "이어서 읽기" };
const FILES = [SCRIPT_FILE, "state.js", "director.js", "stage.js", "input.js", "main.js"];

function makeElement(tag) {
  const el = {
    tag, children: [], className: "", textContent: "", hidden: false,
    _innerHTML: "", _listeners: {}, _attrs: {}, style: {},
    classList: { _s: new Set(), add(...c) { c.forEach((x) => this._s.add(x)); },
      remove(...c) { c.forEach((x) => this._s.delete(x)); }, contains(c) { return this._s.has(c); } },
    appendChild(c) { this.children.push(c); c.parent = this; return c; },
    prepend(c) { this.children.unshift(c); },
    after(c) { if (this.parent) this.parent.children.push(c); },
    remove() { if (this.parent) this.parent.children = this.parent.children.filter((x) => x !== this); },
    cloneNode() { return makeElement(this.tag); },
    querySelectorAll() { return []; },
    addEventListener(name, fn) { (this._listeners[name] ||= []).push(fn); },
    removeEventListener() {}, setAttribute(k, v) { this._attrs[k] = v; },
    getAttribute(k) { return this._attrs[k] ?? null; }, removeAttribute(k) { delete this._attrs[k]; },
    scrollTo() {}, closest() { return null; },
    get previousElementSibling() { const i = this.parent ? this.parent.children.indexOf(this) : -1; return i > 0 ? this.parent.children[i - 1] : null; },
    get scrollHeight() { return 0; },
    set innerHTML(v) { this._innerHTML = v; if (v === "") this.children = []; },
    get innerHTML() { return this._innerHTML; },
    click() { (this._listeners.click || []).forEach((fn) => fn({ stopPropagation() {} })); },
  };
  return el;
}
function makeDom() {
  const byId = {};
  for (const id of ["viewport", "flow", "hud", "title-screen", "tap-space",
                    "crack-overlay", "gesture-hint", "choice-box", "lens-mask", "toc", "thickness"])
    byId[id] = makeElement("div");
  const docListeners = {};
  const document = {
    documentElement: makeElement("html"), body: makeElement("body"), activeElement: null,
    getElementById: (id) => byId[id] || null, createElement: (tag) => makeElement(tag),
    addEventListener: (name, fn) => { (docListeners[name] ||= []).push(fn); },
    dispatch: (name, ev) => (docListeners[name] || []).slice().forEach((fn) => fn(ev)),
  };
  return { document, byId };
}
function makeStorage(b) {
  return { getItem: (k) => (k in b ? b[k] : null), setItem: (k, v) => { b[k] = String(v); },
    removeItem: (k) => { delete b[k]; }, key: (i) => Object.keys(b)[i] ?? null, get length() { return Object.keys(b).length; } };
}
function bootGame(backing) {
  const { document, byId } = makeDom();
  let timeOffset = 0; const RealNow = Date.now.bind(Date);
  const FakeDate = class extends Date {}; FakeDate.now = () => RealNow() + timeOffset;
  const sandbox = {
    LANG, document, localStorage: makeStorage(backing), matchMedia: () => ({ matches: false }),
    navigator: {}, requestAnimationFrame: (fn) => fn(), setTimeout, clearTimeout, setInterval, clearInterval,
    console: { debug() {}, log: console.log, error: console.error, warn: console.warn },
    Date: FakeDate, JSON, Promise, Math, _tick: (ms) => { timeOffset += ms; },
  };
  sandbox.window = sandbox;
  const ctx = vm.createContext(sandbox);
  for (const f of FILES) vm.runInContext(readFileSync(GAME + f, "utf-8"), ctx, { filename: f });
  document.dispatch("DOMContentLoaded");
  return { ctx: sandbox, document, byId };
}

const tapEvent = { target: { closest: () => null } };
const tick = () => new Promise((r) => setImmediate(r));
let failures = 0;
const check = (cond, msg) => { if (cond) console.log("  ✓", msg); else { console.error("  ✗ FAIL:", msg); failures++; } };
const settingsPreset = (extra) => JSON.stringify(Object.assign({ reducedMotion: true, autoResolveInteractions: true, volume: 0 }, extra));

async function playToEnd(g, maxTaps) {
  const flow = g.byId.flow; let taps = 0;
  while (!flow.children.some((c) => c.className.includes("end-card")) && taps < maxTaps) {
    g.document.dispatch("click", tapEvent); g.ctx._tick(4000); await tick(); taps++;
  }
  return taps;
}

// ════ 1. 완주 — 4작품 전수 출력 ════
console.log("[1] 단편집 완주 (4작품 7유닛)");
{
  const store = { shorts_settings: settingsPreset({}) };
  const g = bootGame(store);
  g.byId["title-screen"].children.filter((c) => c.className.includes("title-btn"))[0].click();
  const S = g.ctx.SCRIPT;
  const taps = await playToEnd(g, S.meta.lineCount + 400);
  const flow = g.byId.flow;
  const lines = flow.children.filter((c) => c.className.includes("line") && !c.className.includes("fx-echo")).length;
  const work = flow.children.filter((c) => c.className.includes("work-card"));
  const chap = flow.children.filter((c) => c.className.includes("unit-card"));
  const stories = new Set(Object.values(S.units).map((u) => u.arc)).size;
  check(flow.children.some((c) => c.className.includes("end-card")), `완주: ${taps}탭`);
  check(lines >= S.meta.lineCount - 1 && lines <= S.meta.lineCount, `라인 전수 출력 ${lines}/${S.meta.lineCount}`);
  check(work.length === stories, `작품 제목 카드 ${work.length}/${stories} (단편집 경계)`);
  check(work.length + chap.length === Object.keys(S.units).length, `작품+챕터 카드 = 유닛 ${work.length + chap.length}/${Object.keys(S.units).length}`);
  check(g.ctx.STATE.getJudgement() === null, "판정 비발동 (단편 = ch.200 없음)");
}

// ════ 2. 저장/이어읽기 ════
console.log("[2] 중간 이탈 → 이어읽기");
{
  const store = { shorts_settings: settingsPreset({}) };
  let g = bootGame(store);
  g.byId["title-screen"].children.filter((c) => c.className.includes("title-btn"))[0].click();
  for (let i = 0; i < 20; i++) { g.document.dispatch("click", tapEvent); g.ctx._tick(4000); await tick(); }
  const saved = JSON.parse(store["shorts_progress" + SUF]);
  check(saved && saved.lineIdx > 0, `진행 자동 저장: ${saved && saved.sceneId}@${saved && saved.lineIdx}`);
  g = bootGame(store);
  const btns = g.byId["title-screen"].children.filter((c) => c.className.includes("title-btn"));
  check(btns.length === 2 && btns[0].textContent === T.resume, "이어서 읽기 노출");
  btns[0].click();
  const restored = g.byId.flow.children.filter((c) => c.className.includes("line")).length;
  check(restored === saved.lineIdx, `맥락 복원 ${saved.lineIdx}줄`);
}

// ════ 3. 침묵 회수 — 말하지 않은 것이 끝에서 빈칸으로 (입술의 무게 심화) ════
console.log("[3] 침묵 주행 → 침묵 후기(회수)");
{
  // 제시받은 비선택 3건(침묵)을 미리 기록 → 컬렉션 끝에서 silent reach + 후기
  const unchosen = ["lips_s03", "lips_s04", "lips_s07"].map((sceneId, i) => ({ sceneId, ts: i + 1 }));
  const store = {
    shorts_settings: settingsPreset({}),
    ["shorts_unchosen" + SUF]: JSON.stringify(unchosen),
    ["shorts_progress" + SUF]: JSON.stringify({ sceneId: "lips_s07", lineIdx: 0, ts: 1 }),
  };
  const g = bootGame(store);
  g.byId["title-screen"].children.filter((c) => c.className.includes("title-btn"))[0].click();
  await playToEnd(g, 400);
  const flow = g.byId.flow;
  const endReach = flow.children.find((c) => c.className.includes("end-card"));
  const epilogue = flow.children.some((c) => c.className.includes("unit-card") && c.textContent === (LANG === "en" ? "The Unasked" : (LANG === "jp" ? "問わなかったもの" : "묻지 않은 것들")));
  check(!!endReach, "완주(침묵 경로)");
  check(epilogue, "침묵 후기 1씬 — 말하지 않은 것들이 빈칸으로 회수");
}

console.log(`[lang=${LANG}] `, failures ? `\n스모크 실패 — ${failures}건` : "\n스모크 전부 통과");
process.exit(failures ? 1 : 0);
