import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { renderProgressReport } from '../components/progressReport.js';
import { renderRateTable } from '../components/rateTable.js';
import { openModal } from '../components/modal.js';
import { getState, setState } from '../state.js';
import { getPatients, getPatientById, logout, changePassword, updateProfile } from '../data/dataService.js';
import { progressLabel } from '../utils.js';

export async function renderCustomerScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const patients = await getPatients(user.clinicId);
  const children = user.children || [];

  // Match children to patients by name+birthDate
  const matchedPatients = children.map(c => patients.find(p => p.name === c.name && p.birthDate === c.birthDate)).filter(Boolean);
  const selectedPatient = getState().currentPatient || matchedPatients[0] || null;

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '보호자', user });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 has-bottom-nav">
      <div>
        <div class="flex items-center justify-between mb-3">
          <h2 class="text-sm font-semibold text-slate-800">내 자녀</h2>
          <button id="manageChildrenBtn" class="px-3 py-1.5 text-xs font-medium text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50 transition-colors">자녀 관리</button>
        </div>
        <div class="flex gap-3 overflow-x-auto pb-2">
          ${matchedPatients.map(p => `
            <button class="child-select flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${p.id === selectedPatient?.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}" data-id="${p.id}">
              <div class="w-10 h-10 rounded-full ${p.id === selectedPatient?.id ? 'bg-primary-200 text-primary-700' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-sm font-semibold">${p.name.charAt(0)}</div>
              <div class="text-left">
                <div class="text-sm font-medium text-slate-800">${p.name}</div>
                <div class="text-xs text-slate-500">${p.birthDate} · ${p.gender === 'male' ? '남' : '여'}</div>
              </div>
            </button>
          `).join('')}
          ${matchedPatients.length === 0 ? '<p class="text-sm text-slate-400">연결된 자녀가 없습니다</p>' : ''}
        </div>
      </div>

      ${selectedPatient ? renderChildDetail(selectedPatient) : '<p class="text-center text-slate-400 py-8">자녀를 선택하세요</p>'}
    </main>
    ${renderBottomNav('patients')}
  `;

  nav.bind(container);

  // Manage children button
  const manageBtn = container.querySelector('#manageChildrenBtn');
  if (manageBtn) {
    manageBtn.addEventListener('click', () => openChildrenManagementModal(container, user, children));
  }

  // Child selection
  container.querySelectorAll('.child-select').forEach(btn => {
    btn.addEventListener('click', async () => {
      const patient = await getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        await renderCustomerScreen(container);
      }
    });
  });

  // Save growth chart as image
  const saveChartBtn = container.querySelector('.save-customer-chart-btn');
  if (saveChartBtn) {
    saveChartBtn.addEventListener('click', () => {
      const canvas = document.getElementById('customerGrowthChart');
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${saveChartBtn.dataset.patientName}_성장차트.png`;
      link.click();
    });
  }

  // Bottom nav tab actions
  container.querySelectorAll('.bottom-nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'patients') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (tab === 'chart') {
        const chartEl = container.querySelector('#customerGrowthChart');
        if (chartEl) chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (tab === 'settings') {
        openCustomerSettingsModal(container);
      }
    });
  });

  if (selectedPatient) {
    requestAnimationFrame(() => {
      initGrowthChart('customerGrowthChart', selectedPatient);
    });
  }

  return () => destroyChart('customerGrowthChart');
}

