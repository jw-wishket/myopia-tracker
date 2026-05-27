# BHVI 스타일 안축장 성장차트 — 설계 문서

- **작성일:** 2026-05-27
- **대상 기능:** 기존 `growthChart.js`를 BHVI Myopia Calculator 스타일 차트로 교체/업그레이드
- **상태:** 설계 확정, 구현 계획(writing-plans) 대기

---

## 1. 개요 & 목표

안과 근시관리 트래커의 성장그래프를, 첨부된 BHVI(Brien Holden Vision Institute) Myopia
Calculator 스타일 차트와 **기능적으로 동일**하게 구현한다. 환자의 안축장(AL)을 또래 백분위
곡선 위에 표시하고, 현재 백분위를 18세까지 추종해 예측하며, 예측 성인 안축장을 굴절(D)로
변환하고, 종합 위험도를 게이지로 보여준다.

### 스코프 결정 (확정)

| 항목 | 결정 |
|------|------|
| 통합 방식 | 기존 `growthChart.js`를 **교체/업그레이드** (의사·보호자·리포트 화면 모두 자동 반영) |
| 브랜딩 | **브랜드 중립** — BHVI 로고/문구 미사용 (라이선스 회피). 방법론만 재현 |
| 구현 요소 | ① 5%간격 백분위 곡선 / ②③ 환자 점·18세 예측 / ④ AL→굴절 우측 패널 / ⑤ 위험도 게이지 |
| AL→굴절 변환 | 모집단 **공개 문헌 고정 계수** (설정 상수로 분리) |
| 위험도 기준 | **복합** — 예측 성인 굴절 크기 + 안축장 진행속도 |

### 핵심 근거 (데이터 검증)

기존 `PERCENTILE_DATA`(성별·4~18세·P3~P95)로 이미지의 예측값을 검산한 결과,
**여아 18세 55백분위 = 25.22mm ≈ 이미지 25.21mm** (오차 0.01mm)로 거의 일치했다.
이로써 (a) 진행 예측 모델이 "현재 백분위를 18세까지 추종(percentile tracking)"이며,
(b) 기존 참조 데이터가 BHVI 계열과 동등함을 확인했다. 차트 방법론은 공개된 것으로
(Sankaridurg/BHVI 안축장 백분위), 재현에 IP 문제가 없다.

---

## 2. 아키텍처 (B안: 순수 모델 + 분리 렌더)

**원칙:** 임상 계산(순수 함수, 단위 테스트 가능) ↔ 렌더링(DOM/Chart.js) 완전 분리.

### 파일 구성

```
src/
├── myopiaModel.js          [신규] 순수 계산 (DOM 無, 외부 의존 無)
├── myopiaModel.test.js     [신규] Vitest 단위 테스트
├── components/
│   ├── growthChart.js      [개편] 19곡선 + 환자점 + 18세 예측점선 + 치료선
│   ├── refractionPanel.js  [신규] 우측 굴절(D)축 + 컬러바 + 예측 분포곡선
│   └── riskGauge.js        [신규] 낮음/중간/높음 게이지 (HTML/CSS)
├── constants.js            [추가] REFRACTION_MODEL, RISK_THRESHOLDS, PREDICTION_SD, PERCENTILE_GRID
└── utils.js                [정리] calcPct/interpolateValue/generateCurveData를 myopiaModel로
                                    이전 후 하위호환 re-export
```

### 데이터 흐름

```
patient {gender, records[], treatments[]}
        │
        ▼  (순수 계산)
  myopiaModel.js ──► { curves[19], odPoint, osPoint, odProjection, osProjection,
                       odPredSE{μ,σ}, osPredSE{μ,σ}, risk }
        ▼
  growthChart  +  refractionPanel  +  riskGauge   (화면에서 조합)
```

`myopiaModel`이 모든 수치의 단일 진실원 → 차트·패널·게이지·기존 측정표 배지가 동일 계산값 공유.

---

## 3. 임상 계산 모델 (`myopiaModel.js`)

기호: `a`=나이, `L`=안축장(mm), `R`=굴절(D), `p`=백분위, 성별 `g`.

