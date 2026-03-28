let timeoutId = null;

export function showSyncStatus(status, message) {
  let el = document.getElementById('syncToast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'syncToast';
    el.className = 'fixed bottom-20 md:bottom-6 right-6 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 z-[90] translate-y-2 opacity-0';
    document.body.appendChild(el);
  }

  const styles = {
    syncing: 'bg-amber-50 text-amber-800 border border-amber-200',
    synced: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    error: 'bg-red-50 text-red-800 border border-red-200',
  };

  const icons = {
    syncing: '\u23F3',
    synced: '\u2713',
    error: '\u2715',
  };

  el.className = `fixed bottom-20 md:bottom-6 right-6 px-4 py-2.5 rounded-xl text-sm font-medium shadow-lg transition-all duration-300 z-[90] ${styles[status] || styles.synced}`;
  el.textContent = `${icons[status] || ''} ${message}`;

  // Animate in
  requestAnimationFrame(() => {
    el.style.transform = 'translateY(0)';
    el.style.opacity = '1';
  });

  if (timeoutId) clearTimeout(timeoutId);

  if (status !== 'syncing') {
    timeoutId = setTimeout(() => {
      el.style.transform = 'translateY(8px)';
      el.style.opacity = '0';
    }, 2500);
  }
}
