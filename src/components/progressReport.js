/**
 * Progress Rate Report Component
 * Shows period-based AL progression rates with classification
 */

function calcRateForPeriod(records, months) {
  if (!records || records.length < 2) return null;

  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));
  const lastRecord = sorted[sorted.length - 1];
  const lastDate = new Date(lastRecord.date);

  if (months !== null) {
    const cutoff = new Date(lastDate);
    cutoff.setMonth(cutoff.getMonth() - months);

    // Find the record closest to (but before or at) the cutoff
    const earlier = sorted.filter(r => new Date(r.date) <= cutoff);
    const after = sorted.filter(r => new Date(r.date) > cutoff && r !== lastRecord);

    // Use the record closest to the cutoff boundary
    let startRecord = null;
    if (earlier.length > 0) {
      startRecord = earlier[earlier.length - 1];
    } else if (after.length > 0) {
      startRecord = after[0];
    } else {
      // Only have the last record in range
      return null;
    }

    if (startRecord === lastRecord) return null;

    const daysDiff = (lastDate - new Date(startRecord.date)) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) return null; // Need at least 30 days

    const years = daysDiff / 365.25;
    return {
      odChange: lastRecord.odAL - startRecord.odAL,
      osChange: lastRecord.osAL - startRecord.osAL,
      odRate: (lastRecord.odAL - startRecord.odAL) / years,
      osRate: (lastRecord.osAL - startRecord.osAL) / years,
      days: Math.round(daysDiff),
    };
  } else {
    // Overall: first to last
    const firstRecord = sorted[0];
    if (firstRecord === lastRecord) return null;

    const daysDiff = (lastDate - new Date(firstRecord.date)) / (1000 * 60 * 60 * 24);
    if (daysDiff < 30) return null;

    const years = daysDiff / 365.25;
    return {
      odChange: lastRecord.odAL - firstRecord.odAL,
      osChange: lastRecord.osAL - firstRecord.osAL,
      odRate: (lastRecord.odAL - firstRecord.odAL) / years,
      osRate: (lastRecord.osAL - firstRecord.osAL) / years,
      days: Math.round(daysDiff),
    };
  }
}

function classifyRate(rate) {
  if (rate <= 0.1) return { label: '안정', cls: 'text-emerald-600 bg-emerald-50', dotCls: 'bg-emerald-500' };
  if (rate <= 0.2) return { label: '느림', cls: 'text-blue-600 bg-blue-50', dotCls: 'bg-blue-500' };
  if (rate <= 0.3) return { label: '보통', cls: 'text-amber-600 bg-amber-50', dotCls: 'bg-amber-500' };
  return { label: '빠름', cls: 'text-red-600 bg-red-50', dotCls: 'bg-red-500' };
}

function renderRateRow(label, result) {
  if (!result) {
    return `
      <tr>
        <td class="px-3 py-2.5 text-sm text-slate-600 font-medium">${label}</td>
        <td colspan="5" class="px-3 py-2.5 text-sm text-slate-400 text-center">데이터 부족</td>
      </tr>
    `;
  }

  const odClass = classifyRate(Math.abs(result.odRate));
  const osClass = classifyRate(Math.abs(result.osRate));
  // Use the worse (higher) rate for the overall classification
  const overallRate = Math.max(Math.abs(result.odRate), Math.abs(result.osRate));
  const overall = classifyRate(overallRate);

  return `
    <tr class="border-t border-slate-100">
      <td class="px-3 py-2.5 text-sm text-slate-600 font-medium">${label}</td>
      <td class="px-3 py-2.5 text-sm text-center font-mono ${result.odChange >= 0 ? 'text-slate-700' : 'text-emerald-600'}">${result.odChange >= 0 ? '+' : ''}${result.odChange.toFixed(2)}mm</td>
      <td class="px-3 py-2.5 text-sm text-center font-mono ${result.osChange >= 0 ? 'text-slate-700' : 'text-emerald-600'}">${result.osChange >= 0 ? '+' : ''}${result.osChange.toFixed(2)}mm</td>
      <td class="px-3 py-2.5 text-sm text-center font-mono">${Math.abs(result.odRate).toFixed(2)}<span class="text-slate-400 text-xs">mm/y</span></td>
      <td class="px-3 py-2.5 text-sm text-center font-mono">${Math.abs(result.osRate).toFixed(2)}<span class="text-slate-400 text-xs">mm/y</span></td>
      <td class="px-3 py-2.5 text-center">
        <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${overall.cls}">
          <span class="w-1.5 h-1.5 rounded-full ${overall.dotCls}"></span>
          ${overall.label}
        </span>
      </td>
    </tr>
  `;
}

export function renderProgressReport(patient) {
  if (!patient || !patient.records || patient.records.length < 2) {
    return `
      <div class="text-center py-6 text-sm text-slate-400">
        진행 속도를 분석하려면 2개 이상의 측정 기록이 필요합니다.
      </div>
    `;
  }

  const rate6m = calcRateForPeriod(patient.records, 6);
  const rate1y = calcRateForPeriod(patient.records, 12);
  const rateAll = calcRateForPeriod(patient.records, null);

  return `
    <div class="overflow-x-auto">
      <table class="w-full text-left">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">기간</th>
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">OD 변화</th>
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">OS 변화</th>
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">OD 속도</th>
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">OS 속도</th>
            <th class="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">평가</th>
          </tr>
        </thead>
        <tbody>
          ${renderRateRow('최근 6개월', rate6m)}
          ${renderRateRow('최근 1년', rate1y)}
          ${renderRateRow('전체 기간', rateAll)}
        </tbody>
      </table>
    </div>
    <div class="mt-3 flex flex-wrap gap-3 text-xs text-slate-400">
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-emerald-500"></span> 안정 (0.1mm/y 이하)</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-blue-500"></span> 느림 (0.2mm/y 이하)</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-amber-500"></span> 보통 (0.3mm/y 이하)</span>
      <span class="flex items-center gap-1"><span class="w-2 h-2 rounded-full bg-red-500"></span> 빠름 (0.3mm/y 초과)</span>
    </div>
  `;
}
