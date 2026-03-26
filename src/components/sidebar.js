export function renderSidebar(patients, selectedId, options = {}) {
  const { onSelect, onAdd, searchQuery = '' } = options;

  const items = patients.map(p => `
    <button class="sidebar-patient w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${p.id === selectedId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}" data-id="${p.id}">
      <div class="font-medium">${p.name}</div>
      <div class="text-xs ${p.id === selectedId ? 'text-primary-500' : 'text-slate-400'}">${p.birthDate} · ${p.gender === 'male' ? '남' : '여'}</div>
    </button>
  `).join('');

  return `
    <div class="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white h-[calc(100vh-56px)] sticky top-14">
      <div class="p-3">
        <input type="text" id="sidebarSearch" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 transition" placeholder="환자 검색..." value="${searchQuery}">
      </div>
      <div class="flex-1 overflow-y-auto px-2 space-y-0.5">
        ${items || '<p class="text-center text-sm text-slate-400 py-4">환자가 없습니다</p>'}
      </div>
      <div class="p-3 border-t border-slate-200">
        <button id="sidebarAddBtn" class="w-full py-2 text-sm font-medium text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          새 환자
        </button>
      </div>
    </div>
  `;
}
