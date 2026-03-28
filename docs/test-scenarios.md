# Test Scenarios - Myopia Management Tracker

**Date:** 2026-03-28
**Version:** Post-Supabase migration
**Tester:** _______________

---

## Test Scenarios

### Scenario 1: Doctor - New Patient + Measurement Input

**Objective:** Verify new patient registration and first measurement input with auto-calculations.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as doctor (doctor account with valid credentials) | Doctor dashboard loads with sidebar patient list, navbar shows clinic name | [ ] |
| 2 | Click "새 환자" button in sidebar (or "+" on mobile) | "새 환자 등록" modal opens with fields: 이름, 생년월일, 성별 (남/여 radio), 관리번호 (optional) | [ ] |
| 3 | Enter name "정수아", birthdate "2018-01-10", select 여, set 관리번호 "INT-001" | All fields populated correctly | [ ] |
| 4 | Click "등록" button | Sync status toast shows "등록 중..." then "등록 완료". Modal closes. Patient appears in sidebar list and is auto-selected. | [ ] |
| 5 | Verify the patient info bar shows correct data | Name "정수아", birthdate "2018-01-10", gender "여" displayed. Internal reg_no (P-{timestamp} format) auto-generated in database. customRef shows "INT-001". | [ ] |
| 6 | Click "새 측정" button | "측정 입력" modal opens. Patient name and calculated age (~8.2세) shown in blue header. No previous measurement info shown (first measurement). | [ ] |
| 7 | Enter: date=2026-03-29, OD AL=22.10, OS AL=22.05, OD SE=-0.25, OS SE=-0.25 | All values entered in respective fields | [ ] |
| 8 | Click "측정 저장" | Button text changes to "저장 중...", sync toast shows "저장 중..." then "저장 완료". Modal closes. | [ ] |
| 9 | Verify percentile auto-calculation | Stats card shows OD and OS percentile values (odPct, osPct) calculated from gender=female, age~8.2, and entered AL values | [ ] |
| 10 | Verify sync status toast appeared | Green toast with checkmark icon visible at bottom-right, auto-dismisses after 2.5 seconds | [ ] |
| 11 | Verify "데이터 부족" label in progress report | "진행 속도 분석" section shows "진행 속도를 분석하려면 2개 이상의 측정 기록이 필요합니다." Rate table shows "2회 이상 측정 기록이 필요합니다" | [ ] |
| 12 | Verify next visit date auto-set | Next visit date set to 2026-09-29 (6 months from measurement date by default) | [ ] |

---

### Scenario 2: Doctor - Measurement Validation

**Objective:** Verify range warnings and duplicate date detection when entering measurements.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select existing patient 김민준 from sidebar | Patient data loads with existing measurement records | [ ] |
| 2 | Click "새 측정" button | Modal opens. Previous measurement shown in grey box: "최근 측정 ({date}): OD {value}mm / OS {value}mm" | [ ] |
| 3 | Enter measurement date, OD AL=2.35 (invalid low value), OS AL=22.05, and click "측정 저장" | Confirm dialog appears with warning: "OD AL (2.35mm)이 정상 범위(18~32mm)를 벗어났습니다". Dialog asks "계속 저장하시겠습니까?" | [ ] |
| 4 | Click "취소" on the range warning dialog | Measurement is NOT saved. Modal stays open with values intact. | [ ] |
| 5 | Correct OD AL to 23.50, keep OS AL=22.05 | Values updated in form | [ ] |
| 6 | Change date to an existing measurement date (e.g., 2025-02-10 if it exists in records) | Date field set to existing date | [ ] |
| 7 | Click "측정 저장" | Confirm dialog appears: "같은 날짜의 측정 기록이 이미 존재합니다. 추가하시겠습니까?" | [ ] |
| 8 | Click "취소" on duplicate date warning | Measurement is NOT saved. Modal stays open. | [ ] |
| 9 | Verify the previous measurement info is shown in the modal | Grey info box displays last measurement date and OD/OS AL values formatted to 2 decimal places | [ ] |

---

### Scenario 3: Doctor - Duplicate Patient Prevention

**Objective:** Verify that registering a patient with the same name and birthdate at the same clinic is prevented.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "새 환자" button in sidebar | "새 환자 등록" modal opens | [ ] |
| 2 | Enter name "김민준", birthdate "2016-03-15", select 남 | Fields filled in | [ ] |
| 3 | Click "등록" button | Sync toast shows "등록 중..." then "등록 실패" (red/error style). Alert dialog shows: "같은 이름과 생년월일의 환자가 이미 등록되어 있습니다." | [ ] |
| 4 | Dismiss the alert | Modal remains open with entered data intact. Patient list unchanged. | [ ] |

---

### Scenario 4: Doctor - Treatment Management

