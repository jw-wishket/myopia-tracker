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
import { openModal } from '../components/modal.js';
import { getState, setState } from '../state.js';
import { getPatients, searchPatients, getPatientById, addPatient, addMeasurement, deleteRecord, addTreatment, removeTreatment, updateTreatment, deletePatient, updatePatient, logout, resetData, changePassword, getNotes, addNote, deleteNote, importMeasurements, exportClinicData, getOverduePatients, getTreatmentTypes, addTreatmentType, getRecentPatients, searchPatientsLight, getPatientCount } from '../data/dataService.js';
import { renderPatientNotes } from '../components/patientNotes.js';
import { todayStr, calcAge, progressLabel, escapeHtml } from '../utils.js';
import { showSyncStatus } from '../components/syncStatus.js';
import { openPrintReport } from '../components/printReport.js';

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

  if (selectedPatient) {
    currentNotes = await getNotes(selectedPatient.id);
  } else {
    currentNotes = [];
  }

  // Feature 3: get overdue patients
  let overduePatients = [];
  try {
    overduePatients = await getOverduePatients(user.clinicId);
  } catch (e) { /* column may not exist yet */ }

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

  return () => {
    destroyChart('growthChart');
    destroyProgressChart();
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
    if (btn) btn.addEventListener('click', () => openAddPatientModal(container, user));
  });

  // Add measurement
  const addMeasBtn = container.querySelector('#addMeasurementBtn');
  if (addMeasBtn) {
    addMeasBtn.addEventListener('click', () => openAddMeasurementModal(container, selectedPatient));
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
    editPatientBtn.addEventListener('click', () => openEditPatientModal(container, selectedPatient));
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
        if (selectedPatient) openAddMeasurementModal(container, selectedPatient);
      } else if (tab === 'settings') {
        openSettingsModal(container);
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
    importBtn.addEventListener('click', () => openImportCsvModal(container, selectedPatient));
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

function openAddPatientModal(container, user) {
  const modal = openModal('새 환자 등록', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
        <input type="text" id="newPatientName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="홍길동">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
        <input type="date" id="newPatientBirth" min="1900-01-01" max="2099-12-31" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">성별</label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input type="radio" name="gender" value="male" class="sr-only" checked> <span class="text-sm font-medium">남</span>
          </label>
          <label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input type="radio" name="gender" value="female" class="sr-only"> <span class="text-sm font-medium">여</span>
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">관리번호 <span class="text-slate-400 font-normal">(선택)</span></label>
        <input type="text" id="newPatientCustomRef" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="병원 내부 관리번호">
      </div>
      <div class="flex gap-3 pt-2">
        <button id="cancelAddPatient" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
        <button id="confirmAddPatient" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">등록</button>
      </div>
    </div>
  `);

  modal.element.querySelector('#cancelAddPatient').addEventListener('click', modal.close);
  modal.element.querySelector('#confirmAddPatient').addEventListener('click', async () => {
    const name = modal.element.querySelector('#newPatientName').value.trim();
    const birthDate = modal.element.querySelector('#newPatientBirth').value;
    const gender = modal.element.querySelector('input[name="gender"]:checked').value;
    const customRef = modal.element.querySelector('#newPatientCustomRef').value.trim();
    if (!name || !birthDate) return;
    showSyncStatus('syncing', '등록 중...');
    const result = await addPatient({ name, birthDate, gender, clinicId: user.clinicId, customRef });
    if (result?.error) {
      showSyncStatus('error', '등록 실패');
      alert(result.error);
      return;
    }
    if (result) {
      showSyncStatus('synced', '등록 완료');
    } else {
      showSyncStatus('error', '저장 실패');
    }
    setState({ currentPatient: result });
    modal.close();
    await renderDoctorScreen(container);
  });
}

function openEditPatientModal(container, patient) {
  if (!patient) return;
  const modal = openModal('환자 정보 수정', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
        <input type="text" id="editPatientName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${escapeHtml(patient.name)}">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
        <input type="date" id="editPatientBirth" min="1900-01-01" max="2099-12-31" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${patient.birthDate}">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">관리번호 <span class="text-slate-400 font-normal">(선택)</span></label>
        <input type="text" id="editPatientCustomRef" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${escapeHtml(patient.customRef)}" placeholder="병원 내부 관리번호">
      </div>
      <div class="flex gap-3 pt-2">
        <button id="cancelEditPatient" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
        <button id="confirmEditPatient" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">저장</button>
      </div>
    </div>
  `);

  modal.element.querySelector('#cancelEditPatient').addEventListener('click', modal.close);
  modal.element.querySelector('#confirmEditPatient').addEventListener('click', async () => {
    const name = modal.element.querySelector('#editPatientName').value.trim();
    const birthDate = modal.element.querySelector('#editPatientBirth').value;
    const customRef = modal.element.querySelector('#editPatientCustomRef').value.trim();
    if (!name || !birthDate) return;

    const saveBtn = modal.element.querySelector('#confirmEditPatient');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    const result = await updatePatient(patient.id, { name, birthDate, customRef });
    if (result && result.error) {
      alert(result.error);
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    } else if (result) {
      setState({ currentPatient: await getPatientById(patient.id) });
      modal.close();
      await renderDoctorScreen(container);
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  });
}

function openAddMeasurementModal(container, patient) {
  if (!patient) return;
  const lastRecord = patient.records?.length > 0 ? patient.records[patient.records.length - 1] : null;
  const lastRecordHtml = lastRecord ? `
    <div class="px-3 py-2 bg-slate-50 rounded-lg text-xs text-slate-500 mt-2">
      최근 측정 (${lastRecord.date}): OD ${lastRecord.odAL?.toFixed(2)}mm / OS ${lastRecord.osAL?.toFixed(2)}mm
    </div>
  ` : '';
  const modal = openModal('측정 입력', `
    <div class="space-y-4">
      <div class="px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700 font-medium">${escapeHtml(patient.name)} · ${calcAge(patient.birthDate, new Date())}세</div>
      ${lastRecordHtml}
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">측정일</label>
        <input type="date" id="measDate" min="1900-01-01" max="2099-12-31" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${todayStr()}">
      </div>
      <div class="rounded-xl border-2 border-od/20 p-4 space-y-3">
        <div class="text-xs font-semibold text-od uppercase tracking-wide">우안 (OD)</div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs text-slate-500 mb-1">안축장 (mm)</label><input type="number" step="0.01" id="measOdAL" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-od" placeholder="23.50"></div>
          <div><label class="block text-xs text-slate-500 mb-1">굴절력 (D)</label><input type="number" step="0.25" id="measOdSE" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-od" placeholder="-1.50"></div>
        </div>
      </div>
      <div class="rounded-xl border-2 border-os/20 p-4 space-y-3">
        <div class="text-xs font-semibold text-os uppercase tracking-wide">좌안 (OS)</div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs text-slate-500 mb-1">안축장 (mm)</label><input type="number" step="0.01" id="measOsAL" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-os" placeholder="23.45"></div>
          <div><label class="block text-xs text-slate-500 mb-1">굴절력 (D)</label><input type="number" step="0.25" id="measOsSE" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-os" placeholder="-1.25"></div>
        </div>
      </div>
      <button id="confirmMeasurement" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">측정 저장</button>
    </div>
  `);

  modal.element.querySelector('#confirmMeasurement').addEventListener('click', async () => {
    const date = modal.element.querySelector('#measDate').value;
    const odAL = parseFloat(modal.element.querySelector('#measOdAL').value);
    const osAL = parseFloat(modal.element.querySelector('#measOsAL').value);
    const odSE = parseFloat(modal.element.querySelector('#measOdSE').value);
    const osSE = parseFloat(modal.element.querySelector('#measOsSE').value);
    if (!date || isNaN(odAL) || isNaN(osAL)) return;

    // Validate ranges
    const AL_MIN = 18, AL_MAX = 32;
    const SE_MIN = -30, SE_MAX = 8;
    const warnings = [];
    if (odAL < AL_MIN || odAL > AL_MAX) warnings.push(`OD AL (${odAL}mm)이 정상 범위(${AL_MIN}~${AL_MAX}mm)를 벗어났습니다`);
    if (osAL < AL_MIN || osAL > AL_MAX) warnings.push(`OS AL (${osAL}mm)이 정상 범위(${AL_MIN}~${AL_MAX}mm)를 벗어났습니다`);
    if (!isNaN(odSE) && (odSE < SE_MIN || odSE > SE_MAX)) warnings.push(`OD SE (${odSE}D)가 정상 범위(${SE_MIN}~${SE_MAX}D)를 벗어났습니다`);
    if (!isNaN(osSE) && (osSE < SE_MIN || osSE > SE_MAX)) warnings.push(`OS SE (${osSE}D)가 정상 범위(${SE_MIN}~${SE_MAX}D)를 벗어났습니다`);

    if (warnings.length > 0) {
      if (!confirm('⚠️ 경고:\n' + warnings.join('\n') + '\n\n계속 저장하시겠습니까?')) return;
    }

    // Check duplicate date
    const existingDates = patient.records?.map(r => r.date) || [];
    if (existingDates.includes(date)) {
      if (!confirm('같은 날짜의 측정 기록이 이미 존재합니다. 추가하시겠습니까?')) return;
    }

    const btn = modal.element.querySelector('#confirmMeasurement');
    btn.disabled = true;
    btn.textContent = '저장 중...';
    showSyncStatus('syncing', '저장 중...');

    const result = await addMeasurement(patient.id, { date, odAL, osAL, odSE: isNaN(odSE) ? null : odSE, osSE: isNaN(osSE) ? null : osSE });
    if (result) {
      showSyncStatus('synced', '저장 완료');
      // Feature 3: Auto-set next visit date (default 6 months)
      try {
        const nextDate = new Date(date);
        nextDate.setMonth(nextDate.getMonth() + (patient.followUpMonths || 6));
        const nextVisitStr = nextDate.toISOString().split('T')[0];
        await updatePatient(patient.id, { nextVisitDate: nextVisitStr });
      } catch (e) { /* ignore if column doesn't exist yet */ }
    } else {
      showSyncStatus('error', '저장 실패');
    }
    setState({ currentPatient: await getPatientById(patient.id) });
    modal.close();
    await renderDoctorScreen(container);
  });
}

function exportCSV(patient) {
  if (!patient || !patient.records) return;
  const header = '날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct\n';
  const rows = patient.records.map(r => `${r.date},${r.age},${r.odAL},${r.osAL},${r.odSE ?? ''},${r.osSE ?? ''},${r.odPct ?? ''},${r.osPct ?? ''}`).join('\n');
  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${patient.name}_measurements.csv`;
  link.click();
}

function openImportCsvModal(container, patient) {
  if (!patient) return;
  let parsedRecords = [];

  const modal = openModal('데이터 가져오기', `
    <div class="space-y-4">
      <div class="px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700 font-medium">${escapeHtml(patient.name)}</div>
      <div class="p-3 bg-slate-50 rounded-lg">
        <p class="text-xs text-slate-600 font-medium mb-1">CSV 형식:</p>
        <p class="text-xs text-slate-500 font-mono">날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE</p>
        <p class="text-xs text-slate-400 mt-1">* 나이는 자동 재계산됩니다. 내보낸 CSV와 동일한 형식을 사용하세요.</p>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">CSV 파일 선택</label>
        <input type="file" id="csvFileInput" accept=".csv" class="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-primary-50 file:text-primary-700">
      </div>
      <div id="csvPreview" class="hidden">
        <p class="text-sm font-medium text-slate-700 mb-2">미리보기 (<span id="csvRowCount">0</span>행)</p>
        <div class="max-h-48 overflow-auto border border-slate-200 rounded-lg">
          <table class="w-full text-xs">
            <thead class="bg-slate-50 sticky top-0"><tr><th class="px-2 py-1.5 text-left">날짜</th><th class="px-2 py-1.5">OD AL</th><th class="px-2 py-1.5">OS AL</th><th class="px-2 py-1.5">OD SE</th><th class="px-2 py-1.5">OS SE</th></tr></thead>
            <tbody id="csvPreviewBody"></tbody>
          </table>
        </div>
      </div>
      <div id="csvResult" class="hidden text-sm"></div>
      <div class="flex gap-3 pt-2">
        <button id="cancelImport" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
        <button id="confirmImport" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed" disabled>가져오기</button>
      </div>
    </div>
  `);

  const fileInput = modal.element.querySelector('#csvFileInput');
  const previewDiv = modal.element.querySelector('#csvPreview');
  const previewBody = modal.element.querySelector('#csvPreviewBody');
  const rowCountSpan = modal.element.querySelector('#csvRowCount');
  const confirmBtn = modal.element.querySelector('#confirmImport');
  const resultDiv = modal.element.querySelector('#csvResult');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split(/\r?\n/).filter(l => l.trim());
      // Skip header row
      const dataLines = lines.slice(1);
      parsedRecords = [];
      previewBody.innerHTML = '';

      for (const line of dataLines) {
        const cols = line.split(',');
        if (cols.length < 4) continue;
        const date = cols[0]?.trim();
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
        const odAL = parseFloat(cols[2]);
        const osAL = parseFloat(cols[3]);
        const odSE = cols[4] !== undefined ? parseFloat(cols[4]) : NaN;
        const osSE = cols[5] !== undefined ? parseFloat(cols[5]) : NaN;

        if (isNaN(odAL) && isNaN(osAL)) continue;

        const record = {
          date,
          odAL: isNaN(odAL) ? null : odAL,
          osAL: isNaN(osAL) ? null : osAL,
          odSE: isNaN(odSE) ? null : odSE,
          osSE: isNaN(osSE) ? null : osSE,
        };
        parsedRecords.push(record);
        previewBody.innerHTML += `<tr class="border-t border-slate-100"><td class="px-2 py-1">${date}</td><td class="px-2 py-1 text-center">${record.odAL ?? '-'}</td><td class="px-2 py-1 text-center">${record.osAL ?? '-'}</td><td class="px-2 py-1 text-center">${record.odSE ?? '-'}</td><td class="px-2 py-1 text-center">${record.osSE ?? '-'}</td></tr>`;
      }

      rowCountSpan.textContent = parsedRecords.length;
      previewDiv.classList.toggle('hidden', parsedRecords.length === 0);
      confirmBtn.disabled = parsedRecords.length === 0;
    };
    reader.readAsText(file);
  });

  modal.element.querySelector('#cancelImport').addEventListener('click', modal.close);

  confirmBtn.addEventListener('click', async () => {
    if (parsedRecords.length === 0) return;
    confirmBtn.disabled = true;
    confirmBtn.textContent = '가져오는 중...';
    resultDiv.classList.remove('hidden');
    resultDiv.textContent = '처리 중...';

    const { success, errors } = await importMeasurements(patient.id, parsedRecords);

    let msg = `${success}건 가져오기 완료`;
    if (errors.length > 0) {
      msg += `, ${errors.length}건 오류`;
      resultDiv.innerHTML = `<p class="text-emerald-600 font-medium">${escapeHtml(msg)}</p><ul class="mt-1 text-red-500 text-xs list-disc pl-4">${errors.map(e => `<li>${escapeHtml(e)}</li>`).join('')}</ul>`;
    } else {
      resultDiv.innerHTML = `<p class="text-emerald-600 font-medium">${escapeHtml(msg)}</p>`;
    }

    confirmBtn.textContent = '완료';
    // Re-render after short delay
    setTimeout(async () => {
      setState({ currentPatient: await getPatientById(patient.id) });
      modal.close();
      await renderDoctorScreen(container);
    }, 1500);
  });
}

function openSettingsModal(container) {
  const modal = openModal('설정', `
    <div class="space-y-4">
      <div class="p-4 bg-slate-50 rounded-xl">
        <h4 class="text-sm font-semibold text-slate-700 mb-1">비밀번호 변경</h4>
        <p class="text-xs text-slate-500 mb-3">새 비밀번호를 입력하세요 (8자 이상).</p>
        <div class="space-y-2">
          <input type="password" id="settingsNewPw" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="새 비밀번호">
          <input type="password" id="settingsConfirmPw" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400" placeholder="비밀번호 확인">
          <div id="settingsPwMsg" class="text-xs hidden"></div>
          <button id="settingsChangePwBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">변경</button>
        </div>
      </div>
      <div class="p-4 bg-slate-50 rounded-xl">
        <h4 class="text-sm font-semibold text-slate-700 mb-1">계정</h4>
        <p class="text-xs text-slate-500 mb-3">현재 로그인된 계정에서 로그아웃합니다.</p>
        <button id="settingsLogoutBtn" class="w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-white transition-colors">로그아웃</button>
      </div>
      <div class="p-4 bg-red-50 rounded-xl">
        <h4 class="text-sm font-semibold text-red-700 mb-1">데이터 초기화</h4>
        <p class="text-xs text-red-500 mb-3">모든 데이터를 초기 상태로 되돌립니다. 이 작업은 되돌릴 수 없습니다.</p>
        <button id="settingsResetBtn" class="w-full py-2.5 border border-red-200 rounded-xl text-sm font-medium text-red-600 hover:bg-white transition-colors">데이터 초기화</button>
      </div>
      <button id="settingsCloseBtn" class="w-full py-2.5 bg-slate-100 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-200 transition-colors">닫기</button>
    </div>
  `);

  modal.element.querySelector('#settingsCloseBtn').addEventListener('click', modal.close);

  // Password change
  modal.element.querySelector('#settingsChangePwBtn').addEventListener('click', async () => {
    const newPw = modal.element.querySelector('#settingsNewPw').value;
    const confirmPw = modal.element.querySelector('#settingsConfirmPw').value;
    const msgEl = modal.element.querySelector('#settingsPwMsg');
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

    const btn = modal.element.querySelector('#settingsChangePwBtn');
    btn.disabled = true;
    btn.textContent = '변경 중...';

    try {
      await changePassword(newPw);
      msgEl.textContent = '비밀번호가 성공적으로 변경되었습니다.';
      msgEl.classList.add('text-emerald-600');
      msgEl.classList.remove('hidden');
      modal.element.querySelector('#settingsNewPw').value = '';
      modal.element.querySelector('#settingsConfirmPw').value = '';
    } catch (err) {
      msgEl.textContent = '변경 실패: ' + (err.message || '알 수 없는 오류');
      msgEl.classList.add('text-red-500');
      msgEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = '변경';
    }
  });

  modal.element.querySelector('#settingsLogoutBtn').addEventListener('click', async () => {
    await logout();
    setState({ currentUser: null, currentPatient: null });
    modal.close();
    window.location.hash = '#login';
  });
  modal.element.querySelector('#settingsResetBtn').addEventListener('click', async () => {
    if (confirm('정말 모든 데이터를 초기화하시겠습니까?')) {
      await resetData();
      setState({ currentUser: null, currentPatient: null });
      modal.close();
      window.location.hash = '#login';
    }
  });
}
