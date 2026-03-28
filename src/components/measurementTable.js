import { formatDate, pctBadgeClass } from '../utils.js';

export function renderMeasurementTable(records, options = {}) {
  const { editable = false } = options;

  if (!records || records.length === 0) {
    return `<div class="text-center py-8 text-slate-400">측정 기록이 없습니다</div>`;
  }

  const rows = [...records].reverse().map((r, i) => {
    function pctCell(val) {
      if (val === null || val === undefined) return '<td class="px-3 py-2.5 text-sm text-slate-400">-</td>';
      const display = typeof val === 'string' ? val : val + '%';
      return `<td class="px-3 py-2.5"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pctBadgeClass(val)}">${display}</span></td>`;
    }
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">${formatDate(r.date)}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.age?.toFixed(1) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm font-medium text-od">${r.odAL?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm font-medium text-os">${r.osAL?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.odSE?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.osSE?.toFixed(2) ?? '-'}</td>
        ${pctCell(r.odPct)}
        ${pctCell(r.osPct)}
        ${editable ? `<td class="px-3 py-2.5"><button class="record-delete text-slate-300 hover:text-red-500 transition-colors" data-id="${r.id}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>` : ''}
      </tr>
    `;
  }).join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px]">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">날짜</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">나이</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-od uppercase tracking-wider">OD AL</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-os uppercase tracking-wider">OS AL</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OD SE</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OS SE</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OD %</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OS %</th>
            ${editable ? '<th class="px-3 py-2.5 w-10"></th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
