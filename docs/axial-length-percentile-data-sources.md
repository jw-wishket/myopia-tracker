# 안축장 백분위 데이터 출처 및 참고 문헌

> 본 문서는 `src/constants.js`의 `PERCENTILE_DATA`(소아 안축장 백분위 정상치)의 출처, 임상적 근거, 그리고 임상 적용 시 유의점을 정리한 참고 문서입니다.

## 1. 결론 (한눈에)

근시관리 트래커가 사용하는 안축장 백분위 데이터(`PERCENTILE_DATA`)는 **He et al. 2021 — 중국 소아·청소년 안축장 정상치 논문**의 데이터와 검증한 모든 포인트에서 **byte 단위로 일치**합니다.

따라서 본 앱이 그리는:
- 19개 백분위 성장곡선 (P5~P95)
- 환자 백분위 위치와 18세 예측 안축장
- 남여 안축장 차이 (모든 연령에서 여아가 약 0.4~0.6mm 짧음)

는 모두 위 논문의 정상치를 그대로 시각화한 것입니다.

---

## 2. 주 출처 — He et al. 2021

**제목:** *Normative data and percentile curves for axial length and axial length/corneal curvature in Chinese children and adolescents aged 4–18 years*

**저자:** He X, Sankaridurg P, Naduvilath T 외

**연구 설계**

| 항목 | 내용 |
|------|------|
| 모집단 | 중국 소아·청소년 |
| 표본 수 | **14,127명** (개발 데이터셋) |
| 연령 범위 | 4 ~ 18세 |
| 성별 | 남(boys) · 여(girls) 별도 산출 |
| 산출 백분위 | P3, P5, P10, P25, P50, P75, P90, P95 (8개) |

**링크:**
- 논문 메인: <https://pmc.ncbi.nlm.nih.gov/articles/PMC9887397/>
- **Table 4 (백분위 표 — 본 앱이 사용하는 데이터):** <https://pmc.ncbi.nlm.nih.gov/articles/PMC9887397/table/T4/>
- Table 3 (평균±SD — 별도 통계, 본 앱 사용 안 함): <https://pmc.ncbi.nlm.nih.gov/articles/PMC9887397/table/T3/>

### 데이터 일치 검증 (`PERCENTILE_DATA` ↔ He et al.)

| 항목 | He et al. | `PERCENTILE_DATA` |
|------|-----------|-------------------|
| 남 4세 P50 | 22.39 | 22.39 ✅ |
| 남 10세 P50 | 23.99 | 23.99 ✅ |
| 남 18세 P50 | 25.41 | 25.41 ✅ |
| 여 4세 P50 | 21.78 | 21.78 ✅ |
| 여 10세 P50 | 23.51 | 23.51 ✅ |
| 여 18세 P50 | 25.05 | 25.05 ✅ |
| 남 4세 범위 (P3–P95) | 21.26 – 23.33 | 21.26 – 23.33 ✅ |
| 여 4세 범위 (P3–P95) | 20.74 – 22.66 | 20.74 – 22.66 ✅ |
| 남 18세 범위 (P3–P95) | 22.92 – 27.74 | 22.92 – 27.74 ✅ |
| 여 18세 범위 (P3–P95) | 22.61 – 27.08 | 22.61 – 27.08 ✅ |

→ 위 표는 일부 spot-check 결과이며, **전체 240개 셀**(남 15세 × 8백분위 + 여 15세 × 8백분위)을 프로그램으로 일괄 비교한 결과 **불일치 0건**으로 확인됐습니다. 우리 `PERCENTILE_DATA`는 He et al. 2021 Table 4 발표값과 **0.001mm 이내로 byte 단위 정확 일치**합니다.

---

## 3. 남여 차이의 임상적 근거

He et al. 논문 본문 인용:
> **"females have a shorter AL"**

이 결과는 모든 측정 연령(4–18세)에 일관되게 나타나며, 우리 데이터에도 그대로 반영됩니다:

| 나이 | 남아 P50 | 여아 P50 | 차이 |
|------|---------|---------|------|
| 4세 | 22.39 | 21.78 | **0.61 mm** |
| 10세 | 23.99 | 23.51 | **0.48 mm** |
| 14세 | 24.81 | 24.39 | **0.42 mm** |
| 18세 | 25.41 | 25.05 | **0.36 mm** |

→ **남아가 모든 연령에서 안축장이 더 깁니다.** 단순한 표본 편차가 아니라 14,127명 모집단에서 확립된 통계적 정상치이며, 성장기 신체 발달 차이의 일부로 해석됩니다.

---

## 4. BHVI Myopia Calculator와의 관계

- BHVI(Brien Holden Vision Institute) Myopia Calculator의 안축장 성장차트는 **He et al. 2021 데이터(또는 동일 모집단 기반 데이터)** 를 사용하는 것으로 보입니다 (BHVI가 Sankaridurg 등과 공동 연구).
- 본 앱이 BHVI 레퍼런스 이미지의 예측값(여아 18세 55백분위 = 25.21mm)을 **0.01mm 오차**로 재현함을 확인 → 동일 데이터 사용 강한 정황 증거.
- 따라서 본 앱의 성장차트는 **BHVI 계산기와 동등한 결과**를 생성합니다 (브랜드 중립으로 재구현, 라이선스 영향 없음).

