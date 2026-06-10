import { renderNavbar } from '../components/navbar.js';
import { getState } from '../state.js';
import {
  getStats, getUsers, setUserAdmin, setUserActive,
  getTreatmentTypes, addTreatmentType, deleteTreatmentType,
} from '../data/dataService.js';
import { openModal } from '../components/modal.js';
import { formatDate, escapeHtml } from '../utils.js';

function safeColor(color) {
  return /^#[0-9a-fA-F]{6}$/.test(color) ? color : '#7c3aed';
}

let activeTab = 'users';

export async function renderAdminScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const [stats, users, treatmentTypes] = await Promise.all([
    getStats(), getUsers(), getTreatmentTypes(),
  ]);

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '관리자', user });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="grid grid-cols-2 gap-4">
        ${statCard('전체 환자', stats.totalPatients + '명')}
        ${statCard('의료진', stats.totalStaff + '명')}
      </div>

      <div class="flex gap-2 border-b border-slate-200 overflow-x-auto">
        ${tabBtn('users', '사용자')}
        ${tabBtn('treatments', '치료종류')}
      </div>

      <div id="adminTabContent">
        ${activeTab === 'treatments' ? renderTreatmentTypesTab(treatmentTypes) : renderUsers(users, user)}
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

  // User toggle handlers
  container.querySelectorAll('.toggle-admin-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const makeAdmin = btn.dataset.admin !== '1';
      if (!confirm(makeAdmin ? '이 사용자에게 관리자 권한을 부여하시겠습니까?' : '이 사용자의 관리자 권한을 해제하시겠습니까?')) return;
      await setUserAdmin(btn.dataset.id, makeAdmin);
      await renderAdminScreen(container);
    });
  });
  container.querySelectorAll('.toggle-active-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const activate = btn.dataset.active !== '1';
      if (!confirm(activate ? '이 계정을 활성화하시겠습니까?' : '이 계정을 비활성화하시겠습니까? 해당 사용자는 로그인할 수 없습니다.')) return;
      await setUserActive(btn.dataset.id, activate);
      await renderAdminScreen(container);
    });
  });

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

function statCard(label, value) {
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

function renderUsers(users, me) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이름</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">이메일</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">유형</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">상태</th>
          <th class="px-4 py-3 text-right text-xs font-semibold text-slate-400 uppercase">관리</th>
        </tr></thead>
        <tbody>
          ${users.length === 0 ? '<tr><td colspan="5" class="px-4 py-6 text-center text-sm text-slate-400">등록된 사용자가 없습니다</td></tr>' :
            users.map(u => {
              const isSelf = u.id === me.id;
              return `
              <tr class="border-b border-slate-100 hover:bg-slate-50 ${u.isActive ? '' : 'opacity-50'}">
                <td class="px-4 py-3 text-sm text-slate-800 font-medium">${escapeHtml(u.name) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">${escapeHtml(u.email) || '-'}</td>
                <td class="px-4 py-3 text-sm text-slate-500">
                  ${u.role === 'doctor' ? '의사' : '간호사'}${u.isAdmin ? ' <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-primary-100 text-primary-700">관리자</span>' : ''}
                </td>
                <td class="px-4 py-3 text-sm">
                  ${u.isActive
                    ? '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-emerald-50 text-emerald-700">활성</span>'
                    : '<span class="inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">비활성</span>'}
                </td>
                <td class="px-4 py-3 text-right">
                  <div class="flex justify-end gap-1">
                    ${isSelf ? '' : `
                      <button class="toggle-admin-btn px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${u.isAdmin ? 'text-amber-600 border-amber-200 hover:bg-amber-50' : 'text-primary-600 border-primary-200 hover:bg-primary-50'}" data-id="${u.id}" data-admin="${u.isAdmin ? '1' : '0'}">${u.isAdmin ? '관리자 해제' : '관리자 지정'}</button>
                      <button class="toggle-active-btn px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors ${u.isActive ? 'text-slate-500 border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200' : 'text-emerald-600 border-emerald-200 hover:bg-emerald-50'}" data-id="${u.id}" data-active="${u.isActive ? '1' : '0'}">${u.isActive ? '비활성화' : '활성화'}</button>
                    `}
                  </div>
                </td>
              </tr>`;
            }).join('')}
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
                <td class="px-4 py-3"><span class="inline-block w-4 h-4 rounded-full" style="background:${safeColor(t.color)}"></span></td>
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
