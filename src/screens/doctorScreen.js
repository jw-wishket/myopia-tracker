import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { renderProgressChart, initProgressChart, destroyProgressChart } from '../components/progressChart.js';
import { renderProgressReport } from '../components/progressReport.js';
import { renderTreatmentComparison } from '../components/treatmentComparison.js';
import { renderRateTable } from '../components/rateTable.js';
import { getState, setState } from '../state.js';
import { getPatientById, addTreatment, removeTreatment, updateTreatment, deletePatient, deleteRecord, addNote, deleteNote, exportClinicData, getOverduePatients, getTreatmentTypes, getRecentPatients, searchPatientsLight, getPatientCount, getNotes, addTreatmentType } from '../data/dataService.js';
import { renderPatientNotes } from '../components/patientNotes.js';
import { todayStr, progressLabel, escapeHtml } from '../utils.js';
import { showSyncStatus } from '../components/syncStatus.js';
import { openPrintReport } from '../components/printReport.js';
import { openAddPatientModal, openEditPatientModal, openAddMeasurementModal, openImportCsvModal, openSettingsModal, openShortcutHelpModal } from './doctor/modals.js';
import { exportCSV } from './doctor/exportUtils.js';

let currentSearchQuery = '';
let measurementFilter = 'all';
let currentNotes = [];
let cachedTreatmentTypes = [];

let isLoadingPatients = false;

export async function renderDoctorScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  // Show loading state on first render
  if (!isLoadingPatients) {
    isLoadingPatients = true;
    const nav = renderNavbar({ title: '근시관리 트래커', subtitle: user.clinicName, user });
    container.innerHTML = `
      ${nav.html}
      <div class="flex">
        <main class="flex-1 min-h-[calc(100vh-56px)] flex items-center justify-center">
          <div class="text-slate-400 text-lg">로딩 중...</div>
        </main>
      </div>
    `;
  }

  const isSearching = currentSearchQuery.length > 0;
  let sidebarPatients;
  let totalCount = 0;
  let treatmentTypes;

  if (isSearching) {
    [sidebarPatients, treatmentTypes] = await Promise.all([
      searchPatientsLight(currentSearchQuery, user.clinicId),
      getTreatmentTypes(),
    ]);
  } else {
    [sidebarPatients, treatmentTypes, totalCount] = await Promise.all([
      getRecentPatients(user.clinicId, 10),
      getTreatmentTypes(),
      getPatientCount(user.clinicId),
    ]);
  }
  cachedTreatmentTypes = treatmentTypes;
  isLoadingPatients = false;

  let selectedPatient = getState().currentPatient;
  if (!selectedPatient && sidebarPatients.length > 0) {
    selectedPatient = sidebarPatients[0]?.records
      ? sidebarPatients[0]
      : await getPatientById(sidebarPatients[0].id);
    setState({ currentPatient: selectedPatient });
  }

  const [notes, overdue] = await Promise.all([
    selectedPatient ? getNotes(selectedPatient.id) : Promise.resolve([]),
    getOverduePatients(user.clinicId).catch(() => []),
  ]);
  currentNotes = notes;
  const overduePatients = overdue;

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: user.clinicName, user });
  const sidebar = renderSidebar(sidebarPatients, selectedPatient?.id, { searchQuery: currentSearchQuery, isSearching, totalCount });

  const overdueAlert = overduePatients.length > 0 ? `
    <div class="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
      <div class="text-sm font-medium text-amber-800 mb-2">⚠ 추적 검사 필요 환자 (${overduePatients.length}명)</div>
      <div class="flex flex-wrap gap-2">
        ${overduePatients.map(p => `
          <button class="overdue-patient px-3 py-1.5 bg-white border border-amber-200 rounded-lg text-xs text-amber-700 hover:bg-amber-100" data-id="${p.id}">${escapeHtml(p.name)} (${p.nextVisitDate})</button>
        `).join('')}
      </div>
    </div>
  ` : '';

  container.innerHTML = `
    ${nav.html}
    <div class="flex">
      ${sidebar}
      <main class="flex-1 min-h-[calc(100vh-56px)] has-bottom-nav">
        ${overdueAlert}
        ${renderPatientContent(selectedPatient, sidebarPatients)}
      </main>
    </div>
    ${renderBottomNav('patients')}
  `;

  nav.bind(container);
  bindDoctorEvents(container, user, sidebarPatients, selectedPatient);

  if (selectedPatient) {
    initGrowthChart('growthChart', selectedPatient);
    initProgressChart(selectedPatient, getState().currentChartType || 'AL');
  }

  // Keyboard shortcuts
  const rerender = () => renderDoctorScreen(container);

  function handleKeyboard(e) {
    // Skip if modal is open, input/textarea is focused, or modifier keys
    if (document.querySelector('.modal-backdrop')) return;
    if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName)) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;

    const patient = getState().currentPatient;
    switch (e.key.toLowerCase()) {
      case 'n': // 새 측정
        e.preventDefault();
        if (patient) openAddMeasurementModal(container, patient, rerender);
        break;
      case 'p': // 새 환자
        e.preventDefault();
        openAddPatientModal(container, user, rerender);
        break;
      case 's': // 환자 검색 포커스
        e.preventDefault();
        container.querySelector('#sidebarSearch')?.focus();
        break;
      case 'e': // 환자 수정
        e.preventDefault();
        if (patient) openEditPatientModal(container, patient, rerender);
        break;
      case 'r': // 리포트
        e.preventDefault();
        if (patient) openPrintReport(patient);
        break;
      case '?': // 단축키 도움말
        e.preventDefault();
        openShortcutHelpModal();
        break;
    }
  }

  document.addEventListener('keydown', handleKeyboard);

  return () => {
    destroyChart('growthChart');
    destroyProgressChart();
    document.removeEventListener('keydown', handleKeyboard);
  };
}

