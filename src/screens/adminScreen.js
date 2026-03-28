import { renderNavbar } from '../components/navbar.js';
import { getState } from '../state.js';
import {
  getStats, getApprovalRequests, approveRequest, rejectRequest,
  getClinics, getDoctors, getAllPatients,
  adminCreateClinic, updateClinic, deleteClinic, revokeDoctor, deactivateUser,
  getTreatmentTypes, addTreatmentType, updateTreatmentType, deleteTreatmentType,
} from '../data/dataService.js';
import { openModal } from '../components/modal.js';
import { formatDate, escapeHtml } from '../utils.js';

let activeTab = 'approvals';

export async function renderAdminScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const [stats, requests, clinics, doctors, allPatients, treatmentTypes] = await Promise.all([
    getStats(), getApprovalRequests(), getClinics(), getDoctors(), getAllPatients(), getTreatmentTypes(),
  ]);

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '관리자', user });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${statCard('전체 환자', stats.totalPatients + '명', 'blue')}
        ${statCard('등록 의사', stats.totalDoctors + '명', 'emerald')}
        ${statCard('안과', stats.totalClinics + '곳', 'purple')}
        ${statCard('승인 대기', stats.pendingRequests + '건', stats.pendingRequests > 0 ? 'amber' : 'slate')}
      </div>

      <div class="flex gap-2 border-b border-slate-200 pb-0 overflow-x-auto">
        ${tabBtn('approvals', '승인 관리', requests.length)}
        ${tabBtn('clinics', '안과 관리')}
        ${tabBtn('doctors', '의사 목록')}
        ${tabBtn('patients', '환자 목록')}
        ${tabBtn('treatments', '치료 관리')}
      </div>

      <div id="adminTabContent">
        ${activeTab === 'approvals' ? renderApprovals(requests) :
          activeTab === 'clinics' ? renderClinics(clinics, doctors, allPatients) :
          activeTab === 'doctors' ? renderDoctors(doctors) :
          activeTab === 'treatments' ? renderTreatmentTypesTab(treatmentTypes) :
          renderPatientsList(allPatients, clinics)}
      </div>
    </main>
  `;

  nav.bind(container);

  // Tab switching
  container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      activeTab = btn.dataset.tab;
      await renderAdminScreen(container);
    });
  });

  // Approval buttons
  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await approveRequest(btn.dataset.id);
      await renderAdminScreen(container);
    });
  });
  container.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      await rejectRequest(btn.dataset.id);
      await renderAdminScreen(container);
    });
  });

  // Clinic management buttons
  container.querySelector('#addClinicBtn')?.addEventListener('click', () => {
    const modal = openModal('새 안과 등록', `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-700 mb-1">안과명</label>
          <input id="newClinicName" type="text" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" placeholder="안과명을 입력하세요" />
        </div>
        <div class="flex justify-end gap-2">
          <button id="modalCancelBtn" class="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
          <button id="modalConfirmBtn" class="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">등록</button>
        </div>
      </div>
    `);
    modal.element.querySelector('#modalCancelBtn').addEventListener('click', () => modal.close());
    modal.element.querySelector('#modalConfirmBtn').addEventListener('click', async () => {
      const name = modal.element.querySelector('#newClinicName').value.trim();
      if (!name) return;
      await adminCreateClinic(name);
      modal.close();
      await renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.edit-clinic-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const clinicId = btn.dataset.id;
      const currentName = btn.dataset.name;
      const modal = openModal('안과명 수정', `
        <div class="space-y-4">
          <div>
            <label class="block text-sm font-medium text-slate-700 mb-1">안과명</label>
            <input id="editClinicName" type="text" value="${currentName}" class="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          <div class="flex justify-end gap-2">
            <button id="modalCancelBtn" class="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">취소</button>
            <button id="modalConfirmBtn" class="px-4 py-2 text-sm text-white bg-primary-600 rounded-lg hover:bg-primary-700">저장</button>
          </div>
        </div>
      `);
      modal.element.querySelector('#modalCancelBtn').addEventListener('click', () => modal.close());
      modal.element.querySelector('#modalConfirmBtn').addEventListener('click', async () => {
        const newName = modal.element.querySelector('#editClinicName').value.trim();
        if (!newName) return;
        await updateClinic(clinicId, newName);
        modal.close();
        await renderAdminScreen(container);
      });
    });
  });

  container.querySelectorAll('.delete-clinic-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 안과를 비활성화하시겠습니까? 더 이상 검색 및 선택에 표시되지 않습니다.')) return;
      await deleteClinic(btn.dataset.id);
      await renderAdminScreen(container);
    });
  });

  // Doctor revoke buttons
  container.querySelectorAll('.revoke-doctor-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 의사의 승인을 취소하시겠습니까?')) return;
      await revokeDoctor(btn.dataset.id);
      await renderAdminScreen(container);
    });
  });

  // Deactivate buttons
  container.querySelectorAll('.deactivate-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('이 계정을 비활성화하시겠습니까? 해당 사용자는 더 이상 로그인할 수 없습니다.')) {
        await deactivateUser(btn.dataset.id);
        await renderAdminScreen(container);
      }
    });
  });

  // Patient search
  const searchInput = container.querySelector('#patientSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const query = searchInput.value.trim().toLowerCase();
      const rows = container.querySelectorAll('.patient-row');
      rows.forEach(row => {
        const name = row.dataset.name?.toLowerCase() || '';
        row.style.display = name.includes(query) ? '' : 'none';
      });
    });
  }

  // Treatment type management
  container.querySelector('#addTreatmentTypeBtn')?.addEventListener('click', () => {
    const modal = openModal('치료 종류 추가', `
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1.5">치료명</label>
          <input type="text" id="newTypeName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="예: 아트로핀 0.02%">
        </div>
        <div>
          <label class="block text-sm font-medium text-slate-600 mb-1.5">색상</label>
          <input type="color" id="newTypeColor" class="w-full h-10 rounded-xl border border-slate-200 cursor-pointer" value="#7c3aed">
        </div>
        <button id="confirmAddType" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">추가</button>
      </div>
    `);
    modal.element.querySelector('#confirmAddType').addEventListener('click', async () => {
      const name = modal.element.querySelector('#newTypeName').value.trim();
      const color = modal.element.querySelector('#newTypeColor').value;
      if (!name) return;
      await addTreatmentType(name, color);
      modal.close();
      await renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.delete-treatment-type').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (!confirm('이 치료 종류를 삭제하시겠습니까?')) return;
      await deleteTreatmentType(btn.dataset.id);
      await renderAdminScreen(container);
    });
  });
}

function statCard(label, value, color) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">${label}</div>
      <div class="text-2xl font-semibold text-slate-800">${value}</div>
    </div>
  `;
}

