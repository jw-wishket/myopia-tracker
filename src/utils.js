import { PERCENTILE_DATA } from './constants.js';

export function calcAge(birth, date) {
  const b = new Date(birth), d = new Date(date || new Date());
  return Math.round((d.getFullYear()-b.getFullYear()+(d.getMonth()-b.getMonth())/12+(d.getDate()-b.getDate())/365.25)*10)/10;
}

export function interpolateValue(data, age, key) {
  if (age <= data[0].Age) return data[0][key];
  if (age >= data[data.length-1].Age) return data[data.length-1][key];
  for (let i = 0; i < data.length-1; i++) {
    if (data[i].Age <= age && data[i+1].Age >= age) {
      const r = (age - data[i].Age) / (data[i+1].Age - data[i].Age);
      return data[i][key] + r * (data[i+1][key] - data[i][key]);
    }
  }
  return data[0][key];
}

export function calcPct(gender, age, al) {
  const data = PERCENTILE_DATA[gender];
  if (!data || age < 4 || age > 18) return null;
  const refs = {};
  ['P3','P5','P10','P25','P50','P75','P90','P95'].forEach(k => refs[k] = interpolateValue(data, age, k));
  if (al <= refs.P3) return '<3';
  if (al >= refs.P95) return '>95';
  const pcts = [['P3',3],['P5',5],['P10',10],['P25',25],['P50',50],['P75',75],['P90',90],['P95',95]];
  for (let i = 0; i < pcts.length-1; i++) {
    if (al >= refs[pcts[i][0]] && al <= refs[pcts[i+1][0]]) {
      return Math.round(pcts[i][1] + (al - refs[pcts[i][0]]) / (refs[pcts[i+1][0]] - refs[pcts[i][0]]) * (pcts[i+1][1] - pcts[i][1]));
    }
  }
  return 50;
}

export function generateCurveData(gender, pKey) {
  const data = PERCENTILE_DATA[gender];
  const points = [];
  for (let age = 4; age <= 18; age += 0.5)
    points.push({ x: age, y: interpolateValue(data, age, pKey) });
  return points;
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
