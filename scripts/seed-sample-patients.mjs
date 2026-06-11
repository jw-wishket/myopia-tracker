// 샘플 환자 시딩 스크립트 — 데모 계정으로 로그인해 RLS 권한 내에서 삽입한다.
// 실행: node scripts/seed-sample-patients.mjs
// 멱등: custom_ref(DEMO-003~012)가 이미 있으면 해당 환자는 건너뛴다.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createClient } from '@supabase/supabase-js';
import { calcAge, calcPct } from '../src/utils.js';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const env = Object.fromEntries(
  readFileSync(join(root, '.env'), 'utf8').split('\n')
    .map(l => l.trim()).filter(l => l && !l.startsWith('#'))
    .map(l => [l.slice(0, l.indexOf('=')), l.slice(l.indexOf('=') + 1)])
);

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

// SE(굴절력)를 AL 변화에서 유도: ~ -2.2D/mm, 0.25D 단위 반올림
function seFrom(alStart, al, seStart) {
  return Math.round((seStart - (al - alStart) * 2.2) * 4) / 4;
}

// 시작 AL과 방문별 증가량(mm)으로 측정 시리즈 생성
function genVisits(firstDate, intervalMonths, odStart, osStart, odSeStart, osSeStart, deltas) {
  const visits = [];
  let od = odStart, os = osStart;
  const d = new Date(firstDate);
  for (let i = 0; i < deltas.length; i++) {
    if (i > 0) {
      od = Math.round((od + deltas[i]) * 100) / 100;
      os = Math.round((os + deltas[i] + (i % 2 === 0 ? 0.01 : -0.01)) * 100) / 100;
      d.setMonth(d.getMonth() + intervalMonths);
    }
    const date = d.toISOString().slice(0, 10);
    visits.push({
      date,
      odAL: od, osAL: os,
      odSE: seFrom(odStart, od, odSeStart),
      osSE: seFrom(osStart, os, osSeStart),
    });
  }
  return visits;
}

const PATIENTS = [
  {
    name: '박지호', birth: '2016-04-12', gender: 'male', ref: 'DEMO-003',
    nextVisit: '2026-11-01', followUp: 6,
    visits: genVisits('2023-05-10', 6, 23.20, 23.25, -0.75, -0.75, [0, 0.28, 0.30, 0.27, 0.25, 0.12, 0.10]),
    treatments: [{ type: '드림렌즈', date: '2025-03-15' }],
    notes: [
      '드림렌즈 착용 시작 후 아침 나안시력 양호하게 유지됨. 야간 착용 순응도 좋음.',
      '보호자에게 야외활동 하루 2시간 권장 안내함.',
    ],
  },
  {
    name: '최수아', birth: '2017-08-25', gender: 'female', ref: 'DEMO-004',
    nextVisit: '2026-08-20', followUp: 6,
    visits: genVisits('2024-02-20', 6, 22.90, 22.95, -0.50, -0.75, [0, 0.18, 0.20, 0.12, 0.10]),
    treatments: [{ type: '아트로핀 0.025%', date: '2025-02-20' }],
    notes: ['아트로핀 점안 후 눈부심 호소 없음. 진행 속도 둔화 추세 확인.'],
  },
  {
    name: '정하준', birth: '2013-01-30', gender: 'male', ref: 'DEMO-005',
    nextVisit: '2026-07-15', followUp: 4,
    visits: genVisits('2022-07-05', 6, 25.00, 25.10, -3.50, -3.75, [0, 0.25, 0.22, 0.20, 0.18, 0.15, 0.12, 0.10]),
    treatments: [
      { type: '아트로핀 0.05%', date: '2023-07-05' },
      { type: '마이사이트', date: '2025-01-10' },
    ],
    notes: [
      '고도근시 진행 중으로 병합 치료 유지. 안저검사 연 1회 시행 예정.',
      '마이사이트 착용 적응 완료. 학교에서 착용 시간 준수 양호.',
    ],
  },
  {
    name: '강민서', birth: '2018-11-05', gender: 'female', ref: 'DEMO-006',
    nextVisit: '2026-12-05', followUp: 6,
    visits: genVisits('2025-12-05', 6, 22.60, 22.55, -0.25, -0.25, [0, 0.10]),
    treatments: [],
    notes: ['초진. 부모 모두 근시로 가족력 있음. 경과관찰 후 치료 여부 결정 예정.'],
  },
  {
    name: '윤서준', birth: '2015-06-18', gender: 'male', ref: 'DEMO-007',
    nextVisit: '2027-01-10', followUp: 12,
    visits: genVisits('2023-01-10', 12, 23.40, 23.45, -1.00, -1.00, [0, 0.10, 0.08, 0.06]),
    treatments: [],
    notes: ['진행 안정적. 안경 교정만 유지하며 연 1회 추적관찰.'],
  },
  {
    name: '임채원', birth: '2014-09-09', gender: 'female', ref: 'DEMO-008',
    nextVisit: '2026-09-10', followUp: 6,
    visits: genVisits('2024-01-12', 6, 24.10, 24.05, -2.00, -1.75, [0, 0.10, 0.12, 0.25, 0.15]),
    treatments: [
      { type: '드림렌즈', date: '2024-01-12', endDate: '2025-06-30' },
      { type: '아트로핀 0.01%', date: '2025-07-15' },
    ],
    notes: [
      '알레르기 결막염으로 드림렌즈 중단. 중단 후 진행 속도 증가 관찰됨.',
      '아트로핀 전환 후 경과 양호. 결막염 증상 호전.',
    ],
  },
  {
    name: '한지우', birth: '2016-12-03', gender: 'female', ref: 'DEMO-009',
    nextVisit: '2026-05-30', followUp: 6, // 의도적 지연(방문 예정일 경과) — 알림 배너 확인용
    visits: genVisits('2024-05-25', 6, 23.00, 23.05, -0.75, -1.00, [0, 0.20, 0.18, 0.10]),
    treatments: [{ type: '마이사이트', date: '2025-09-01' }],
    notes: ['마이사이트 착용 시작. 다음 방문 시 진행 속도 재평가 필요.'],
  },
  {
    name: '오시우', birth: '2012-05-22', gender: 'male', ref: 'DEMO-010',
    nextVisit: null, followUp: 12,
    visits: genVisits('2022-03-10', 12, 24.80, 24.85, -3.00, -3.00, [0, 0.20, 0.12, 0.06, 0.03]),
    treatments: [{ type: '아트로핀 0.01%', date: '2022-03-10', endDate: '2024-12-20' }],
    notes: ['성장 둔화기 진입으로 진행 거의 정지. 아트로핀 종료 후에도 안정적.'],
  },
  {
    name: '신예린', birth: '2019-02-14', gender: 'female', ref: 'DEMO-011',
    nextVisit: '2026-11-28', followUp: 6,
    visits: genVisits('2026-05-28', 6, 22.40, 22.45, -0.50, -0.50, [0]),
    treatments: [],
    notes: ['초진. 학교 시력검진에서 의뢰됨. 6개월 후 재측정하여 진행 속도 평가 예정.'],
  },
  {
    name: '송은우', birth: '2015-10-08', gender: 'male', ref: 'DEMO-012',
    nextVisit: '2026-08-15', followUp: 3,
    visits: genVisits('2024-05-10', 6, 23.60, 23.65, -1.50, -1.50, [0, 0.30, 0.28, 0.32, 0.30]),
    treatments: [{ type: '아트로핀 0.01%', date: '2026-05-15' }],
    notes: [
      '연 0.6mm 수준의 빠른 진행으로 치료 시작 권고, 보호자 동의하에 아트로핀 개시.',
      '3개월 단기 추적으로 치료 반응 평가 예정.',
    ],
  },
];

