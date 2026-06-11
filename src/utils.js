// 백분위 계산은 myopiaModel로 이전됨. 하위호환을 위해 re-export.
export { interpolateValue, calcPct, generateCurveData } from './myopiaModel.js';

export function calcAge(birth, date) {
  const b = new Date(birth), d = new Date(date || new Date());
  return Math.round((d.getFullYear()-b.getFullYear()+(d.getMonth()-b.getMonth())/12+(d.getDate()-b.getDate())/365.25)*10)/10;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function pctBadgeClass(pct) {
  if (pct === null || pct === undefined) return 'bg-slate-100 text-slate-500';
  const n = typeof pct === 'string' ? parseInt(pct) : pct;
  if (isNaN(n) || n <= 50) return 'bg-emerald-50 text-emerald-700';
  if (n <= 75) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export function escapeHtml(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function showLoading() {
  document.getElementById('loadingOverlay')?.classList.remove('hidden');
}
export function hideLoading() {
  document.getElementById('loadingOverlay')?.classList.add('hidden');
}

// 성장 차트 18세 예측 라벨의 yAdjust 계산. 양안 예측값이 가까우면
// 같은 자리에 겹쳐 그려지므로 큰 쪽은 위, 작은 쪽은 아래로 분리한다.
// threshold 0.35mm ≈ 라벨 높이(y축 1mm ≈ 34px, 라벨 ~12px)
export function predictionLabelAdjusts(odAL, osAL, threshold = 0.35) {
  const base = { od: -8, os: -8 };
  if (odAL == null || osAL == null || Math.abs(odAL - osAL) >= threshold) return base;
  return odAL >= osAL ? { od: -10, os: 10 } : { od: 10, os: -10 };
}

// 안축장 진행속도 분류. 표시 정밀도(소수 2자리)로 반올림한 뒤 비교해야
// 화면에 0.30으로 표시되는 값이 "빠름(0.3 초과)"으로 분류되는 모순이 없다.
export function classifyRate(rate) {
  const r = Number(Math.abs(rate).toFixed(2));
  if (r <= 0.1) return { label: '안정', cls: 'text-emerald-600 bg-emerald-50', dotCls: 'bg-emerald-500' };
  if (r <= 0.2) return { label: '느림', cls: 'text-blue-600 bg-blue-50', dotCls: 'bg-blue-500' };
  if (r <= 0.3) return { label: '보통', cls: 'text-amber-600 bg-amber-50', dotCls: 'bg-amber-500' };
  return { label: '빠름', cls: 'text-red-600 bg-red-50', dotCls: 'bg-red-500' };
}

export function progressLabel(records) {
  if (!records || records.length < 2) return { text: '데이터 부족', cls: 'text-slate-400' };
  const last = records[records.length - 1];
  const prev = records[records.length - 2];
  const months = (new Date(last.date) - new Date(prev.date)) / (1000*60*60*24*30.44);
  if (months <= 0) return { text: '-', cls: 'text-slate-400' };
  const rate = ((last.odAL - prev.odAL) / months * 12).toFixed(2);
  if (rate <= 0.1) return { text: `${rate}mm/년 · 안정`, cls: 'text-emerald-600' };
  if (rate <= 0.3) return { text: `${rate}mm/년 · 보통`, cls: 'text-amber-600' };
  return { text: `${rate}mm/년 · 빠름`, cls: 'text-red-600' };
}
