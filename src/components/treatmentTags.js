import { TREATMENT_COLORS, TREATMENT_TYPES } from '../constants.js';
import { formatDate, todayStr } from '../utils.js';

export function renderTreatmentTags(treatments, options = {}) {
  const { editable = false, treatmentTypes = [] } = options;

  // Build color map from dynamic types, fallback to constants
  const colorMap = {};
  treatmentTypes.forEach(t => { colorMap[t.name] = t.color; });

  if (!treatments || treatments.length === 0) {
    const empty = editable ? '' : '<p class="text-sm text-slate-400">치료 기록이 없습니다</p>';
    return `<div class="flex flex-wrap items-center gap-2">${empty}${editable ? renderAddForm(treatmentTypes) : ''}</div>`;
  }

  const tags = treatments.map((t, i) => {
    const color = colorMap[t.type] || TREATMENT_COLORS[t.type] || '#7c3aed';
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border" style="border-color:${color}30; background:${color}10; color:${color}">
        <span class="w-2 h-2 rounded-full" style="background:${color}"></span>
        <span class="font-medium">${t.type}</span>
        <span class="text-xs opacity-70">${formatDate(t.date)}${t.endDate ? ' ~ ' + formatDate(t.endDate) : ' ~ 진행중'}</span>
        ${editable && !t.endDate ? `<button class="treatment-end ml-1 text-xs opacity-50 hover:opacity-100" data-id="${t.id}" title="치료 종료">⏹</button>` : ''}
        ${editable ? `<button class="treatment-remove ml-1 hover:opacity-70" data-id="${t.id}">&times;</button>` : ''}
      </span>
    `;
  }).join('');

  return `<div class="flex flex-wrap items-center gap-2">${tags}${editable ? renderAddForm(treatmentTypes) : ''}</div>`;
}

function renderAddForm(treatmentTypes = []) {
  const types = treatmentTypes.length > 0
    ? treatmentTypes
    : TREATMENT_TYPES.map(name => ({ name }));

  return `
    <button id="treatmentAddToggle" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-primary-600 border border-dashed border-primary-300 hover:bg-primary-50 transition-colors">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      추가
    </button>
    <div id="treatmentAddForm" class="hidden w-full mt-2 flex flex-wrap gap-2 items-end">
      <div class="flex-1 min-w-[150px]">
        <select id="treatmentTypeSelect" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-400">
          ${types.map(t => `<option value="${t.name}">${t.name}</option>`).join('')}
          <option value="__custom__">직접 입력...</option>
        </select>
      </div>
      <input type="text" id="treatmentCustomType" class="hidden px-3 py-2 border border-slate-200 rounded-lg text-sm flex-1 min-w-[150px]" placeholder="치료명 입력">
      <input type="date" id="treatmentDateInput" min="1900-01-01" max="2099-12-31" class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" value="${todayStr()}">
      <button id="treatmentAddConfirm" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">추가</button>
    </div>
  `;
}
