import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { getState, setState } from '../state.js';
import { getPatients, getPatientById } from '../data/dataService.js';
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
        <h2 class="text-sm font-semibold text-slate-800 mb-3">내 자녀</h2>
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
      <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
      ${renderMeasurementTable(patient.records)}
      <p class="text-xs text-slate-400 mt-3 text-center">측정 데이터는 담당 안과에서 입력합니다</p>
    </div>
  `;
}
