#!/usr/bin/env python3
"""단편집 3판(KO/EN/JP) 구조 패리티 + echo 후렴 일치 검증 (KO = 구조 정본).

검사:
  1. order(읽기순서)·units(유닛 집합)가 3판 동일
  2. 모든 씬의 라인(문단) 수가 3판 1:1
  3. echo 후렴(작품별 고정 문장)의 '단독 라인' 등장 횟수가 3판 일치
사용: python3 tools/verify_parity.py
"""
import json, sys
from pathlib import Path

HERE = Path(__file__).parent
GAME = HERE.parent / "game"
MAN = HERE.parent / "manuscript"

def load(f):
    s = (GAME / f).read_text(encoding="utf-8")
    return json.loads(s[s.index("{", s.index("=")):s.rindex("}") + 1])

# echo 후렴: 단독 라인으로 3판 등장 횟수가 같아야 (echo>meaning)
REFRAINS = [
    {"ko": "기각.", "en": "Rejected.", "jp": "却下。"},
    {"ko": "차이를 모르겠다.", "en": "I can't tell the difference.", "jp": "違いが分からない。"},
    {"ko": "말하지 않았다.", "en": "I did not say anything.", "jp": "言わなかった。"},
]

def main():
    ko, en, jp = load("script.js"), load("script.en.js"), load("script.jp.js")
    fails = 0
    # 1·2 구조
    if not (ko["order"] == en["order"] == jp["order"]):
        print("  ✗ order 불일치"); fails += 1
    if not (list(ko["units"]) == list(en["units"]) == list(jp["units"])):
        print("  ✗ units 불일치"); fails += 1
    for sid in ko["scenes"]:
        n = {len(s["scenes"][sid]["lines"]) for s in (ko, en, jp)}
        if len(n) != 1:
            print(f"  ✗ 라인수 불일치 {sid}: {n}"); fails += 1
    if fails == 0:
        print(f"  ✓ 구조 1:1 — 유닛 {len(ko['units'])} · 씬 {len(ko['scenes'])} · 라인 {ko['meta']['lineCount']} (KO=EN=JP)")
    # 3 echo 후렴 (매뉴스크립트 단독행 기준)
    def lines(lang, slug=None):
        txt = "\n".join((MAN / lang / p.name).read_text(encoding="utf-8")
                        for p in sorted((MAN / lang).glob("*.md")))
        return txt.split("\n")
    L = {lg: lines(lg) for lg in ("ko", "en", "jp")}
    for r in REFRAINS:
        c = {lg: L[lg].count(r[lg]) for lg in ("ko", "en", "jp")}
        if len(set(c.values())) != 1:
            print(f"  ✗ echo 후렴 불일치 '{r['ko']}': {c}"); fails += 1
        else:
            print(f"  ✓ echo 후렴 '{r['ko']}' = {c['ko']}회 (3판 일치)")
    print("패리티 PASS" if not fails else f"패리티 FAIL — {fails}건")
    sys.exit(1 if fails else 0)

if __name__ == "__main__":
    main()