### 3.1 `refValue(g, a, p)` — 곡선·예측의 단일 진실원
2단계 선형 보간 (기존 `interpolateValue`/`calcPct` 방식, 이미지로 검증):
1. **나이축 보간**: age `a`에서 표의 8개 백분위 값 {P3,P5,P10,P25,P50,P75,P90,P95} 산출
2. **백분위축 보간**: 인접 백분위 사이 선형 보간으로 임의 `p`의 `L` 산출
   - `p ≤ 3 → P3`, `p ≥ 95 → P95`로 clamp

### 3.2 19개 백분위 곡선 (요소 ①)
```
PERCENTILE_GRID = [5,10,15,…,90,95]                 # 19개
curve_p = [ {x:a, y:refValue(g,a,p)} | a = 4..18, +0.5 ]
```
P50 굵은 실선, 나머지 얇은 회색선. 메모이제이션 캐시.

### 3.3 `calcPercentile(g, a, L)` — 환자 백분위 (요소 ②)
`refValue`의 역함수. 기존 `calcPct` 흡수. `L≤P3 → '<3'`, `L≥P95 → '>95'`.

### 3.4 `projectToAge(record, 18)` — 백분위 추종 예측 (요소 ③)
```
p*       = calcPercentile(g, a*, L*)
예측곡선 = [ refValue(g, a, p*) | a = a*..18 ]      # 점선
L̂(18)    = refValue(g, 18, p*)                      # 예측 성인 안축장
```

### 3.5 AL→굴절 변환 & 예측 분포 (요소 ④)
```
R = α + β·L                  # β<0, α = −β·emmetropiaAL
기본값: β=-2.3 D/mm, emmetropiaAL=23.5mm → α=54.05   (문헌범위 -1.3~-2.7, 교체 가능)

예측 안축장 분포:  AL ~ N(L̂, σ_AL²),  σ_AL = PREDICTION_SD (기본 0.4mm)
선형변환 → 굴절:   R ~ N(α+β·L̂, (|β|·σ_AL)²)
우측 패널 = 종형곡선 + 95% 밴드(평균 ± 1.96·σ_R)
```
> σ_AL=0.4mm는 이미지 우안 밴드폭(−3.5~0.5D ≈ 4D) 역산값: 4 ÷ |β| ÷ 3.92 ≈ 0.43mm.

### 3.6 `assessRisk(predictedSE, progressionRate)` — 복합 위험도 (요소 ⑤)
```
refLevel  ∈ {0,1,2}  ← 예측 성인 굴절(나쁜 눈)
   >−3D → 0 ,  −3~−6D → 1 ,  ≤−6D → 2
progLevel ∈ {0,1,2}  ← 안축장 진행속도(mm/년)   (기존 progressLabel 기준 재사용)
   ≤0.1 → 0(안정) ,  0.1~0.3 → 1(보통) ,  >0.3 → 2(빠름)

combined = max(refLevel, progLevel)
if refLevel≥1 AND progLevel≥1:  combined = min(2, combined+1)   # 둘 다 우려 → 1단계 상향
risk = ['낮음','중간','높음'][combined]

진행속도: recent 측정으로 산출(≥2개 필요). 부족 시 refLevel만 사용.
```
> **위험도 기준 선택 근거:** 이미지 환자는 경도근시(예측 ~−1.5D)인데도 "위험도 높음"이다.
> 굴절 크기 단독으로는 재현 불가 → BHVI는 진행속도/백분위 상승을 반영하는 것으로 판단.
> 복합 모델로 검증: 경도근시 + 빠른진행 → refLevel 0, progLevel 2 → combined 2 = **높음** ✓ 재현.

---

## 4. 렌더링 컴포넌트

### 4.1 `growthChart.js` (개편) — 메인 Chart.js scatter
- 19개 회색 백분위 곡선(P50 굵은 실선) + 우/좌안 점·연결선
- 18세 예측 점선(눈 색상) + 예측점 라벨("25.21mm")
- 치료 수직 annotation 선 (기존 유지), 워터마크 "근시관리 트래커"(브랜드 중립) 유지
- 축: x 4→18 (우측 끝 "성인" 라벨), y 20→28mm

