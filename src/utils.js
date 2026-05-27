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
