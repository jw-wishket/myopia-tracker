import { renderNavbar } from '../components/navbar.js';
import { login, searchPatientByInfo } from '../data/dataService.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';
import { todayStr } from '../utils.js';

export async function renderLoginScreen(container) {
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
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
                  <input type="text" id="searchName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="홍길동">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
                  <input type="date" id="searchBirth" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">등록번호</label>
                  <input type="text" id="searchRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="2024-001">
                </div>
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
                  <input type="email" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <button class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">로그인</button>
                <p class="text-center text-sm text-primary-600 cursor-pointer hover:underline">비밀번호 찾기</p>
              </div>
            </div>

            <!-- Register Tab -->
            <div id="tab-register" class="tab-content hidden">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">이메일</label>
                  <input type="email" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="8자 이상">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호 확인</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <button class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors" onclick="location.hash='register'">회원가입</button>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="px-6">
            <div class="flex items-center gap-3 text-slate-400 text-xs">
              <div class="flex-1 border-t border-slate-200"></div>
              <span>또는</span>
              <div class="flex-1 border-t border-slate-200"></div>
            </div>
          </div>

          <!-- Demo Buttons -->
          <div class="p-6 pt-4 space-y-2.5">
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="doctor">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              의사 체험하기
            </button>
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="customer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              보호자 체험하기
            </button>
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="admin">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              관리자 체험하기
            </button>
          </div>
        </div>

        <p class="text-center text-xs text-slate-400 mt-4">
          의사: 환자 관리 · 보호자: 기록 조회 · 체험: 둘러보기
        </p>
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

  // Patient search
  container.querySelector('#searchBtn').addEventListener('click', async () => {
    const name = container.querySelector('#searchName').value.trim();
    const birth = container.querySelector('#searchBirth').value;
    const errEl = container.querySelector('#searchError');
    if (!name || !birth) {
      errEl.textContent = '이름과 생년월일을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    const patient = await searchPatientByInfo(name, birth);
    if (patient) {
      setState({ currentPatient: patient });
      navigate('patient-result');
    } else {
      errEl.textContent = '일치하는 환자를 찾을 수 없습니다';
      errEl.classList.remove('hidden');
    }
  });

  // Demo logins
  container.querySelectorAll('.demo-login').forEach(btn => {
    btn.addEventListener('click', async () => {
      const role = btn.dataset.role;
      const user = await login(role);
      setState({ currentUser: user });
      navigate(role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'doctor');
    });
  });

  nav.bind(container);
}
