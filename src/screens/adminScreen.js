import { renderNavbar } from '../components/navbar.js';
import { getState } from '../state.js';
import { getStats, getApprovalRequests, approveRequest, rejectRequest, getClinics } from '../data/dataService.js';
import { formatDate } from '../utils.js';

let activeTab = 'approvals';

export function renderAdminScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const stats = getStats();
  const requests = getApprovalRequests();
  const clinics = getClinics();
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

      <div class="flex gap-2 border-b border-slate-200 pb-0">
        ${tabBtn('approvals', '승인 관리', requests.length)}
        ${tabBtn('clinics', '안과 관리')}
      </div>

      <div id="adminTabContent">
        ${activeTab === 'approvals' ? renderApprovals(requests) : renderClinics(clinics)}
      </div>
    </main>
  `;

  nav.bind(container);

  container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      approveRequest(btn.dataset.id);
      renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rejectRequest(btn.dataset.id);
      renderAdminScreen(container);
    });
  });
}

function statCard(label, value, color) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-50 text-slate-600',
  };
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
    <button class="admin-tab px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}" data-tab="${id}">
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
          <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">${r.name.charAt(0)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-800">${r.name}</div>
            <div class="text-sm text-slate-500">${r.email} · ${r.clinicName} · ${formatDate(r.createdAt)}</div>
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

function renderClinics(clinics) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">안과명</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">등록자</th>
        </tr></thead>
        <tbody>
          ${clinics.map(c => `<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="px-4 py-3 text-sm text-slate-800">${c.name}</td><td class="px-4 py-3 text-sm text-slate-500">${c.createdBy}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}
