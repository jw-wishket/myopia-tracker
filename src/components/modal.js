export function openModal(title, contentHtml, options = {}) {
  const { onClose, width = 'max-w-lg' } = options;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop"></div>
    <div class="${width} w-full bg-white rounded-2xl shadow-xl relative z-10 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-5 border-b border-slate-100">
        <h3 class="text-lg font-semibold text-slate-800">${title}</h3>
        <button class="modal-close-btn text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-5">${contentHtml}</div>
    </div>
  `;

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  overlay.querySelector('.modal-backdrop').addEventListener('click', close);
  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  document.body.appendChild(overlay);

  return { close, element: overlay };
}
