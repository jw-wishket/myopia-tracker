import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { registerWithEmail, logout } from '../data/dataService.js';
import { pendingRegistration } from './loginScreen.js';

let selectedRole = 'doctor';

export async function renderRegisterScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '회원가입', showBack: true, backTarget: 'login' });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-lg mx-auto p-4 sm:p-6">
      <div class="bg-white rounded-2xl border border-slate-200 p-6">
        <h3 class="text-lg font-semibold text-slate-800 mb-2">계정 유형</h3>
        <p class="text-sm text-slate-500 mb-5">의료진 유형을 선택하고 이름을 입력하세요</p>
        <div class="grid grid-cols-2 gap-4 mb-5">
          <label class="cursor-pointer">
            <input type="radio" name="regRole" value="doctor" class="sr-only peer" ${selectedRole === 'doctor' ? 'checked' : ''}>
            <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
              <div class="text-3xl mb-2">🩺</div>
              <div class="font-medium text-slate-800">의사</div>
              <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
            </div>
          </label>
          <label class="cursor-pointer">
            <input type="radio" name="regRole" value="nurse" class="sr-only peer" ${selectedRole === 'nurse' ? 'checked' : ''}>
            <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
              <div class="text-3xl mb-2">💉</div>
              <div class="font-medium text-slate-800">간호사</div>
              <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
            </div>
          </label>
        </div>
        <div class="mb-3">
          <label class="block text-sm font-medium text-slate-600 mb-1.5">이름</label>
          <input type="text" id="regName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="홍길동">
        </div>
        <div class="px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 mb-3">최초 가입 계정은 자동으로 관리자가 되어 바로 이용할 수 있습니다. 그 외 계정은 <b>관리자 승인 후</b> 이용할 수 있습니다.</div>
        <div id="regError" class="hidden text-sm text-red-500 text-center mb-3"></div>
        <button id="regComplete" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">가입 완료</button>
      </div>
    </main>
  `;

  nav.bind(container);

  container.querySelectorAll('input[name="regRole"]').forEach(r => {
    r.addEventListener('change', () => { selectedRole = r.value; });
  });

  container.querySelector('#regComplete').addEventListener('click', async () => {
    const errEl = container.querySelector('#regError');
    errEl.classList.add('hidden');
    const name = container.querySelector('#regName').value.trim();

    if (!pendingRegistration.email || !pendingRegistration.password) {
      errEl.textContent = '회원가입 정보가 없습니다. 처음부터 다시 시도해주세요.';
      errEl.classList.remove('hidden');
      return;
    }
    if (!name) {
      errEl.textContent = '이름을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }

    try {
      await registerWithEmail(pendingRegistration.email, pendingRegistration.password, {
        name,
        role: selectedRole,
      });
      // 승인 전이므로 자동 생성된 세션이 있으면 정리 (최초 계정도 명시 로그인 유도)
      await logout();
      pendingRegistration.email = '';
      pendingRegistration.password = '';
      selectedRole = 'doctor';
      // 가입 완료 안내 화면
      const main = container.querySelector('main');
      main.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-200 p-6 text-center">
          <div class="w-12 h-12 mx-auto mb-3 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3 class="text-lg font-semibold text-slate-800 mb-2">가입이 완료되었습니다</h3>
          <p class="text-sm text-slate-500 mb-5">최초 계정은 바로 로그인할 수 있습니다.<br>그 외 계정은 <b class="text-slate-700">관리자 승인 후</b> 로그인할 수 있습니다.</p>
          <button id="toLogin" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">로그인하기</button>
        </div>`;
      main.querySelector('#toLogin').addEventListener('click', () => navigate('login'));
    } catch (err) {
      errEl.textContent = err.message || '회원가입에 실패했습니다';
      errEl.classList.remove('hidden');
    }
  });
}