function tabBtn(id, label, count) {
  const isActive = activeTab === id;
  return `
    <button class="admin-tab px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}" data-tab="${id}">
      ${label}${count ? ` <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}">${count}</span>` : ''}
    </button>
  `;
}

function renderApprovals(requests) {
  if (requests.length === 0) return '<div class="text-center py-8 text-slate-400">대기 중인 승인 요청이 없습니다</div>';
  return `
    <div class="space-y-3">
      ${requests.map(r => `
        <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">${escapeHtml(r.name.charAt(0))}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-800">${escapeHtml(r.name)}</div>
            <div class="text-sm text-slate-500">${escapeHtml(r.email)} · ${escapeHtml(r.clinicName)} · ${formatDate(r.createdAt)}</div>
          </div>
          <div class="flex gap-2">
            <button class="approve-btn px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors" data-id="${r.id}">승인</button>
            <button class="reject-btn px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors" data-id="${r.id}">거부</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderClinics(clinics, doctors, allPatients) {
  return `
    <div class="flex justify-end mb-3">
      <button id="addClinicBtn" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
        새 안과 등록
      </button>
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">안과명</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">등록 의사 수</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">환자 수</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">관리</th>
        </tr></thead>
        <tbody>
          ${clinics.length === 0 ? '<tr><td colspan="4" class="px-4 py-6 text-center text-sm text-slate-400">등록된 안과가 없습니다</td></tr>' :
            clinics.map(c => {
              const doctorCount = doctors.filter(d => d.clinicId === c.id).length;
              const patientCount = allPatients.filter(p => p.clinicId === c.id).length;
              return `
                <tr class="border-b border-slate-100 hover:bg-slate-50">
                  <td class="px-4 py-3 text-sm text-slate-800">${escapeHtml(c.name)}</td>
                  <td class="px-4 py-3 text-sm text-slate-500">${doctorCount}명</td>
                  <td class="px-4 py-3 text-sm text-slate-500">${patientCount}명</td>
                  <td class="px-4 py-3 text-right">
                    <div class="flex justify-end gap-1">
                      <button class="edit-clinic-btn p-1.5 text-slate-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors" data-id="${c.id}" data-name="${escapeHtml(c.name)}" title="수정">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                      </button>
                      <button class="delete-clinic-btn p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" data-id="${c.id}" title="비활성화">
                        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderDoctors(doctors) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이름</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이메일</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">소속 안과</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">상태</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">관리</th>
        </tr></thead>
        <tbody>
          ${doctors.length === 0 ? '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-400">등록된 의사가 없습니다</td></tr>' :
            doctors.map(d => `
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-4 py-3 text-sm text-slate-800 font-medium">${escapeHtml(d.name) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(d.email) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(d.clinicName) || '-'}</td>
                <td class="px-4 py-3 text-sm">
                  ${d.approved
                    ? '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">승인됨</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-amber-50 text-amber-700">미승인</span>'}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    ${d.approved
                      ? `<button class="revoke-doctor-btn px-3 py-1.5 text-xs font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors" data-id="${d.id}">승인 취소</button>`
                      : ''}
                    <button class="deactivate-btn px-3 py-1.5 text-xs font-medium border border-slate-200 text-slate-500 rounded-lg hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors" data-id="${d.id}">비활성화</button>
                  </div>
                </td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderPatientsList(allPatients, clinics) {
  const clinicMap = Object.fromEntries(clinics.map(c => [c.id, c.name]));
  return `
    <div class="mb-3">
      <input id="patientSearchInput" type="text" placeholder="환자 이름으로 검색..." class="w-full sm:w-72 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
    </div>
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이름</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">생년월일</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">성별</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">관리번호</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">소속 안과</th>
        </tr></thead>
        <tbody>
          ${allPatients.length === 0 ? '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-400">등록된 환자가 없습니다</td></tr>' :
            allPatients.map(p => `
              <tr class="patient-row border-b border-slate-100 hover:bg-slate-50" data-name="${escapeHtml(p.name)}">
                <td class="px-4 py-3 text-sm text-slate-800 font-medium">${escapeHtml(p.name)}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${formatDate(p.birthDate)}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${p.gender === 'male' ? '남' : '여'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(p.customRef) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(clinicMap[p.clinicId]) || '-'}</td>
              </tr>
            `).join('')}
        </tbody>
      </table>
    </div>
  `;
}

function renderTreatmentTypesTab(types) {
  return `
    <div class="space-y-3">
      <div class="flex justify-end mb-2">
        <button id="addTreatmentTypeBtn" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          치료 종류 추가
        </button>
      </div>
      <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table class="w-full">
          <thead><tr class="border-b border-slate-200">
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">색상</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">치료명</th>
            <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase w-24">관리</th>
          </tr></thead>
          <tbody>
            ${types.length === 0 ? '<tr><td colspan="3" class="px-4 py-6 text-center text-sm text-slate-400">등록된 치료 종류가 없습니다</td></tr>' :
              types.map(t => `
              <tr class="border-b border-slate-100 hover:bg-slate-50">
                <td class="px-4 py-3"><span class="inline-block w-4 h-4 rounded-full" style="background:${t.color}"></span></td>
                <td class="px-4 py-3 text-sm text-slate-800">${escapeHtml(t.name)}</td>
                <td class="px-4 py-3">
                  <button class="delete-treatment-type text-slate-300 hover:text-red-500 transition-colors" data-id="${t.id}">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                  </button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}