function renderChildDetail(patient) {
  const prog = progressLabel(patient.records);
  return `
    ${renderPatientInfoBar(patient)}

    <div class="flex items-center justify-between">
      <span class="text-sm ${prog.cls}">${prog.text}</span>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
      ${renderStatsCard(patient)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 현황</h3>
      ${renderTreatmentTags(patient.treatments)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-sm font-semibold text-slate-800">성장 추이</h3>
        <button class="save-customer-chart-btn px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary-600 transition-colors flex items-center gap-1" data-patient-name="${patient.name}">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
          이미지 저장
        </button>
      </div>
      ${renderGrowthChart('customerGrowthChart', patient)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">진행 속도 분석</h3>
      ${renderProgressReport(patient)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">구간별 진행 속도</h3>
      ${renderRateTable(patient.records)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
      ${renderMeasurementTable(patient.records)}
      <p class="text-xs text-slate-400 mt-3 text-center">측정 데이터는 담당 안과에서 입력합니다</p>
    </div>
  `;
}

function openChildrenManagementModal(container, user, children) {
  const childrenCopy = children.map(c => ({ ...c }));

  function renderChildrenList() {
    return childrenCopy.map((c, i) => `
      <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
        <div>
          <div class="text-sm font-medium text-slate-800">${c.name}</div>
          <div class="text-xs text-slate-500">${c.birthDate}</div>
        </div>
        <div class="flex gap-2">
          <button class="child-edit-btn px-2 py-1 text-xs text-primary-600 border border-primary-200 rounded-lg hover:bg-primary-50" data-index="${i}">수정</button>
          <button class="child-delete-btn px-2 py-1 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50" data-index="${i}">삭제</button>
        </div>
      </div>
    `).join('');
  }

  const modal = openModal('자녀 관리', `
    <div class="space-y-4">
      <div id="childrenListArea" class="space-y-2">
        ${childrenCopy.length > 0 ? renderChildrenList() : '<p class="text-sm text-slate-400 text-center py-2">등록된 자녀가 없습니다</p>'}
      </div>
      <div class="border-t border-slate-200 pt-4">
        <h4 class="text-sm font-semibold text-slate-700 mb-2">자녀 추가</h4>
        <div class="space-y-2">
          <input type="text" id="newChildName" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="이름">
          <input type="date" id="newChildBirth" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400">
          <button id="addChildBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">추가</button>
        </div>
      </div>
      <div id="childMgmtMsg" class="text-xs hidden text-center"></div>
      <button id="childMgmtCloseBtn" class="w-full py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">닫기</button>
    </div>
  `);

  function rebindChildEvents() {
    const listArea = modal.element.querySelector('#childrenListArea');
    listArea.innerHTML = childrenCopy.length > 0 ? renderChildrenList() : '<p class="text-sm text-slate-400 text-center py-2">등록된 자녀가 없습니다</p>';

    listArea.querySelectorAll('.child-delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        const idx = parseInt(btn.dataset.index);
        childrenCopy.splice(idx, 1);
        const ok = await updateProfile({ children: childrenCopy });
        if (ok) {
          const updatedUser = { ...getState().currentUser, children: [...childrenCopy] };
          setState({ currentUser: updatedUser, currentPatient: null });
          rebindChildEvents();
        }
      });
    });

    listArea.querySelectorAll('.child-edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.index);
        const child = childrenCopy[idx];
        const name = prompt('이름:', child.name);
        const birthDate = prompt('생년월일 (YYYY-MM-DD):', child.birthDate);
        if (name && birthDate) {
          childrenCopy[idx] = { name: name.trim(), birthDate };
          updateProfile({ children: childrenCopy }).then(ok => {
            if (ok) {
              const updatedUser = { ...getState().currentUser, children: [...childrenCopy] };
              setState({ currentUser: updatedUser, currentPatient: null });
              rebindChildEvents();
            }
          });
        }
      });
    });
  }

  rebindChildEvents();

  modal.element.querySelector('#addChildBtn').addEventListener('click', async () => {
    const nameInput = modal.element.querySelector('#newChildName');
    const birthInput = modal.element.querySelector('#newChildBirth');
    const name = nameInput.value.trim();
    const birthDate = birthInput.value;
    const msgEl = modal.element.querySelector('#childMgmtMsg');

    if (!name || !birthDate) {
      msgEl.textContent = '이름과 생년월일을 모두 입력하세요.';
      msgEl.className = 'text-xs text-center text-red-500';
      return;
    }

    childrenCopy.push({ name, birthDate });
    const ok = await updateProfile({ children: childrenCopy });
    if (ok) {
      const updatedUser = { ...getState().currentUser, children: [...childrenCopy] };
      setState({ currentUser: updatedUser, currentPatient: null });
      nameInput.value = '';
      birthInput.value = '';
      msgEl.textContent = '추가 완료';
      msgEl.className = 'text-xs text-center text-emerald-600';
      rebindChildEvents();
    } else {
      childrenCopy.pop();
      msgEl.textContent = '저장 실패';
      msgEl.className = 'text-xs text-center text-red-500';
    }
  });

  modal.element.querySelector('#childMgmtCloseBtn').addEventListener('click', () => {
    modal.close();
    renderCustomerScreen(container);
  });
}