const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
  email: 'demo@example.com', password: 'Demo123456!',
});
if (authErr) { console.error('로그인 실패:', authErr.message); process.exit(1); }
const userId = auth.user.id;

// 치료 종류: DB에 있는 이름만 사용 (없으면 생성 시도, 실패 시 첫 번째 기존 타입으로 대체)
const { data: typeRows } = await supabase.from('treatment_types').select('name').eq('is_active', true);
const existingTypes = new Set((typeRows || []).map(t => t.name));
console.log('기존 치료 종류:', [...existingTypes].join(', ') || '(없음)');

async function resolveType(name) {
  if (existingTypes.has(name)) return name;
  const { data, error } = await supabase.from('treatment_types').insert({ name, color: '#7c3aed' }).select().single();
  if (!error && data) { existingTypes.add(name); console.log(`  치료 종류 생성: ${name}`); return name; }
  const fallback = [...existingTypes][0];
  console.log(`  치료 종류 "${name}" 사용 불가 → "${fallback}" 대체`);
  return fallback;
}

const { data: existing } = await supabase.from('patients')
  .select('custom_ref').in('custom_ref', PATIENTS.map(p => p.ref));
const existingRefs = new Set((existing || []).map(p => p.custom_ref));

let created = 0;
for (const [i, p] of PATIENTS.entries()) {
  if (existingRefs.has(p.ref)) { console.log(`건너뜀 (이미 존재): ${p.name} ${p.ref}`); continue; }

  const { data: patient, error: pErr } = await supabase.from('patients').insert({
    name: p.name, birth_date: p.birth, gender: p.gender,
    reg_no: `P-${Date.now()}-${i}`, custom_ref: p.ref,
    next_visit_date: p.nextVisit, follow_up_months: p.followUp,
  }).select().single();
  if (pErr) { console.error(`환자 생성 실패 ${p.name}:`, pErr.message); continue; }

  const measRows = p.visits.map(v => {
    const age = calcAge(p.birth, v.date);
    const odPct = calcPct(p.gender, age, v.odAL);
    const osPct = calcPct(p.gender, age, v.osAL);
    return {
      patient_id: patient.id, date: v.date, age,
      od_al: v.odAL, os_al: v.osAL, od_se: v.odSE, os_se: v.osSE,
      od_pct: odPct != null ? String(odPct) : null,
      os_pct: osPct != null ? String(osPct) : null,
    };
  });
  const { error: mErr } = await supabase.from('measurements').insert(measRows);
  if (mErr) console.error(`  측정 삽입 실패 ${p.name}:`, mErr.message);

  for (const t of p.treatments) {
    const type = await resolveType(t.type);
    const { error: tErr } = await supabase.from('treatments').insert({
      patient_id: patient.id, type, date: t.date,
      age: calcAge(p.birth, t.date), end_date: t.endDate || null,
    });
    if (tErr) console.error(`  치료 삽입 실패 ${p.name}:`, tErr.message);
  }

  if (p.notes.length) {
    const { error: nErr } = await supabase.from('notes').insert(
      p.notes.map(content => ({ patient_id: patient.id, content, created_by: userId }))
    );
    if (nErr) console.error(`  메모 삽입 실패 ${p.name}:`, nErr.message);
  }

  created++;
  console.log(`생성: ${p.name} (${p.ref}) — 측정 ${p.visits.length}건, 치료 ${p.treatments.length}건, 메모 ${p.notes.length}건`);
}

console.log(`\n완료: 환자 ${created}명 생성`);
await supabase.auth.signOut();
