import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { getState, setState } from './state.js';

import { renderLoginScreen } from './screens/loginScreen.js';
import { renderDoctorScreen } from './screens/doctorScreen.js';
import { renderCustomerScreen } from './screens/customerScreen.js';
import { renderAdminScreen } from './screens/adminScreen.js';
import { renderRegisterScreen } from './screens/registerScreen.js';
import { renderPendingScreen } from './screens/pendingScreen.js';

import { renderNavbar } from './components/navbar.js';
import { renderStatsCard } from './components/statsCard.js';
import { renderTreatmentTags } from './components/treatmentTags.js';
import { renderMeasurementTable } from './components/measurementTable.js';
import { renderPatientInfoBar } from './components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from './components/growthChart.js';

// Public routes
registerRoute('login', renderLoginScreen);
registerRoute('register', renderRegisterScreen);
registerRoute('pending', renderPendingScreen);

// Auth-guarded routes
function authGuard(renderFn) {
  return async (container) => {
    const user = getState().currentUser;
    if (!user) { navigate('login'); return; }
    if (user.pending) { navigate('pending'); return; }
    return await renderFn(container);
  };
}

registerRoute('doctor', authGuard(renderDoctorScreen));
registerRoute('customer', authGuard(renderCustomerScreen));
registerRoute('admin', authGuard(renderAdminScreen));

// Patient search result (no auth needed)
registerRoute('patient-result', (container) => {
  const patient = getState().currentPatient;
  if (!patient) { navigate('login'); return; }
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '환자 기록 조회', showBack: true, backTarget: 'login' });
  container.innerHTML = `
    ${nav.html}
    <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      ${renderPatientInfoBar(patient)}
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
        ${renderStatsCard(patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 기록</h3>
        ${renderTreatmentTags(patient.treatments)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 차트</h3>
        ${renderGrowthChart('searchResultChart', patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
        ${renderMeasurementTable(patient.records)}
      </div>
      <p class="text-center text-xs text-slate-400">더 자세한 기록 관리를 원하시면 회원가입 후 이용해주세요.</p>
    </main>
  `;
  nav.bind(container);
  requestAnimationFrame(() => initGrowthChart('searchResultChart', patient));
  return () => destroyChart('searchResultChart');
});

// Restore session
(async () => {
  const user = await getCurrentUser();
  if (user) {
    setState({ currentUser: user });
    if (user.pending) {
      window.location.hash = 'pending';
    } else {
      const route = user.role === 'admin' ? 'admin' : user.role === 'customer' ? 'customer' : 'doctor';
      window.location.hash = route;
    }
  }
  startRouter(document.getElementById('app'));
  document.getElementById('loadingOverlay')?.classList.add('hidden');
})();
