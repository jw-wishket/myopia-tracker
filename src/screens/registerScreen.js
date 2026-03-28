import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { getClinics, createClinic, registerWithEmail } from '../data/dataService.js';
import { pendingRegistration } from './loginScreen.js';

let step = 1;
let selectedRole = 'customer';
let selectedClinic = null;
let newClinicName = null;
let children = [];

export async function renderRegisterScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '회원가입', showBack: true, backTarget: 'login' });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-lg mx-auto p-4 sm:p-6 space-y-5">
      <div class="flex items-center justify-center gap-2 mb-6">
        ${[1,2,3].map(s => `
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}">${s}</div>
            ${s < 3 ? `<div class="w-8 h-0.5 ${step > s ? 'bg-primary-600' : 'bg-slate-200'}"></div>` : ''}
          </div>
        `).join('')}
      </div>

      ${step === 1 ? renderStep1() : step === 2 ? await renderStep2() : renderStep3()}
    </main>
  `;

  nav.bind(container);
  bindRegisterEvents(container);
}

function renderStep1() {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">계정 유형</h3>
      <p class="text-sm text-slate-500 mb-5">사용 목적에 맞는 유형을 선택하세요</p>
      <div class="grid grid-cols-2 gap-4">
        <label class="cursor-pointer">
          <input type="radio" name="regRole" value="doctor" class="sr-only peer" ${selectedRole === 'doctor' ? 'checked' : ''}>
          <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
            <div class="text-3xl mb-2">🩺</div>
            <div class="font-medium text-slate-800">안과의사</div>
            <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
          </div>
        </label>
        <label class="cursor-pointer">
          <input type="radio" name="regRole" value="customer" class="sr-only peer" ${selectedRole === 'customer' ? 'checked' : ''}>
          <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
            <div class="text-3xl mb-2">👨‍👩‍👧</div>
            <div class="font-medium text-slate-800">보호자</div>
            <div class="text-xs text-slate-500 mt-1">자녀 기록 조회</div>
          </div>
        </label>
      </div>
      <button id="regNext1" class="w-full mt-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">다음</button>
    </div>
  `;
}

