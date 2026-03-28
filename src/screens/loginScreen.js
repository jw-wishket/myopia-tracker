import { renderNavbar } from '../components/navbar.js';
import { searchPatientByInfo } from '../data/dataService.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';

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

  nav.bind(container);
}
