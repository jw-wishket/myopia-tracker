import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { renderProgressChart, initProgressChart, destroyProgressChart } from '../components/progressChart.js';
import { openModal } from '../components/modal.js';
import { getState, setState } from '../state.js';
import { getPatients, searchPatients, getPatientById, addPatient, addMeasurement, deleteRecord, addTreatment, removeTreatment, deletePatient, updatePatient } from '../data/dataService.js';
import { todayStr, calcAge, progressLabel } from '../utils.js';

let currentSearchQuery = '';

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

  const patients = currentSearchQuery
    ? await searchPatients(currentSearchQuery, user.clinicId)
    : await getPatients(user.clinicId);
  isLoadingPatients = false;

  const selectedPatient = getState().currentPatient || patients[0] || null;
  if (selectedPatient && !getState().currentPatient) {
    setState({ currentPatient: selectedPatient });
  }

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: user.clinicName, user });
  const sidebar = renderSidebar(patients, selectedPatient?.id, { searchQuery: currentSearchQuery });

  container.innerHTML = `
    ${nav.html}
    <div class="flex">
      ${sidebar}
      <main class="flex-1 min-h-[calc(100vh-56px)] has-bottom-nav">
        ${renderPatientContent(selectedPatient, patients)}
      </main>
    </div>
    ${renderBottomNav('patients')}
  `;

  nav.bind(container);
  bindDoctorEvents(container, user, patients, selectedPatient);

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

  // Mobile patient chips
  const mobileChips = `
    <div class="md:hidden overflow-x-auto px-4 py-3 flex gap-2 border-b border-slate-200 bg-white">
      <input type="text" id="mobileSearch" class="flex-shrink-0 w-32 px-3 py-1.5 border border-slate-200 rounded-full text-xs focus:outline-none" placeholder="검색...">
      ${patients.map(p => `
        <button class="mobile-patient-chip flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${p.id === patient.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}" data-id="${p.id}">${p.name}</button>
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

      <div class="flex items-center justify-between">
        <span class="text-sm ${prog.cls}">${prog.text}</span>
        <div class="flex gap-2">
          <button id="addMeasurementBtn" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            새 측정
          </button>
          <button id="exportCsvBtn" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">CSV</button>
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
          ${renderTreatmentTags(patient.treatments, { editable: true })}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 차트</h3>
          ${renderGrowthChart('growthChart', patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">진행 추이</h3>
          ${renderProgressChart()}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-800">측정 기록</h3>
        </div>
        ${renderMeasurementTable(patient.records, { editable: true })}
      </div>
    </div>
  `;
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

  // Sidebar search
  const searchInput = container.querySelector('#sidebarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', async (e) => {
      currentSearchQuery = e.target.value;
      await renderDoctorScreen(container);
      const newInput = container.querySelector('#sidebarSearch');
      if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
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
  const treatmentConfirm = container.querySelector('#treatmentAddConfirm');
  if (treatmentConfirm && selectedPatient) {
    treatmentConfirm.addEventListener('click', async () => {
      const type = container.querySelector('#treatmentTypeSelect').value;
      const date = container.querySelector('#treatmentDateInput').value;
      if (type && date) {
        treatmentConfirm.disabled = true;
        treatmentConfirm.textContent = '추가 중...';
        await addTreatment(selectedPatient.id, { type, date });
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

  // Delete record
  container.querySelectorAll('.record-delete').forEach(btn => {
    btn.addEventListener('click', async () => {
      if (selectedPatient && confirm('이 측정 기록을 삭제하시겠습니까?')) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'pointer-events-none');
        await deleteRecord(selectedPatient.id, btn.dataset.id);
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
        <input type="date" id="newPatientBirth" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400">
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
        <label class="block text-sm font-medium text-slate-600 mb-1.5">등록번호</label>
        <input type="text" id="newPatientRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="2024-001">
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
    const regNo = modal.element.querySelector('#newPatientRegNo').value.trim();
    if (!name || !birthDate) return;
    const newPatient = await addPatient({ name, birthDate, gender, regNo, clinicId: user.clinicId });
    setState({ currentPatient: newPatient });
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
        <input type="text" id="editPatientName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${patient.name}">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
        <input type="date" id="editPatientBirth" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${patient.birthDate}">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">등록번호</label>
        <input type="text" id="editPatientRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${patient.regNo || ''}" placeholder="2024-001">
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
    const regNo = modal.element.querySelector('#editPatientRegNo').value.trim();
    if (!name || !birthDate) return;

    const saveBtn = modal.element.querySelector('#confirmEditPatient');
    saveBtn.disabled = true;
    saveBtn.textContent = '저장 중...';

    const success = await updatePatient(patient.id, { name, birthDate, regNo });
    if (success) {
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
  const modal = openModal('측정 입력', `
    <div class="space-y-4">
      <div class="px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700 font-medium">${patient.name} · ${calcAge(patient.birthDate, new Date())}세</div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">측정일</label>
        <input type="date" id="measDate" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${todayStr()}">
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

    const btn = modal.element.querySelector('#confirmMeasurement');
    btn.disabled = true;
    btn.textContent = '저장 중...';

    await addMeasurement(patient.id, { date, odAL, osAL, odSE: isNaN(odSE) ? null : odSE, osSE: isNaN(osSE) ? null : osSE });
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
