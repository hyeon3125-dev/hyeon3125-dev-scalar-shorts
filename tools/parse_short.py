#!/usr/bin/env python3
"""단편(short story) 매뉴스크립트 → SNZ 인터랙티브 엔진 SCRIPT 데이터.

단편 스키마(SNZ 본편보다 단순):
  # 제목            → 작품(work) 시작 (vol 인덱스 = 작품 순서)
  ## Ch.N           → 챕터 유닛 (없으면 작품 자체가 1유닛)
  -----             → 씬 경계
  빈 줄 구분 문단    → 씬의 line 1개
  *… — 끝*          → 종료 마커(스킵)

출력은 snz-novel/game 엔진이 그대로 읽는 window.SCRIPT 셰이프
(meta/order/units/scenes). 인터랙티브(fx/interaction/gate/seed)는 사이드카(-a)로 주입.

사용:
  parse_short.py manuscript/ko/_order.txt -o game/script.js [-a tools/annotations/ko.json] [--lang ko]
"""
import argparse, json, re, hashlib, datetime, unicodedata
from pathlib import Path

PREFIX = {"inefficiency": "ineff", "memory_router": "router",
          "difference": "diff", "weight_of_lips": "lips"}
SEP = re.compile(r"^-{3,}$")           # 단편은 ----- (3+) 씬 구분
END = re.compile(r"^\*.*(끝|終わり|end)\*$", re.I)
H1 = re.compile(r"^# (.+)$")
H2 = re.compile(r"^## Ch\.(\d+)\s*$")

def is_skip(t):
    return (not t) or t.startswith("#") or SEP.match(t) or END.match(t) \
        or (set(t) <= {"=", "-"} and len(t) >= 3) or t.startswith("*[")

def parse_file(path, vol, prefix):
    """1개 작품 → (units{}, scenes{}, order[])"""
    raw = unicodedata.normalize("NFC", Path(path).read_text(encoding="utf-8"))
    title = None
    units, scenes, order = {}, {}, []
    cur_ch, cur_uid, cur_lines, sidx = None, None, None, 0

    def open_unit(ch):
        nonlocal cur_uid, sidx
        uid = prefix if ch is None else f"{prefix}_c{ch}"
        label = title if ch is None else f"{ch}장"   # 단일=제목, 챕터=N장 (TOC 그룹헤더가 작품명)
        units[uid] = {"label": label, "kind": "chapter", "vol": vol,
                      "ch": ch or 1, "arc": title, "seed": None,
                      "gate": None, "reach": None, "sound": None}
        cur_uid, sidx = uid, 0
        return uid

    def flush_scene(lines):
        nonlocal sidx
        if not lines:
            return
        sidx += 1
        sid = f"{cur_uid}_s{sidx:02d}"
        scenes[sid] = {"id": sid, "unit": cur_uid, "faction": "trio",
                       "lines": [{"t": l} for l in lines], "interaction": None,
                       "sound": None, "next": None, "gate": None}
        order.append(sid)

    pending = []
    for line in raw.split("\n"):
        t = line.strip()
        m1 = H1.match(t)
        if m1:
            title = m1.group(1).strip()
            continue
        m2 = H2.match(t)
        if m2:
            flush_scene(pending); pending = []
            open_unit(int(m2.group(1)))
            continue
        if SEP.match(t):
            flush_scene(pending); pending = []
            continue
        if is_skip(t):
            continue
        # 첫 본문 전에 ## Ch 가 없었으면 작품 자체가 1유닛
        if cur_uid is None:
            open_unit(None)
        pending.append(t)
    flush_scene(pending)
    return units, scenes, order

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("order_file")
    ap.add_argument("-o", "--out", required=True)
    ap.add_argument("-a", "--annotations")
    ap.add_argument("--lang", default="ko")
    args = ap.parse_args()

    of = Path(args.order_file)
    base = of.parent
    slugs = [s for s in of.read_text(encoding="utf-8").split("\n") if s.strip()]
    units, scenes, order, sources = {}, {}, [], []
    for vol, slug in enumerate(slugs, 1):
        path = base / f"{slug}.md"
        u, sc, od = parse_file(path, vol, PREFIX.get(slug, slug[:5]))
        units.update(u); scenes.update(sc); order += od
        sources.append({"file": f"{slug}.md",
                        "sha256": hashlib.sha256(path.read_bytes()).hexdigest()[:16]})

    # 선형 next 연결
    for i, sid in enumerate(order):
        scenes[sid]["next"] = order[i + 1] if i + 1 < len(order) else None

    # 사이드카 주입 (fx/interaction/gate/seed)
    seed_total = 0
    if args.annotations and Path(args.annotations).exists():
        ann = json.loads(Path(args.annotations).read_text(encoding="utf-8"))
        for sid, fxmap in ann.get("fx", {}).items():
            for li, fx in fxmap.items():
                scenes[sid]["lines"][int(li)]["fx"] = fx
        for sid, spec in ann.get("interaction", {}).items():
            scenes[sid]["interaction"] = spec
        for sid, g in ann.get("gate", {}).items():
            scenes[sid]["gate"] = g
        for uid, sd in ann.get("seed", {}).items():
            units[uid]["seed"] = sd
        for uid, g in ann.get("unit_gate", {}).items():
            units[uid]["gate"] = g
        seed_total = len({s for sd in ann.get("seed", {}).values() for s in sd})

    line_count = sum(len(s["lines"]) for s in scenes.values())
    script = {
        "meta": {
            "work": "차이 — 단편집",
            "lang": args.lang,
            "generated": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds"),
            "sources": sources,
            "sceneCount": len(scenes), "lineCount": line_count,
            "reachRules": {"fullSeedsMin": 0, "fullUnchosenMax": 9999, "silentUnchosenMin": 3},
            "seedTotal": seed_total,
        },
        "order": order, "units": units, "scenes": scenes,
    }
    out = Path(args.out)
    out.write_text("window.SCRIPT = " + json.dumps(script, ensure_ascii=False, separators=(",", ":")) + ";\n",
                   encoding="utf-8")
    print(f"{out.name}: 작품 {len(slugs)} · 유닛 {len(units)} · 씬 {len(scenes)} · 라인 {line_count} · seed {seed_total}")

if __name__ == "__main__":
    main()