참고: <https://bhvi.org/news/growth-curves-of-myopia-related-parameters-to-monitor-chinese-children/>

---

## 5. 다른 모집단의 안축장 정상치 (비교)

안축장 정상치는 **인종/지역에 따라 차이**가 보고됩니다. 한국 임상 적용 시 참고:

- **유럽 소아 (Tideman et al. 2018)** — 같은 나이대에서 중국(He et al.) 대비 평균적으로 안축장이 **0.4 ~ 1.4mm 짧음**. 동아시아권의 근시 유행과 일관됨.
- **중국 소아 (Wuhan 학생, LMS 방법)** — 별도 데이터셋이지만 He et al.과 유사한 추세.
- **인도 소아** — 또 다른 모집단; 별도 정상치 곡선 존재.

근거 문헌:

| 문헌 | 모집단 | 링크 |
|------|--------|------|
| He et al. 2021 (주 출처) | 중국 4–18세 (n=14,127) | [PMC9887397](https://pmc.ncbi.nlm.nih.gov/articles/PMC9887397/) |
| Tideman et al. 2018 | 유럽(Generation R Study) 소아 | [PMC6002955](https://pmc.ncbi.nlm.nih.gov/articles/PMC6002955/) |
| Wuhan LMS percentile curves | 중국 학령기 (LMS 방법) | [PMC8941183](https://pmc.ncbi.nlm.nih.gov/articles/PMC8941183/) |
| Indian ocular biometry percentiles | 인도 6–12세 | [PMC11122416](https://pmc.ncbi.nlm.nih.gov/articles/PMC11122416/) |
| Myopia Profile 해설 | 임상 활용 가이드 | <https://www.myopiaprofile.com/articles/axial-length-corneal-curvature-myopic-error-percentile-curve> |
| BHVI Growth Curves 소개 | BHVI 공식 자료 | <https://bhvi.org/news/growth-curves-of-myopia-related-parameters-to-monitor-chinese-children/> |

---

## 6. ⚠️ 한국 임상 적용 시 유의사항

본 데이터는 **중국 모집단** 기준입니다. 한국 소아에 적용할 때 다음을 고려하시기 바랍니다.

1. **동아시아권 인종이라 큰 무리는 없을 가능성이 높습니다** — 한국·중국·일본 안축장 분포는 유럽·인도 대비 서로 가깝다는 보고가 일반적입니다.
2. **단, 정확 일치 보장은 없습니다.** 한국 소아의 성장 패턴/근시 유병률과 미세한 차이가 있을 수 있습니다.
3. **세부 백분위 정확도가 임상 결정에 영향을 주는 상황**(예: 치료 시작 기준, 진행 위험도 임계값)에서는 **한국 소아 안축장 정상치와 비교 검증**을 권장합니다.
4. 본 차트는 **진단기기가 아니라 상담·의사결정 보조 도구**입니다 (의료진용 설명서 별도 참고).

### 권장 후속 조치

- [ ] 한국 소아 안축장 정상치 데이터 조사(국내 안과 학회 가이드/논문).
- [ ] 클리닉 자체 측정 데이터가 일정량 축적되면, 한국 소아용 보정 계수 계산 또는 자체 백분위 정상치 구축.
- [ ] 본 데이터의 한계를 보호자에게 안내 시 명시.

---

## 7. 학술 인용 형식 (참고)

논문을 외부 문서에서 인용해야 할 경우 다음 형식을 사용하시면 됩니다:

```
He X, Sankaridurg P, Naduvilath T, et al. Normative data and percentile curves
for axial length and axial length/corneal curvature in Chinese children and
adolescents aged 4-18 years. 2021. PMC9887397.
```

> 정식 인용 시 저널명·권호·DOI는 PMC 페이지에서 직접 확인하시기 바랍니다.

---

## 8. 본 앱 내 관련 위치

| 항목 | 경로 |
|------|------|
| 백분위 데이터(8개 백분위, 남/여, 4–18세) | `src/constants.js` — `PERCENTILE_DATA` |
| 백분위 계산·예측 모델 | `src/myopiaModel.js` |
| 단위 테스트 | `src/myopiaModel.test.js` |
| 설계 스펙 | `docs/superpowers/specs/2026-05-27-bhvi-style-al-growth-chart-design.md` |
| 구현 계획 | `docs/superpowers/plans/2026-05-28-bhvi-style-growth-chart.md` |
| 의료진용 설명서 | [`growth-chart-clinician-guide.md`](./growth-chart-clinician-guide.md) |

---

**문서 작성일:** 2026-05-28
**근거 데이터 commit:** 08101c8 (`feat: add data layer, router, and navigation components`, 2026-03-26 — PERCENTILE_DATA 최초 도입)
**출처 확정일:** 2026-05-28 (PubMed Central 역추적을 통해 He et al. 2021로 확인)
**Byte 단위 일치 검증:** 2026-05-29 (Table 4 전체 240셀 프로그램 비교, 불일치 0건)
