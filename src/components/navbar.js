import { getState } from '../state.js';
import { navigate } from '../router.js';
import { logout } from '../data/dataService.js';
import { setState } from '../state.js';
import { escapeHtml } from '../utils.js';
import { CLINIC_NAME } from '../constants.js';

export function renderNavbar(options = {}) {
  const { title = CLINIC_NAME, subtitle = '', showBack = false, backTarget = 'login', user = null, onProfile = null } = options;

  const adminLink = user && user.isAdmin ? `
    <button id="navAdminBtn" class="hidden sm:inline-flex text-xs font-medium text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5 hover:bg-primary-50 transition-colors">관리</button>
  ` : '';

  const nameHtml = user ? `
    <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
      ${escapeHtml(user.name?.charAt(0) || '?')}
    </div>
    <span>${escapeHtml(user.name || '')}${user.role === 'nurse' ? ' · 간호사' : ''}</span>
  ` : '';

  const userBadge = user ? `
    <div class="flex items-center gap-3">
      ${adminLink}
      ${onProfile ? `
        <button id="navProfileBtn" title="내 프로필 설정" class="hidden sm:flex items-center gap-2 text-sm text-slate-600 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors">
          ${nameHtml}
        </button>
      ` : `
        <div class="hidden sm:flex items-center gap-2 text-sm text-slate-600">
          ${nameHtml}
        </div>
      `}
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
            <img src="/oasis-emblem.png" alt="" class="w-7 h-7 object-contain" />
            <span class="font-semibold text-slate-800 tracking-tight">${escapeHtml(title)}</span>
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
        logoutBtn.addEventListener('click', async () => {
          await logout();
          setState({ currentUser: null, currentPatient: null });
          navigate('login');
        });
      }
      const adminBtn = container.querySelector('#navAdminBtn');
      if (adminBtn) {
        adminBtn.addEventListener('click', () => navigate('admin'));
      }
      const backBtnEl = container.querySelector('#navBackBtn');
      if (backBtnEl) {
        backBtnEl.addEventListener('click', () => navigate(backTarget));
      }
      const profileBtn = container.querySelector('#navProfileBtn');
      if (profileBtn && onProfile) {
        profileBtn.addEventListener('click', onProfile);
      }
    }
  };
}
