/**
 * Treatment Before/After Comparison Component
 * Compares AL progression rates before and after each treatment
 */

import { TREATMENT_COLORS } from '../constants.js';
import { escapeHtml } from '../utils.js';

function calcRate(records) {
  if (!records || records.length < 2) return null;
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const daysDiff = (new Date(last.date) - new Date(first.date)) / (1000 * 60 * 60 * 24);
  if (daysDiff < 30) return null;
  const years = daysDiff / 365.25;
  return {
    odRate: (last.odAL - first.odAL) / years,
    osRate: (last.osAL - first.osAL) / years,
    count: sorted.length,
  };
}

function formatPctChange(before, after) {
  if (before === 0) return { text: '-', cls: 'text-slate-400' };
  const pct = ((after - before) / Math.abs(before)) * 100;
  if (pct < -5) return { text: `${Math.round(pct)}%`, cls: 'text-emerald-600' };
  if (pct > 5) return { text: `+${Math.round(pct)}%`, cls: 'text-red-600' };
  return { text: `${pct >= 0 ? '+' : ''}${Math.round(pct)}%`, cls: 'text-slate-500' };
}

export function renderTreatmentComparison(patient) {
  if (!patient || !patient.treatments || patient.treatments.length === 0) {
    return `
      <div class="text-center py-6 text-sm text-slate-400">
        치료 기록이 없습니다. 치료를 등록하면 효과 분석을 볼 수 있습니다.
      </div>
    `;
  }

  if (!patient.records || patient.records.length < 2) {
    return `
      <div class="text-center py-6 text-sm text-slate-400">
        치료 효과를 분석하려면 2개 이상의 측정 기록이 필요합니다.
      </div>
    `;
  }

  const sorted = [...patient.records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const treatments = [...patient.treatments].sort((a, b) => new Date(a.date) - new Date(b.date));

  const comparisons = treatments.map(t => {
    const tDate = new Date(t.date);
    const before = sorted.filter(r => new Date(r.date) < tDate);
    const after = sorted.filter(r => new Date(r.date) >= tDate);

    const beforeRate = calcRate(before);
    const afterRate = calcRate(after);

    return { treatment: t, beforeRate, afterRate };
  });

  if (comparisons.every(c => !c.beforeRate && !c.afterRate)) {
    return `
      <div class="text-center py-6 text-sm text-slate-400">
        치료 전후 비교에 필요한 측정 데이터가 부족합니다.
      </div>
    `;
  }

  // 한쪽 구간이 부족해도 있는 쪽 속도는 보여준다 (전부 숨기면 정보가 없음)
  const rateCol = (label, rate, hint) => `
    <div class="space-y-1">
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wider">${label}</div>
      ${rate ? `
        <div class="font-mono">
          <span class="text-od">OD</span> ${Math.abs(rate.odRate).toFixed(2)}mm/y
          <span class="mx-1 text-slate-300">|</span>
          <span class="text-os">OS</span> ${Math.abs(rate.osRate).toFixed(2)}mm/y
        </div>
        <div class="text-xs text-slate-400">${rate.count}회 측정</div>
      ` : `
        <div class="text-sm text-slate-400">측정 데이터 부족</div>
        <div class="text-xs text-slate-300">${hint}</div>
      `}
    </div>
  `;

  return `
    <div class="space-y-4">
      ${comparisons.map(c => {
        const color = TREATMENT_COLORS[c.treatment.type] || '#6b7280';
        const hasComparison = c.beforeRate && c.afterRate;

        let changeCol;
        if (hasComparison) {
          const odPctChange = formatPctChange(c.beforeRate.odRate, c.afterRate.odRate);
          const osPctChange = formatPctChange(c.beforeRate.osRate, c.afterRate.osRate);
          changeCol = `
            <div class="space-y-1">
              <div class="text-xs font-medium text-slate-400 uppercase tracking-wider">변화</div>
              <div class="font-mono">
                <span class="text-od">OD</span> <span class="${odPctChange.cls} font-semibold">${odPctChange.text}</span>
                <span class="mx-1 text-slate-300">|</span>
                <span class="text-os">OS</span> <span class="${osPctChange.cls} font-semibold">${osPctChange.text}</span>
              </div>
              <div class="text-xs text-slate-400">${odPctChange.cls.includes('emerald') || osPctChange.cls.includes('emerald') ? '감소 = 효과 있음' : '변화 없음'}</div>
            </div>
          `;
        } else {
          changeCol = `
            <div class="space-y-1">
              <div class="text-xs font-medium text-slate-400 uppercase tracking-wider">변화</div>
              <div class="text-sm text-slate-400">전후 비교 불가</div>
            </div>
          `;
        }

        return `
          <div class="rounded-xl border border-slate-200 overflow-hidden">
            <div class="px-4 py-2.5 flex items-center gap-2" style="background-color: ${color}10; border-left: 3px solid ${color}">
              <span class="inline-block w-2.5 h-2.5 rounded-full" style="background-color: ${color}"></span>
              <span class="text-sm font-semibold text-slate-700">${escapeHtml(c.treatment.type)}</span>
              <span class="text-xs text-slate-400 ml-auto">${c.treatment.date} 시작</span>
            </div>
            <div class="px-4 py-3">
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                ${rateCol('치료 전', c.beforeRate, '치료 시작 전 측정 2회 이상 필요')}
                ${rateCol('치료 후', c.afterRate, '치료 시작 후 측정 2회 이상 필요')}
                ${changeCol}
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}