function renderPatientContent(patient, patients) {
  if (!patient) {
    return `
      <div class="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <svg class="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <p class="text-lg font-medium">환자를 선택하세요</p>
        <p class="text-sm mt-1">좌측 목록에서 환자를 선택하거나 새 환자를 등록하세요</p>
      </div>
    `;
  }

  const prog = progressLabel(patient.records);

  // Feature 4: rapid progression alert
  const rapidAlert = prog.cls.includes('red') && patient.records?.length >= 2 ? `
    <div class="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
      <svg class="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z"/></svg>
      <div>
        <div class="text-sm font-semibold text-red-800">빠른 근시 진행 감지</div>
        <div class="text-xs text-red-600 mt-1">현재 진행 속도: ${prog.text}. 치료 변경을 검토해주세요.</div>
      </div>
    </div>
  ` : '';

  // Next visit date display
  const nextVisitInfo = patient.nextVisitDate ? `
    <div class="text-xs text-slate-500">다음 방문 예정: ${patient.nextVisitDate}</div>
  ` : '';

  // Mobile patient chips
  const mobileChips = `
    <div class="md:hidden overflow-x-auto px-4 py-3 flex gap-2 border-b border-slate-200 bg-white">
      <input type="text" id="mobileSearch" class="flex-shrink-0 w-32 px-3 py-1.5 border border-slate-200 rounded-full text-xs focus:outline-none" placeholder="검색...">
      ${patients.map(p => `
        <button class="mobile-patient-chip flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${p.id === patient.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}" data-id="${p.id}">${escapeHtml(p.name)}</button>
      `).join('')}
      <button id="mobileAddBtn" class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-primary-600 border border-dashed border-primary-300">+ 추가</button>
    </div>
  `;

  return `
    ${mobileChips}
    <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="flex items-center gap-2">
        <div class="flex-1">${renderPatientInfoBar(patient)}</div>
        <button id="editPatientBtn" class="p-2 border border-slate-200 rounded-lg text-slate-500 hover:bg-slate-50 hover:text-primary-600 transition-colors" title="환자 정보 수정">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
        </button>
      </div>

      ${nextVisitInfo}
      ${rapidAlert}

      <div class="flex items-center justify-between">
        <span class="text-sm ${prog.cls}">${prog.text}</span>
        <div class="flex gap-2">
          <button id="addMeasurementBtn" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            새 측정
          </button>
          <button id="importCsvBtn" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/></svg>
            가져오기
          </button>
          <button id="exportCsvBtn" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">CSV</button>
          <button id="printReportBtn" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">리포트</button>
          <button id="deletePatientBtn" class="px-3 py-2 border border-red-200 rounded-lg text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors flex items-center gap-1.5" title="환자 삭제">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
          </button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
          ${renderStatsCard(patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 이력</h3>
          ${renderTreatmentTags(patient.treatments, { editable: true, treatmentTypes: cachedTreatmentTypes })}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <div class="flex items-center justify-between mb-4">
            <h3 class="text-sm font-semibold text-slate-800">성장 차트</h3>
            <button id="saveGrowthChartBtn" class="px-3 py-1.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 hover:text-primary-600 transition-colors flex items-center gap-1">
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
              이미지 저장
            </button>
          </div>
          ${renderGrowthChart('growthChart', patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">진행 추이</h3>
          ${renderProgressChart()}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">진행 속도 분석</h3>
          ${renderProgressReport(patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 효과 분석</h3>
          ${renderTreatmentComparison(patient)}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">구간별 진행 속도</h3>
        ${renderRateTable(patient.records)}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-800">측정 기록</h3>
          <div class="flex gap-1.5">
            <button class="measurement-filter-btn px-3 py-1 rounded-full text-xs font-medium ${measurementFilter === 'all' ? 'bg-primary-600 text-white' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'}" data-filter="all">전체</button>
            <button class="measurement-filter-btn px-3 py-1 rounded-full text-xs font-medium ${measurementFilter === '1year' ? 'bg-primary-600 text-white' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'}" data-filter="1year">최근 1년</button>
            <button class="measurement-filter-btn px-3 py-1 rounded-full text-xs font-medium ${measurementFilter === '6months' ? 'bg-primary-600 text-white' : 'text-slate-500 border border-slate-200 hover:bg-slate-50'}" data-filter="6months">최근 6개월</button>
          </div>
        </div>
        ${renderMeasurementTable(filterRecords(patient.records), { editable: true })}
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">메모</h3>
        ${renderPatientNotes(currentNotes, true)}
      </div>
    </div>
  `;
}

