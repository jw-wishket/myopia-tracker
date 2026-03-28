import { renderNavbar } from '../components/navbar.js';
import { searchPatientByInfo, loginWithEmail, resetPassword, getClinics } from '../data/dataService.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';

export let pendingRegistration = { email: '', password: '' };

let lastSearchTime = 0;
const SEARCH_COOLDOWN = 2000;

export async function renderLoginScreen(container) {
  const clinics = await getClinics();
  const clinicOptions = clinics.map(c => `<option value="${c.id}">${c.name}</option>`).join('');
  const nav = renderNavbar({ title: '근시관리 트래커' });

  container.innerHTML = `
    ${nav.html}
    <div class="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <svg class="w-12 h-12 mx-auto text-primary-600 mb-3" viewBox="0 0 32 32" fill="currentColor"><circle cx="16" cy="16" r="14"/><circle cx="16" cy="16" r="6" fill="white"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>
          <h1 class="text-2xl font-semibold text-slate-800 tracking-tight">근시관리 트래커</h1>
          <p class="text-sm text-slate-500 mt-1">근시 관리 기록을 확인하세요</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="flex border-b border-slate-200">
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-primary-600 bg-primary-50 border-b-2 border-primary-600" data-tab="search">환자조회</button>
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-slate-500 hover:text-slate-700" data-tab="login">로그인</button>
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-slate-500 hover:text-slate-700" data-tab="register">회원가입</button>
          </div>

          <div class="p-6">
            <!-- Search Tab -->
            <div id="tab-search" class="tab-content">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">안과 선택</label>
                  <select id="searchClinic" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition bg-white">
                    <option value="">안과를 선택하세요</option>
                    ${clinicOptions}
                  </select>
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
                  <input type="text" id="searchName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="홍길동">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
                  <input type="date" id="searchBirth" min="1900-01-01" max="2099-12-31" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">관리번호</label>
                  <input type="text" id="searchRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="병원 관리번호">
                </div>
                <p class="text-xs text-slate-400">* 안과 + 이름 필수, 생년월일 또는 관리번호 중 하나 입력</p>
                <div id="searchError" class="hidden text-sm text-red-500 text-center"></div>
                <button id="searchBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                  조회하기
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            </div>

            <!-- Login Tab -->
            <div id="tab-login" class="tab-content hidden">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">이메일</label>
                  <input type="email" id="loginEmail" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" id="loginPassword" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <div id="loginError" class="hidden text-sm text-red-500 text-center"></div>
                <button id="loginBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">로그인</button>
                <p id="resetPasswordLink" class="text-center text-sm text-primary-600 cursor-pointer hover:underline">비밀번호 찾기</p>
              </div>
            </div>

            <!-- Register Tab -->
            <div id="tab-register" class="tab-content hidden">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">이메일</label>
                  <input type="email" id="regEmail" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" id="regPassword" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="8자 이상">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호 확인</label>
                  <input type="password" id="regPasswordConfirm" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <div id="regError" class="hidden text-sm text-red-500 text-center"></div>
                <button id="regBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">회원가입</button>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('text-primary-600', 'bg-primary-50', 'border-b-2', 'border-primary-600');
        t.classList.add('text-slate-500');
      });
      tab.classList.add('text-primary-600', 'bg-primary-50', 'border-b-2', 'border-primary-600');
      tab.classList.remove('text-slate-500');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });

  // Patient search: Enter key on any search field
  container.querySelectorAll('#searchClinic, #searchName, #searchBirth, #searchRegNo').forEach(el => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') container.querySelector('#searchBtn').click(); });
  });

  // Patient search
  container.querySelector('#searchBtn').addEventListener('click', async () => {
    const clinicId = container.querySelector('#searchClinic').value;
    const name = container.querySelector('#searchName').value.trim();
    const birth = container.querySelector('#searchBirth').value;
    const customRef = container.querySelector('#searchRegNo').value.trim();
    const errEl = container.querySelector('#searchError');
    errEl.classList.add('hidden');

    const now = Date.now();
    if (now - lastSearchTime < SEARCH_COOLDOWN) {
      errEl.textContent = '잠시 후 다시 시도해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    lastSearchTime = now;

    if (!clinicId) {
      errEl.textContent = '안과를 선택해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    if (!name || (!birth && !customRef)) {
      errEl.textContent = '이름과 생년월일 또는 이름과 관리번호를 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }

    const patient = await searchPatientByInfo(name, birth, customRef, clinicId);
    if (patient) {
      setState({ currentPatient: patient });
      navigate('patient-result');
    } else {
      errEl.textContent = '일치하는 환자를 찾을 수 없습니다';
      errEl.classList.remove('hidden');
    }
  });

  // Login: Enter key on password field
  container.querySelector('#loginPassword').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') container.querySelector('#loginBtn').click();
  });

  // Login button
  container.querySelector('#loginBtn').addEventListener('click', async () => {
    const email = container.querySelector('#loginEmail').value.trim();
    const password = container.querySelector('#loginPassword').value;
    const errEl = container.querySelector('#loginError');
    errEl.classList.add('hidden');
    if (!email || !password) {
      errEl.textContent = '이메일과 비밀번호를 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      const user = await loginWithEmail(email, password);
      setState({ currentUser: user });
      const route = user.role === 'admin' ? 'admin' : user.role === 'customer' ? 'customer' : 'doctor';
      navigate(route);
    } catch (err) {
      const msg = err.message || '';
      const koreanErrors = {
        'Invalid login credentials': '이메일 또는 비밀번호가 올바르지 않습니다',
        'Email not confirmed': '이메일 인증이 완료되지 않았습니다',
        'User not found': '등록되지 않은 이메일입니다',
      };
      errEl.textContent = koreanErrors[msg] || '로그인에 실패했습니다';
      errEl.classList.remove('hidden');
    }
  });

  // Password reset
  container.querySelector('#resetPasswordLink').addEventListener('click', async () => {
    const email = container.querySelector('#loginEmail').value.trim();
    const errEl = container.querySelector('#loginError');
    errEl.classList.add('hidden');
    if (!email) {
      errEl.textContent = '이메일을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    try {
      await resetPassword(email);
      errEl.textContent = '비밀번호 재설정 링크를 이메일로 보냈습니다';
      errEl.classList.remove('hidden');
      errEl.classList.remove('text-red-500');
      errEl.classList.add('text-green-600');
    } catch (err) {
      errEl.textContent = '비밀번호 재설정에 실패했습니다';
      errEl.classList.remove('hidden');
    }
  });

  // Register: Enter key on password confirm field
  container.querySelector('#regPasswordConfirm').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') container.querySelector('#regBtn').click();
  });

  // Register button
  container.querySelector('#regBtn').addEventListener('click', () => {
    const email = container.querySelector('#regEmail').value.trim();
    const password = container.querySelector('#regPassword').value;
    const passwordConfirm = container.querySelector('#regPasswordConfirm').value;
    const errEl = container.querySelector('#regError');
    errEl.classList.add('hidden');
    if (!email || !password || !passwordConfirm) {
      errEl.textContent = '모든 항목을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    if (password.length < 8) {
      errEl.textContent = '비밀번호는 8자 이상이어야 합니다';
      errEl.classList.remove('hidden');
      return;
    }
    if (password !== passwordConfirm) {
      errEl.textContent = '비밀번호가 일치하지 않습니다';
      errEl.classList.remove('hidden');
      return;
    }
    pendingRegistration = { email, password };
    navigate('register');
  });

  nav.bind(container);
}