function openCustomerSettingsModal(container) {
  const modal = openModal('설정', `
    <div class="space-y-4">
      <div class="p-4 bg-slate-50 rounded-xl">
        <h4 class="text-sm font-semibold text-slate-700 mb-1">비밀번호 변경</h4>
        <p class="text-xs text-slate-500 mb-3">새 비밀번호를 입력하세요 (8자 이상).</p>
        <div class="space-y-2">
          <input type="password" id="custNewPw" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="새 비밀번호">
          <input type="password" id="custConfirmPw" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="비밀번호 확인">
          <div id="custPwMsg" class="text-xs hidden"></div>
          <button id="custChangePwBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">변경</button>
        </div>
      </div>
      <div class="p-4 bg-slate-50 rounded-xl">
        <h4 class="text-sm font-semibold text-slate-700 mb-1">계정</h4>
        <p class="text-xs text-slate-500 mb-3">현재 로그인된 계정에서 로그아웃합니다.</p>
        <button id="custLogoutBtn" class="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-white transition-colors">로그아웃</button>
      </div>
      <button id="custCloseBtn" class="w-full py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">닫기</button>
    </div>
  `);

  modal.element.querySelector('#custCloseBtn').addEventListener('click', modal.close);

  modal.element.querySelector('#custChangePwBtn').addEventListener('click', async () => {
    const newPw = modal.element.querySelector('#custNewPw').value;
    const confirmPw = modal.element.querySelector('#custConfirmPw').value;
    const msgEl = modal.element.querySelector('#custPwMsg');
    msgEl.classList.remove('hidden', 'text-red-500', 'text-emerald-600');

    if (!newPw || newPw.length < 8) {
      msgEl.textContent = '비밀번호는 8자 이상이어야 합니다.';
      msgEl.classList.add('text-red-500');
      msgEl.classList.remove('hidden');
      return;
    }
    if (newPw !== confirmPw) {
      msgEl.textContent = '비밀번호가 일치하지 않습니다.';
      msgEl.classList.add('text-red-500');
      msgEl.classList.remove('hidden');
      return;
    }

    const btn = modal.element.querySelector('#custChangePwBtn');
    btn.disabled = true;
    btn.textContent = '변경 중...';

    try {
      await changePassword(newPw);
      msgEl.textContent = '비밀번호가 성공적으로 변경되었습니다.';
      msgEl.classList.add('text-emerald-600');
      msgEl.classList.remove('hidden');
      modal.element.querySelector('#custNewPw').value = '';
      modal.element.querySelector('#custConfirmPw').value = '';
    } catch (err) {
      msgEl.textContent = '변경 실패: ' + (err.message || '알 수 없는 오류');
      msgEl.classList.add('text-red-500');
      msgEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = '변경';
    }
  });

  modal.element.querySelector('#custLogoutBtn').addEventListener('click', async () => {
    await logout();
    setState({ currentUser: null, currentPatient: null });
    modal.close();
    window.location.hash = '#login';
  });
}