function filterRecords(records) {
  if (!records || measurementFilter === 'all') return records;
  const now = new Date();
  const months = measurementFilter === '1year' ? 12 : 6;
  const cutoff = new Date(now.getFullYear(), now.getMonth() - months, now.getDate());
  return records.filter(r => new Date(r.date) >= cutoff);
}

function bindDoctorEvents(container, user, patients, selectedPatient) {
  const rerender = () => renderDoctorScreen(container);

  // Sidebar patient selection
  container.querySelectorAll('.sidebar-patient').forEach(btn => {
    btn.addEventListener('click', async () => {
      const patient = await getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        await renderDoctorScreen(container);
      }
    });
  });

  // Mobile patient chips
  container.querySelectorAll('.mobile-patient-chip').forEach(btn => {
    btn.addEventListener('click', async () => {
      const patient = await getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        await renderDoctorScreen(container);
      }
    });
  });

  // Sidebar search with debounce
  let searchTimeout;
  const searchInput = container.querySelector('#sidebarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(async () => {
        currentSearchQuery = e.target.value;
        await renderDoctorScreen(container);
        const newInput = container.querySelector('#sidebarSearch');
        if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
      }, 300);
    });
  }

  // Add patient
  const addBtns = [container.querySelector('#sidebarAddBtn'), container.querySelector('#mobileAddBtn')];
  addBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => openAddPatientModal(container, user, rerender));
  });

  // Add measurement
  const addMeasBtn = container.querySelector('#addMeasurementBtn');
  if (addMeasBtn) {
    addMeasBtn.addEventListener('click', () => openAddMeasurementModal(container, selectedPatient, rerender));
  }

  // Treatment events
  const treatmentToggle = container.querySelector('#treatmentAddToggle');
  if (treatmentToggle) {
    treatmentToggle.addEventListener('click', () => {
      container.querySelector('#treatmentAddForm')?.classList.toggle('hidden');
    });
  }
  const treatmentSelect = container.querySelector('#treatmentTypeSelect');
  const treatmentCustomInput = container.querySelector('#treatmentCustomType');
  if (treatmentSelect && treatmentCustomInput) {
    treatmentSelect.addEventListener('change', () => {
      if (treatmentSelect.value === '__custom__') {
        treatmentCustomInput.classList.remove('hidden');
        treatmentCustomInput.focus();
      } else {
        treatmentCustomInput.classList.add('hidden');
      }
    });
  }
  const treatmentConfirm = container.querySelector('#treatmentAddConfirm');
  if (treatmentConfirm && selectedPatient) {
    treatmentConfirm.addEventListener('click', async () => {
      const select = container.querySelector('#treatmentTypeSelect');
      const customInput = container.querySelector('#treatmentCustomType');
      let type = select.value;

      if (type === '__custom__') {
        type = customInput.value.trim();
        if (!type) return;
        // Add new treatment type to DB for future use
        await addTreatmentType(type);
      }

      const date = container.querySelector('#treatmentDateInput').value;
      if (type && date) {
        treatmentConfirm.disabled = true;
        treatmentConfirm.textContent = '추가 중...';
        showSyncStatus('syncing', '저장 중...');
        await addTreatment(selectedPatient.id, { type, date });
        showSyncStatus('synced', '저장 완료');
        setState({ currentPatient: await getPatientById(selectedPatient.id) });
        await renderDoctorScreen(container);
      }
    });
  }
  container.querySelectorAll('.treatment-remove').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (selectedPatient) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'pointer-events-none');
        await removeTreatment(selectedPatient.id, btn.dataset.id);
        setState({ currentPatient: await getPatientById(selectedPatient.id) });
        await renderDoctorScreen(container);
      }
    });
  });
  container.querySelectorAll('.treatment-end').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (confirm('이 치료를 종료 처리하시겠습니까?')) {
        await updateTreatment(btn.dataset.id, { endDate: todayStr() });
        setState({ currentPatient: await getPatientById(selectedPatient.id) });
        await renderDoctorScreen(container);
      }
    });
  });

  // Delete record
  container.querySelectorAll('.record-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (selectedPatient && confirm('이 측정 기록을 삭제하시겠습니까?')) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'pointer-events-none');
        showSyncStatus('syncing', '삭제 중...');
        await deleteRecord(selectedPatient.id, btn.dataset.id);
        showSyncStatus('synced', '삭제 완료');
        setState({ currentPatient: await getPatientById(selectedPatient.id) });
        await renderDoctorScreen(container);
      }
    });
  });

  // Chart type toggle
  container.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      setState({ currentChartType: type });
      container.querySelectorAll('.chart-type-btn').forEach(b => {
        b.className = b.dataset.type === type
          ? 'chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white'
          : 'chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50';
      });
      initProgressChart(selectedPatient, type);
    });
  });

  // CSV export
  const csvBtn = container.querySelector('#exportCsvBtn');
  if (csvBtn && selectedPatient) {
    csvBtn.addEventListener('click', () => exportCSV(selectedPatient));
  }

  // Print report
  const printBtn = container.querySelector('#printReportBtn');
  if (printBtn && selectedPatient) {
    printBtn.addEventListener('click', () => openPrintReport(selectedPatient));
  }

  // Delete patient
  const deletePatientBtn = container.querySelector('#deletePatientBtn');
  if (deletePatientBtn && selectedPatient) {
    deletePatientBtn.addEventListener('click', async () => {
      if (confirm('이 환자를 삭제하시겠습니까? 모든 측정 및 치료 기록이 함께 삭제됩니다.')) {
        deletePatientBtn.disabled = true;
        deletePatientBtn.classList.add('opacity-50', 'pointer-events-none');
        await deletePatient(selectedPatient.id);
        setState({ currentPatient: null });
        await renderDoctorScreen(container);
      }
    });
  }

  // Edit patient
  const editPatientBtn = container.querySelector('#editPatientBtn');
  if (editPatientBtn && selectedPatient) {
    editPatientBtn.addEventListener('click', () => openEditPatientModal(container, selectedPatient, rerender));
  }

  // Bottom nav tab actions
  container.querySelectorAll('.bottom-nav-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      if (tab === 'patients') {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } else if (tab === 'chart') {
        const chartEl = container.querySelector('#growthChart');
        if (chartEl) chartEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else if (tab === 'add') {
        if (selectedPatient) openAddMeasurementModal(container, selectedPatient, rerender);
      } else if (tab === 'settings') {
        openSettingsModal(container, rerender);
      }
    });
  });

  // Save growth chart as image
  const saveChartBtn = container.querySelector('#saveGrowthChartBtn');
  if (saveChartBtn && selectedPatient) {
    saveChartBtn.addEventListener('click', () => {
      const canvas = document.getElementById('growthChart');
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `${selectedPatient.name}_성장차트.png`;
      link.click();
    });
  }

  // Measurement date filter
  container.querySelectorAll('.measurement-filter-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      measurementFilter = btn.dataset.filter;
      await renderDoctorScreen(container);
    });
  });

  // Notes: add
  const addNoteBtn = container.querySelector('#addNoteBtn');
  if (addNoteBtn && selectedPatient) {
    addNoteBtn.addEventListener('click', async () => {
      const input = container.querySelector('#noteInput');
      const content = input?.value.trim();
      if (!content) return;
      addNoteBtn.disabled = true;
      addNoteBtn.textContent = '추가 중...';
      await addNote(selectedPatient.id, content);
      await renderDoctorScreen(container);
    });
  }

  // Notes: delete
  container.querySelectorAll('.note-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (selectedPatient && confirm('이 메모를 삭제하시겠습니까?')) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'pointer-events-none');
        await deleteNote(btn.dataset.noteId);
        await renderDoctorScreen(container);
      }
    });
  });

  // CSV import
  const importBtn = container.querySelector('#importCsvBtn');
  if (importBtn && selectedPatient) {
    importBtn.addEventListener('click', () => openImportCsvModal(container, selectedPatient, rerender));
  }

  // Feature 1: Full clinic data export
  const exportAllBtn = container.querySelector('#exportAllBtn');
  if (exportAllBtn) {
    exportAllBtn.addEventListener('click', async () => {
      exportAllBtn.textContent = '내보내는 중...';
      exportAllBtn.disabled = true;
      const csv = await exportClinicData(user.clinicId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${user.clinicName || 'clinic'}_전체데이터.csv`;
      link.click();
      exportAllBtn.textContent = '전체 내보내기';
      exportAllBtn.disabled = false;
    });
  }

  // Feature 3: Overdue patient click handlers
  container.querySelectorAll('.overdue-patient').forEach(btn => {
    btn.addEventListener('click', async () => {
      const patient = await getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        await renderDoctorScreen(container);
      }
    });
  });
}
