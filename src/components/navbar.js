import { getState } from '../state.js';
import { navigate } from '../router.js';
import { logout } from '../data/dataService.js';
import { setState } from '../state.js';

export function renderNavbar(options = {}) {
  const { title = '근시관리 트래커', subtitle = '', showBack = false, backTarget = 'login', user = null } = options;

  const userBadge = user ? `
    <div class="flex items-center gap-3">
      <div class="hidden sm:flex items-center gap-2 text-sm text-slate-600">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
          ${user.name?.charAt(0) || '?'}
        </div>
        <span>${user.name}${user.clinicName ? ' · ' + user.clinicName : ''}</span>
      </div>
      <button id="navLogoutBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors" title="로그아웃">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      </button>
    </div>
  ` : '';

  const backBtn = showBack ? `
    <button id="navBackBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors mr-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
    </button>
  ` : '';

  const html = `
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div class="flex items-center">
          ${backBtn}
          <div class="flex items-center gap-2 cursor-pointer" id="navLogo">
            <svg class="w-7 h-7 text-primary-600" viewBox="0 0 32 32" fill="currentColor"><circle cx="16" cy="16" r="14"/><circle cx="16" cy="16" r="6" fill="white"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>
            <span class="font-semibold text-slate-800 tracking-tight">${title}</span>
            ${subtitle ? `<span class="text-xs text-slate-400 hidden sm:inline">· ${subtitle}</span>` : ''}
          </div>
        </div>
        ${userBadge}
      </div>
    </nav>
  `;

  return {
    html,
    bind(container) {
      const logoutBtn = container.querySelector('#navLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          logout();
          setState({ currentUser: null, currentPatient: null });
          navigate('login');
        });
      }
      const backBtnEl = container.querySelector('#navBackBtn');
      if (backBtnEl) {
        backBtnEl.addEventListener('click', () => navigate(backTarget));
      }
    }
  };
}
