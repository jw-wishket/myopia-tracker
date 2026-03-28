export function renderRateTable(records) {
  if (!records || records.length < 2) {
    return '<div class="text-center py-6 text-slate-400 text-sm">2회 이상 측정 기록이 필요합니다</div>';
  }

  // Sort by date ascending
  const sorted = [...records].sort((a, b) => new Date(a.date) - new Date(b.date));

  const rows = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    const months = (new Date(curr.date) - new Date(prev.date)) / (1000 * 60 * 60 * 24 * 30.44);
    if (months <= 0) continue;

    const odChange = curr.odAL - prev.odAL;
    const osChange = curr.osAL - prev.osAL;
    const odRate = (odChange / months * 12);
    const osRate = (osChange / months * 12);

    // Rate classification
    function getRateClass(rate) {
      if (rate <= 0.1) return { label: '안정', cls: 'text-emerald-600 bg-emerald-50' };
      if (rate <= 0.2) return { label: '느림', cls: 'text-blue-600 bg-blue-50' };
      if (rate <= 0.3) return { label: '보통', cls: 'text-amber-600 bg-amber-50' };
      return { label: '빠름', cls: 'text-red-600 bg-red-50' };
    }

    const odClass = getRateClass(Math.abs(odRate));
    const osClass = getRateClass(Math.abs(osRate));

    rows.push(`
      <tr class="border-b border-slate-100 hover:bg-slate-50">
        <td class="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">${formatPeriod(prev.date, curr.date)}</td>
        <td class="px-3 py-2.5 text-sm text-slate-500">${months.toFixed(1)}개월</td>
        <td class="px-3 py-2.5 text-sm font-medium text-od">${odChange >= 0 ? '+' : ''}${odChange.toFixed(2)}mm</td>
        <td class="px-3 py-2.5 text-sm font-medium ${odClass.cls.split(' ')[0]}">${odRate.toFixed(2)}mm/y</td>
        <td class="px-3 py-2.5 text-sm font-medium text-os">${osChange >= 0 ? '+' : ''}${osChange.toFixed(2)}mm</td>
        <td class="px-3 py-2.5 text-sm font-medium ${osClass.cls.split(' ')[0]}">${osRate.toFixed(2)}mm/y</td>
        <td class="px-3 py-2.5"><span class="px-2 py-0.5 rounded-full text-xs font-medium ${odClass.cls}">${odClass.label}</span></td>
      </tr>
    `);
  }

  return `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[600px]">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">구간</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">기간</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-od uppercase">OD 변화</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-od uppercase">OD 속도</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-os uppercase">OS 변화</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-os uppercase">OS 속도</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase">평가</th>
          </tr>
        </thead>
        <tbody>${rows.join('')}</tbody>
      </table>
    </div>
    <p class="text-xs text-slate-400 mt-2">* 속도 = 연간 환산 (mm/year)</p>
  `;
}

function formatPeriod(from, to) {
  const f = from.substring(2, 7).replace('-', '.');
  const t = to.substring(2, 7).replace('-', '.');
  return f + ' → ' + t;
}
