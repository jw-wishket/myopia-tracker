import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { logout } from '../data/dataService.js';
import { setState } from '../state.js';

export function renderPendingScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커' });
  container.innerHTML = `
    ${nav.html}
    <div class="flex items-center justify-center min-h-[calc(100vh-56px)] p-4">
      <div class="text-center max-w-sm">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-800 mb-2">승인 대기 중</h2>
        <p class="text-sm text-slate-500 mb-6">관리자가 요청을 검토 중입니다.<br>승인 완료 시 이메일로 알림을 보내드립니다.</p>
        <span class="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">승인 대기중</span>
        <div class="mt-8">
          <button id="pendingLogout" class="text-sm text-slate-500 hover:text-slate-700 underline">로그아웃</button>
        </div>
      </div>
    </div>
  `;
  nav.bind(container);
  container.querySelector('#pendingLogout')?.addEventListener('click', () => {
    logout(); setState({ currentUser: null }); navigate('login');
  });
}