### 4.2 `refractionPanel.js` (신규) — 우측 굴절 패널
- 세로 D축(−6D↑ ~ +8D↓) + CSS 그라데이션 컬러바(빨강=근시/위험 → 초록)
- 메인 차트와 세로 정렬된 좁은 캔버스에 예측 SE 종형곡선(OD/OS) 그림
- Chart.js 대신 경량 커스텀 캔버스 (단순 형태, Chart.js 충돌 회피)

### 4.3 `riskGauge.js` (신규) — 하단 위험도 게이지
- 순수 HTML/CSS 그라데이션 바(초록→노랑→빨강) + 현재 위험 위치 마커
- 측정 2회 이상이면 직전 방문 마커도 표시(변화 시각화)
- "데이터 기반 위험도: **[높음]**" 라벨

### 4.4 반응형 레이아웃
- 데스크톱: 메인 차트 + 우측 패널 가로 배치, 게이지 하단 full-width
- 모바일: 패널 하단 스택, 게이지 하단
- 기존 디자인 시스템(카드·slate 보더·OD 시안 #0891b2 / OS 로즈 #e11d48) 준수

---

## 5. 상수 (`constants.js` 추가)

```js
PERCENTILE_GRID  = [5,10,15,…,95];
REFRACTION_MODEL = { alpha: 54.05, beta: -2.3, emmetropiaAL: 23.5 };  // R = α + β·AL
PREDICTION_SD    = 0.4;   // mm (이미지 밴드폭 역산)
RISK_THRESHOLDS  = {
  refraction:  { low: -3.0, high: -6.0 },     // D
  progression: { stable: 0.1, rapid: 0.3 },   // mm/년
};
```
모든 계수에 출처·가정 주석을 달아 추후 임상 보정이 용이하도록 중앙화.

---

## 6. 에러처리 / 엣지케이스

- **성별 결측** → 곡선 계산 불가, "성별 정보 필요" 안내 (model이 null 반환)
- **나이 <4 또는 >18** → 점 제외/clamp (기존 패턴)
- **측정 <2개** → 진행속도 없음 → 위험도는 refLevel만, 예측은 단일점에서도 동작
- **SE 측정 결측** → 무관 (예측 SE는 AL→변환식으로 계산, 측정 SE 불필요)
- 라벨의 DB 데이터(치료명)에 `escapeHtml`, 색상에 `safeColor` 유지
- 신규 패널 캔버스도 기존 `chartInstances` 정리 패턴으로 메모리 누수 방지

---

## 7. 테스트 전략 (Vitest 신규 도입)

- `npm i -D vitest` + `package.json` `"test": "vitest"` (Vite 네이티브 통합)
- **`myopiaModel.test.js`** — 임상 수식 단위 테스트:
  - `refValue` 알려진 점 정확성 + **이미지 재현 회귀테스트**(여아 18세 55th ≈ 25.22)
  - `calcPercentile` 역함수 왕복, `projectToAge` 종단값 = `refValue(18,p*)`
  - `alToRefraction(23.5)=0` 및 단조 감소
  - `predictAdultRefraction` 분포(μ,σ) 선형전파 정확성
  - `assessRisk` 진리표: 경도+빠른진행→높음(이미지 케이스), 안정+경도→낮음 등
  - 엣지: 측정<2, 나이범위 밖, 성별 결측
- 렌더 컴포넌트(DOM/캔버스)는 단위테스트 제외 → 모델 테스트 + `npm run dev` 육안 확인

---

## 8. 임상 면책 / 미해결 사항 (구현과 별개로 추적)

1. **참조 데이터 출처**: 기존 `PERCENTILE_DATA`의 원논문/모집단이 코드에 미문서화.
   이미지와 일치함은 확인됐으나, 임상 사용 전 출처를 명시·검증할 것.
2. **AL→굴절 계수(β)와 σ_AL**: 문헌 기반 기본값. 클리닉 자체 AL–SE 데이터로 재보정 가능
   (프로젝트가 SE를 저장하므로 향후 데이터 기반 보정 여지 있음).
3. **위험도 임계값/가중**: BHVI 정확값 비공개. 임상적으로 타당한 기본값을 채택, 설정으로 조정.
4. 본 차트는 의사 판단 보조 도구이며 진단을 대체하지 않음.

---

## 9. 다음 단계

설계 확정 → 본 문서 커밋 → 사용자 검토 → `writing-plans` 스킬로 구현 계획 작성.
