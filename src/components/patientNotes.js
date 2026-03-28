export function renderPatientNotes(notes, editable = false) {
  const formatDateTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const notesList = (notes && notes.length > 0)
    ? notes.map(n => `
      <div class="flex items-start gap-3 py-3 border-b border-slate-100 last:border-0">
        <div class="flex-1 min-w-0">
          <p class="text-sm text-slate-700 whitespace-pre-wrap break-words">${escapeHtml(n.content)}</p>
          <p class="text-xs text-slate-400 mt-1">${formatDateTime(n.createdAt)}</p>
        </div>
        ${editable ? `<button class="note-delete flex-shrink-0 p-1 text-slate-300 hover:text-red-500 transition-colors" data-note-id="${n.id}" title="삭제">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>` : ''}
      </div>
    `).join('')
    : '<p class="text-sm text-slate-400 py-3">메모가 없습니다</p>';

  const inputArea = editable ? `
    <div class="mt-4 space-y-2">
      <textarea id="noteInput" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 resize-none" rows="2" placeholder="메모를 입력하세요..."></textarea>
      <div class="flex justify-end">
        <button id="addNoteBtn" class="px-4 py-1.5 bg-primary-600 text-white rounded-lg text-xs font-medium hover:bg-primary-700 transition-colors">메모 추가</button>
      </div>
    </div>
  ` : '';

  return `
    <div class="divide-y-0">
      ${notesList}
    </div>
    ${inputArea}
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