**Objective:** Verify adding a treatment, verifying date range display, and stopping a treatment.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select patient 김민준 from sidebar | Patient loads with existing data | [ ] |
| 2 | In "치료 이력" card, click "+ 추가" button | Treatment add form appears below with: type dropdown (아트로핀 0.01%~0.1%, 드림렌즈, 마이사이트, PPSL), date input, "추가" button | [ ] |
| 3 | Select "드림렌즈" from dropdown, set date to "2026-01-15" | Values selected | [ ] |
| 4 | Click "추가" button | Button text changes to "추가 중...", sync toast shows "저장 중..." then "저장 완료". New treatment tag appears. | [ ] |
| 5 | Verify treatment tag display | Tag shows "드림렌즈" with colored dot, date "2026.01.15 ~ 진행중", and a stop button (square icon) and remove button (x) | [ ] |
| 6 | Click the stop button (square icon) on the 드림렌즈 treatment tag | Confirm dialog: "이 치료를 종료 처리하시겠습니까?" | [ ] |
| 7 | Click "확인" on the confirm dialog | Treatment tag updates to show "2026.01.15 ~ 2026.03.28" (today's date as end date). Stop button disappears from this tag. | [ ] |
| 8 | Verify treatment tag in read-only view (치료 현황 section in customer screen) | Tag shows same date range without stop/remove buttons | [ ] |

---

### Scenario 5: Doctor - Follow-up & Progression Alerts

**Objective:** Verify overdue patient alerts and rapid progression warnings.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Login as doctor | Doctor dashboard loads | [ ] |
| 2 | Check if overdue patients alert bar appears at top of main content | If any patients have next_visit_date before today (2026-03-28), amber alert bar shows: "추적 검사 필요 환자 ({count}명)" with clickable patient name buttons | [ ] |
| 3 | Click on an overdue patient button in the alert bar | That patient is selected and their data loads in the main content area | [ ] |
| 4 | Check if rapid progression alert shows for a patient with fast AL growth (e.g., 박지호 if applicable) | Red alert box appears below patient info: "빠른 근시 진행 감지" with text "현재 진행 속도: {rate}. 치료 변경을 검토해주세요." | [ ] |
| 5 | Verify sidebar shows rapid progression count | Red badge in sidebar shows "빠른 진행 {N}명" if any patients have rapid progression (progressLabel returns red class) | [ ] |
| 6 | Select a patient with fewer than 2 measurements | No rapid progression alert shown (requires >= 2 records) | [ ] |

---

### Scenario 6: Doctor - Export & Reports

**Objective:** Verify CSV export (individual and full clinic), print report, and chart image download.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "전체 내보내기" at bottom of sidebar | Button text changes to "내보내는 중...", CSV file downloads named "{clinicName}_전체데이터.csv". File contains UTF-8 BOM header and columns: 환자명,생년월일,성별,관리번호,측정일,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct,치료. Button text returns to "전체 내보내기". | [ ] |
| 2 | Select a patient with measurement records | Patient data loads | [ ] |
| 3 | Click "리포트" button | New browser window/tab opens with formatted print report. Report includes: header with "근시관리 트래커 - 환자 리포트", patient info (name, birthdate, gender, age, customRef), current status with OD/OS AL/SE/percentile, treatment history tags, measurement records table, footer. Print dialog auto-triggers after 500ms. | [ ] |
| 4 | Click "이미지 저장" button above growth chart | PNG file downloads named "{patientName}_성장차트.png" containing the growth chart canvas image | [ ] |
| 5 | Click "CSV" button | CSV file downloads named "{patientName}_measurements.csv" with UTF-8 BOM, header row "날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct", and one data row per measurement | [ ] |
| 6 | Click "가져오기" button | "데이터 가져오기" modal opens with CSV format instructions, file input, and preview area | [ ] |
| 7 | Select a valid CSV file with measurement data | Preview table appears showing parsed rows with date, OD AL, OS AL, OD SE, OS SE. Row count displayed. "가져오기" button becomes enabled. | [ ] |
| 8 | Click "가져오기" to confirm import | Button text changes to "가져오는 중...", result shows "{N}건 가져오기 완료". Modal auto-closes after 1.5s and patient data refreshes. | [ ] |

---

### Scenario 7: Doctor - Patient Notes

**Objective:** Verify adding, displaying, and deleting patient memos.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select a patient and scroll to "메모" section | Notes section visible with textarea input, "메모 추가" button. If no notes exist, shows "메모가 없습니다" | [ ] |
| 2 | Type "6개월 후 재검사 예정" in the textarea | Text entered in the note input field | [ ] |
| 3 | Click "메모 추가" button | Button text changes to "추가 중...", page refreshes. New memo appears with content "6개월 후 재검사 예정" and timestamp (e.g., "2026.03.28 14:30") | [ ] |
| 4 | Add another memo "드림렌즈 적응 확인 필요" | Second memo appears at top of list (newest first, ordered by created_at DESC). Both memos visible with timestamps. | [ ] |
| 5 | Click the X (delete) button on the first memo ("6개월 후 재검사 예정") | Confirm dialog: "이 메모를 삭제하시겠습니까?" | [ ] |
| 6 | Click "확인" on the confirm dialog | Memo is removed. Only "드림렌즈 적응 확인 필요" remains in the list. | [ ] |

---

### Scenario 8: Doctor - Measurement Filter

**Objective:** Verify measurement table date filtering.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Select a patient with multiple measurement records spanning more than 6 months | Full measurement table displayed with all records. "전체" filter button is active (blue/filled). | [ ] |
| 2 | Click "최근 6개월" filter button | Filter button becomes active (bg-primary-600 text-white). Table shows only records with dates within the last 6 months from today. Older records hidden. | [ ] |
| 3 | Click "최근 1년" filter button | Filter switches to 1-year window. Records within last 12 months shown. | [ ] |
| 4 | Click "전체" to restore | All measurement records shown again. "전체" button becomes active. Other filter buttons show inactive style (border, text-slate-500). | [ ] |
| 5 | Verify filter does not affect charts or other sections | Growth chart, progress report, rate table, and treatment comparison still use all records regardless of filter | [ ] |

---

### Scenario 9: Parent - Login & Data Verification

**Objective:** Verify parent login, children display, data visibility, NEW badge, and report printing.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Logout from doctor account (via settings modal or bottom nav settings) | Redirected to #login screen | [ ] |
| 2 | Click "로그인" tab, enter parent email and password, click "로그인" | Login succeeds. Redirected to #customer screen. Navbar shows "보호자" subtitle. | [ ] |
| 3 | Verify children list display | Horizontal scrollable list of children buttons. Each child shows: first character avatar, name, birthdate/gender, last measurement date (e.g., "최근 측정: 2026.03.29"). First child auto-selected (blue border). | [ ] |
| 4 | Select 김민준 from children list | Child button gets blue highlight (border-primary-500 bg-primary-50). Patient data loads below: 현재 상태 (stats card), 치료 현황 (treatment tags read-only), 성장 추이 (growth chart), 진행 속도 분석, 구간별 진행 속도, 측정 기록 table. | [ ] |
| 5 | Verify all doctor-entered data is visible | Stats card shows latest OD/OS AL, SE, percentile values. Measurement table shows all records. Treatment tags show all treatments with date ranges. Note at bottom: "측정 데이터는 담당 안과에서 입력합니다" | [ ] |
| 6 | Check if NEW badge appears for recent measurements | If last measurement was within 7 days, a "NEW" badge (blue, rounded pill) appears next to patient info bar | [ ] |
| 7 | Click "리포트 출력" button | New window opens with formatted print report (same format as doctor report). Auto-triggers print dialog. | [ ] |
| 8 | Click "이미지 저장" button on growth chart | PNG file downloads named "{patientName}_성장차트.png" | [ ] |
| 9 | Verify bottom navigation tabs | Three tabs: 환자 (scrolls to top), 차트 (scrolls to growth chart), 설정 (opens settings modal with password change and logout options) | [ ] |

---

### Scenario 10: Parent - Children Management

**Objective:** Verify adding and managing children in the parent account.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Click "자녀 관리" button at top-right of children list | "자녀 관리" modal opens. Shows list of existing children with edit/delete buttons. Below: "자녀 추가" form with name, birthdate, clinic dropdown inputs. | [ ] |
| 2 | In "자녀 추가" section, enter name "정수아", birthdate "2018-01-10" | Fields populated | [ ] |
| 3 | Select clinic from "안과 선택" dropdown | Clinic selected from available clinics list | [ ] |
| 4 | Click "추가" button | Success message "추가 완료" appears in green. Input fields cleared. New child "정수아" appears in the children list above with clinic name. | [ ] |
| 5 | Click "닫기" button | Modal closes. Customer screen re-renders. 정수아 appears in horizontal children list. | [ ] |
| 6 | Select 정수아 from children list | Child selected (blue border). If doctor has registered 정수아 at the same clinic with matching name and birthdate, measurement data from doctor is visible. Otherwise, shows empty state. | [ ] |
| 7 | Verify edit and delete in children management modal | Click "자녀 관리" again. Click "수정" on a child: prompt dialogs for name and birthdate. Click "삭제": child removed from list and profile updated. | [ ] |

---

### Scenario 11: Admin - System Management

**Objective:** Verify admin dashboard stats, clinic management, doctor management, and patient list.

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Logout from parent account | Redirected to #login screen | [ ] |
| 2 | Login as admin (admin account credentials) | Admin dashboard loads. Navbar shows "관리자" subtitle. | [ ] |
| 3 | Verify stats cards at top | Four stat cards displayed: 전체 환자 ({N}명), 등록 의사 ({N}명), 안과 ({N}곳), 승인 대기 ({N}건). Patient count should reflect newly added patients. | [ ] |
| 4 | Verify "승인 관리" tab (default active) | Shows pending approval requests (or "대기 중인 승인 요청이 없습니다" if none). Each request shows: name initial avatar, name, email, clinic name, date, 승인/거부 buttons. | [ ] |
| 5 | Click "안과 관리" tab | Table shows clinics with columns: 안과명, 등록 의사 수, 환자 수, 관리 (edit/delete icons). "새 안과 등록" button at top-right. | [ ] |
| 6 | Verify clinic with doctor/patient counts | Each clinic row shows correct count of associated doctors and patients | [ ] |
| 7 | Click "새 안과 등록" | Modal opens with 안과명 input field and 취소/등록 buttons | [ ] |
| 8 | Click edit icon on existing clinic | Modal opens with current clinic name pre-filled, 취소/저장 buttons | [ ] |
| 9 | Click "의사 목록" tab | Table shows doctors with columns: 이름, 이메일, 소속 안과, 상태 (승인됨/미승인 badge), 관리 (승인 취소/비활성화 buttons). | [ ] |
| 10 | Verify doctor with approve/deactivate buttons | Approved doctors show "승인 취소" (red) + "비활성화" buttons. Unapproved doctors show only "비활성화" button. | [ ] |
| 11 | Click "환자 목록" tab | Table shows all patients across all clinics. Columns: 이름, 생년월일, 성별, 관리번호, 소속 안과. Search input above table. | [ ] |
| 12 | Verify new patients appear with 관리번호 | 정수아 appears in list with 관리번호 "INT-001" (customRef) and correct clinic assignment | [ ] |
| 13 | Type patient name in search input | Table rows filter in real-time: only patients whose name includes the search query are shown | [ ] |

---

### Scenario 12: Patient Search with Clinic

**Objective:** Verify the public patient search feature on the login screen (no authentication required).

| # | Step | Expected Result | Pass/Fail |
|---|------|-----------------|-----------|
| 1 | Logout from admin account (or navigate to #login) | Login screen loads with three tabs: 환자조회 (default active), 로그인, 회원가입 | [ ] |
| 2 | On "환자조회" tab, select clinic from "안과 선택" dropdown | Available clinics listed in dropdown. One selected. | [ ] |
| 3 | Enter name "김민준" in "환자 이름" field | Name entered | [ ] |
| 4 | Enter birthdate "2016-03-15" in "생년월일" field | Date entered | [ ] |
| 5 | Click "조회하기" button | Search executes against the selected clinic with name + birthdate. Patient data loads. | [ ] |
| 6 | Verify patient data displayed | Navigates to #patient-result. Patient information shown: name, birthdate, gender, measurement records, treatment history, growth chart. Data matches what was entered by doctor. | [ ] |
| 7 | Try search with 관리번호 instead of birthdate | Enter clinic, name "김민준", leave birthdate empty, enter 관리번호. Click 조회하기. Same patient found via custom_ref lookup. | [ ] |
| 8 | Try search with non-existent patient | Enter clinic, name "존재하지않는환자", any birthdate. Click 조회하기. Error message displayed: patient not found. | [ ] |
| 9 | Try search without selecting a clinic | Error or validation message shown (clinic is required for search) | [ ] |

---

## Summary Checklist

| Scenario | Description | Status |
|----------|-------------|--------|
| 1 | Doctor - New Patient + Measurement Input | [ ] |
| 2 | Doctor - Measurement Validation | [ ] |
| 3 | Doctor - Duplicate Patient Prevention | [ ] |
| 4 | Doctor - Treatment Management | [ ] |
| 5 | Doctor - Follow-up & Progression Alerts | [ ] |
| 6 | Doctor - Export & Reports | [ ] |
| 7 | Doctor - Patient Notes | [ ] |
| 8 | Doctor - Measurement Filter | [ ] |
| 9 | Parent - Login & Data Verification | [ ] |
| 10 | Parent - Children Management | [ ] |
| 11 | Admin - System Management | [ ] |
| 12 | Patient Search with Clinic | [ ] |

---

## Environment Notes

- **Backend:** Supabase (PostgreSQL + Auth)
- **Frontend:** Vanilla JS SPA with hash-based routing
- **Components tested:** doctorScreen, customerScreen, adminScreen, loginScreen, dataService, treatmentTags, printReport, syncStatus, rateTable, progressReport, treatmentComparison, patientNotes, sidebar, modal
- **Browser:** Chrome/Edge (recommended)
- **Test data prerequisites:** At least one clinic, one doctor account, one parent account, one admin account, and patients with varying measurement histories (0, 1, 2+ records)
