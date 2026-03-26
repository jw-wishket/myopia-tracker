import { pctBadgeClass } from '../utils.js';

export function renderStatsCard(patient) {
  if (!patient || !patient.records || patient.records.length === 0) {
    return `<div class="text-center py-8 text-slate-400">측정 기록이 없습니다</div>`;
  }
  const r = patient.records[patient.records.length - 1];

  function pctDisplay(val) {
    if (val === null || val === undefined) return '-';
    return typeof val === 'string' ? val : val + '%ile';
  }

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 p-4 border-l-4 border-l-od">
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">우안 (OD)</div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">안축장</span>
            <span class="text-xl font-semibold text-slate-800">${r.odAL?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">mm</span></span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">굴절력</span>
            <span class="text-lg font-semibold text-slate-800">${r.odSE?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">D</span></span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-slate-500">백분위</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${pctBadgeClass(r.odPct)}">${pctDisplay(r.odPct)}</span>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 p-4 border-l-4 border-l-os">
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">좌안 (OS)</div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">안축장</span>
            <span class="text-xl font-semibold text-slate-800">${r.osAL?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">mm</span></span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">굴절력</span>
            <span class="text-lg font-semibold text-slate-800">${r.osSE?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">D</span></span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-slate-500">백분위</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${pctBadgeClass(r.osPct)}">${pctDisplay(r.osPct)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