async function renderStep2() {
  const clinics = await getClinics();
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">안과 연결</h3>
      <p class="text-sm text-slate-500 mb-4">${selectedRole === 'doctor' ? '소속 안과를 선택하세요' : '다니는 안과를 검색하세요'}</p>
      <input type="text" id="clinicSearch" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 mb-3" placeholder="안과 검색...">
      <div id="clinicList" class="space-y-2">
        ${clinics.map(c => `
          <div class="clinic-item px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:border-primary-400 transition-colors flex items-center justify-between ${selectedClinic?.id === c.id && !newClinicName ? 'border-primary-500 bg-primary-50' : ''}" data-id="${c.id}" data-name="${c.name}">
            <span class="text-sm font-medium text-slate-800">${c.name}</span>
            ${selectedClinic?.id === c.id && !newClinicName ? '<svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="mt-3 border-t border-slate-100 pt-3">
        <p class="text-sm text-slate-500 mb-2">찾는 안과가 없나요?</p>
        <div class="flex gap-2">
          <input type="text" id="newClinicInput" class="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="새 안과 이름 입력" value="${newClinicName || ''}">
          <button id="addNewClinicBtn" class="px-4 py-2.5 border border-dashed border-primary-300 text-primary-600 rounded-xl text-sm font-medium hover:bg-primary-50">등록</button>
        </div>
        ${newClinicName ? `<div class="mt-2 px-4 py-3 rounded-xl border border-primary-500 bg-primary-50 flex items-center justify-between">
          <span class="text-sm font-medium text-slate-800">${newClinicName} <span class="text-xs text-primary-600">(새 안과)</span></span>
          <svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>
        </div>` : ''}
      </div>
      <div class="flex gap-3 mt-5">
        <button id="regBack2" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">이전</button>
        <button id="regNext2" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 ${!selectedClinic && !newClinicName ? 'opacity-50' : ''}">다음</button>
      </div>
    </div>
  `;
}

function renderStep3() {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">${selectedRole === 'customer' ? '자녀 등록' : '의사 정보'}</h3>
      ${selectedRole === 'customer' ? renderChildrenForm() : renderDoctorForm()}
      <div id="regCompleteError" class="hidden text-sm text-red-500 text-center mt-3"></div>
      <div class="flex gap-3 mt-5">
        <button id="regBack3" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">이전</button>
        <button id="regComplete" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">가입 완료</button>
      </div>
    </div>
  `;
}

function renderChildrenForm() {
  const childList = children.map((c, i) => `
    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
      <span class="text-sm text-slate-700">${c.name} · ${c.birthDate}</span>
      <button class="remove-child text-slate-400 hover:text-red-500" data-index="${i}">&times;</button>
    </div>
  `).join('');
  return `
    <div class="space-y-3">
      ${childList}
      <div class="flex gap-2">
        <input type="text" id="childName" class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="자녀 이름">
        <input type="date" id="childBirth" min="1900-01-01" max="2099-12-31" class="px-3 py-2 border border-slate-200 rounded-lg text-sm">
        <button id="addChildBtn" class="px-4 py-2 border border-dashed border-primary-300 text-primary-600 rounded-lg text-sm">추가</button>
      </div>
    </div>
  `;
}

function renderDoctorForm() {
  return `
    <div class="space-y-3">
      <div><label class="block text-sm font-medium text-slate-600 mb-1">의사 이름</label><input type="text" id="doctorNameInput" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="홍길동"></div>
      <div class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">안과의사 가입은 관리자 승인이 필요합니다.</div>
    </div>
  `;
}

function bindRegisterEvents(container) {
  container.querySelector('#regNext1')?.addEventListener('click', async () => {
    selectedRole = container.querySelector('input[name="regRole"]:checked')?.value || 'customer';
    step = 2;
    await renderRegisterScreen(container);
  });
  container.querySelector('#regBack2')?.addEventListener('click', async () => { step = 1; await renderRegisterScreen(container); });
  container.querySelector('#regNext2')?.addEventListener('click', async () => { if (selectedClinic || newClinicName) { step = 3; await renderRegisterScreen(container); } });
  container.querySelector('#regBack3')?.addEventListener('click', async () => { step = 2; await renderRegisterScreen(container); });
  container.querySelector('#regComplete')?.addEventListener('click', async () => {
    const errEl = container.querySelector('#regCompleteError');
    if (errEl) errEl.classList.add('hidden');

    if (!pendingRegistration.email || !pendingRegistration.password) {
      if (errEl) {
        errEl.textContent = '회원가입 정보가 없습니다. 처음부터 다시 시도해주세요.';
        errEl.classList.remove('hidden');
      }
      return;
    }

    try {
      let clinicId = selectedClinic?.id || null;
      let clinicName = selectedClinic?.name || null;
      if (newClinicName) {
        const newClinic = await createClinic(newClinicName);
        if (newClinic) {
          clinicId = newClinic.id;
          clinicName = newClinic.name;
        }
      }

      if (selectedRole === 'doctor') {
        const doctorName = container.querySelector('#doctorNameInput')?.value?.trim() || '';
        if (!doctorName) {
          if (errEl) {
            errEl.textContent = '의사 이름을 입력해주세요';
            errEl.classList.remove('hidden');
          }
          return;
        }
        await registerWithEmail(pendingRegistration.email, pendingRegistration.password, {
          name: doctorName,
          role: 'doctor',
          clinicId,
          clinicName,
        });
        step = 1; selectedClinic = null; newClinicName = null; children = [];
        navigate('pending');
      } else {
        const userName = children[0]?.name || 'User';
        await registerWithEmail(pendingRegistration.email, pendingRegistration.password, {
          name: userName,
          role: 'customer',
          clinicId,
          clinicName,
          children: children,
        });
        step = 1; selectedClinic = null; newClinicName = null; children = [];
        navigate('login');
      }
    } catch (err) {
      if (errEl) {
        errEl.textContent = err.message || '회원가입에 실패했습니다';
        errEl.classList.remove('hidden');
      }
    }
  });
  container.querySelectorAll('.clinic-item').forEach(item => {
    item.addEventListener('click', async () => {
      selectedClinic = { id: item.dataset.id, name: item.dataset.name };
      newClinicName = null;
      await renderRegisterScreen(container);
    });
  });
  container.querySelector('#addNewClinicBtn')?.addEventListener('click', async () => {
    const name = container.querySelector('#newClinicInput')?.value?.trim();
    if (name) {
      newClinicName = name;
      selectedClinic = null;
      await renderRegisterScreen(container);
    }
  });
  container.querySelector('#addChildBtn')?.addEventListener('click', async () => {
    const name = container.querySelector('#childName').value.trim();
    const birth = container.querySelector('#childBirth').value;
    if (name && birth) { children.push({ name, birthDate: birth }); await renderRegisterScreen(container); }
  });
  container.querySelectorAll('.remove-child').forEach(btn => {
    btn.addEventListener('click', async () => { children.splice(parseInt(btn.dataset.index), 1); await renderRegisterScreen(container); });
  });
}
