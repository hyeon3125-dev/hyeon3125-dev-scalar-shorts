<div align="center">

# 차이 — 단편집
**결정론 단편집 · A Deterministic Short-Story Collection**

*SCALAR: NODE ZERO 인터랙티브 엔진 재사용 · 4편 · 한국어·English·日本語*

</div>

---

```
SNZ 엔진(5레이어)을 그대로 빌려, 짧은 철학 단편 4편을 인터랙티브 노벨로.
AI 없음 · 서버 없음 · 빌드 없음 · 의존성 0. 원고 전문 포함.
```

수록작: **비효율 · 기억 라우터 · 차이 · 입술의 무게** (전부 결정론·비가역·비선택 주제).

## 구조 · Architecture (snz-novel 미러)

```
manuscript/   원고 (정본) — ko/ 작품별 .md + _order.txt
tools/        parse_short.py(변환) · smoke_headless.mjs(회귀) · annotations/(인터랙티브 사이드카)
game/         게임 본체 — index.html · style.css · script.js[생성] · state/director/stage/input/main.js
```

**엔진은 snz-novel game/ 에서 가져와 재사용**(공유 코어). 작품별 차이는 **데이터(script)+사이드카**로만:
- `parse_short.py` 가 단편 스키마(`# 제목` / `## Ch.N` / `-----` / 문단)를 SNZ 와 동일한 `window.SCRIPT` 로 변환.
- SNZ 전용 기능(가문 테마·16떡밥·완독 판정)은 **데이터가 안 쓰면 자동 휴면**(판정은 `ch===200` 에서만 발동 → 단편엔 없음).
- 세이브 키는 `shorts_*` 로 분리(같은 호스트에서 SNZ 와 충돌 없음).

## 빌드 · Build

```bash
cd scalar-shorts
for L in ko en jp; do
  python3 tools/parse_short.py manuscript/$L/_order.txt \
    -o game/script$([ $L = ko ] && echo "" || echo ".$L").js -a tools/annotations/ko.json --lang $L
done
python3 tools/verify_parity.py                 # 3판 구조 1:1 + echo 후렴 일치
node tools/smoke_headless.mjs                   # KO 회귀; SNZ_LANG=en|jp 으로 EN/JP
cd game && python3 -m http.server 4200          # → http://localhost:4200 (타이틀서 언어 선택)
```

## 인터랙티브 설계 (M0)

엔진의 기존 어휘(fx: echo/blank/pause_b · interaction: silence/release/hold)만으로, **각 작품의 주제에 내장된** 상호작용을 입혔다.

| 작품 | 핵심 메커닉 | 적용(M0) |
|---|---|---|
| **비효율** | 결정론적 의사결정(검토→기각) | "기각" 후렴 `echo`, "허용한다" `pause_b` |
| **기억 라우터** | 저장/로드·비가역 | "로드했다" `echo`, "마셨다.마시지않았다" 중첩 `blank`, 라우터 끄기 `hold`(되돌릴 수 없는 실행), "오늘이 하나" `pause_b` |
| **차이** | 동일성 속 유일한 차이 | "차이를 모르겠다" 후렴 `echo`, 전환·결말 `pause_b` |
| **입술의 무게** | 말하지 않은 것의 누적 | 4 침묵 순간 중 3 `silence`(비선택 기록)·메일 `release`, "말하지 않았다" `echo` |

### 심화 메커닉 — SNZ 설계 검토 결과 (연출=문체 번역, 장식 금지, 비선택=기록)

- **비효율 → `timeout_choice`** ("복제한다/복제하지 않는다" → 어느 쪽이든 정해진 *却下*). 결정론 주제의 "조작된 선택".
- **입술의 무게 → 침묵 회수**: 동요 없이 끝까지 침묵한 순간을 *말하지 않은 것=비선택*으로 기록(엔진 1줄 훅) → 컬렉션 끝에서 **SNZ 침묵 후기**가 그 빈칸들을 회수. 입술 주제(말하지 않은 것의 누적)에 정확히 일치, SNZ 고유 메커닉 재사용.
- **기억 라우터 → 리터럴 리플레이는 기각**: 씬 되감기는 선형 독서를 깨고 *장식*이 됨(원문이 이미 로드를 서술). 대신 "로드했다" `echo` + 중첩 `blank`로 문체만 번역.
- **작품 경계 = 제목 카드**: 작품이 바뀌면 제목 카드(챕터 마커보다 큰 휴지)로 *새 단편 시작*을 분명히 — 단편집이 한 덩어리로 뭉개지지 않게. 순서: 비효율 → 기억 라우터 → 차이 → **입술의 무게**(끝).

## 진행 상태
- **M0 ✅** 파서 + KO 빌드(4작품·7유닛·213라인) + 엔진 부착 + 인터랙티브 1차 + 헤드리스.
- **M1 ✅** 외형 정리(엔드카드·TOC·유닛라벨) + 비효율 `timeout_choice`("조작된 선택").
- **M2 ✅** EN 번역 4편 + 구조 패리티(213=213).
- **M3 ✅** JP 번역 4편(SNZ 규약: 미니멀·echo 후렴 고정·§역접 0·인명無) + 3판 패리티 + echo 일치.
- **M4 ✅** 심화 메커닉(입술 침묵 회수·작품 경계 카드) + 배포(GitHub Pages). *남은 것: 브라우저 UX 실확인.*

## 라이선스 · License

| | License | Terms |
|---|---|---|
| **Engine / Code** 엔진(snz-novel 공유) | [PolyForm Noncommercial 1.0.0](LICENSE) | 비상업 목적은 누구나 자유(개인·비영리 작가 자기 작품에 사용·수정·배포). **상업 이용은 별도 계약** — hyeon3125@gmail.com |
| **Narrative content** 단편 4편 원고·본문 | [CC BY-NC-SA 4.0](LICENSE-CONTENT.md) | 비영리 향유·공유·2차 창작 자유, 상업 이용만 별도 계약 |

> 엔진은 [SCALAR: NODE ZERO](https://github.com/hyeon3125-dev/snz-novel) 와 동일한 5레이어 코어(PolyForm Noncommercial). 비영리 개인 작가가 자기 소설을 인터랙티브 노벨로 만드는 데 자유롭게 가져다 쓸 수 있고, 상업적 사용만 별도 협의입니다.
