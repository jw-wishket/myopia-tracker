import { openModal } from '../../components/modal.js';
import { addPatient, updatePatient, addMeasurement, getPatientById, importMeasurements, logout, resetData, changePassword, addTreatmentType } from '../../data/dataService.js';
import { setState, getState } from '../../state.js';
import { todayStr, calcAge, escapeHtml } from '../../utils.js';
import { showSyncStatus } from '../../components/syncStatus.js';

export function openAddPatientModal(container, user, onComplete) {
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
    await onComplete();
  });
}

export function openEditPatientModal(container, patient, onComplete) {
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
      await onComplete();
    } else {
      saveBtn.disabled = false;
      saveBtn.textContent = '저장';
    }
  });
}

export function openAddMeasurementModal(container, patient, onComplete) {
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
    await onComplete();
  });
}

export function openImportCsvModal(container, patient, onComplete) {
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
      await onComplete();
    }, 1500);
  });
}

export function openShortcutHelpModal() {
  openModal('키보드 단축키', `
    <div class="space-y-3">
      <div class="grid grid-cols-2 gap-2 text-sm">
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">N</kbd> <span class="text-slate-600">새 측정 입력</span></div>
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">P</kbd> <span class="text-slate-600">새 환자 등록</span></div>
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">S</kbd> <span class="text-slate-600">환자 검색</span></div>
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">E</kbd> <span class="text-slate-600">환자 정보 수정</span></div>
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">R</kbd> <span class="text-slate-600">리포트 출력</span></div>
        <div class="flex items-center gap-2"><kbd class="px-2 py-1 bg-slate-100 rounded text-xs font-mono font-semibold">?</kbd> <span class="text-slate-600">이 도움말</span></div>
      </div>
      <p class="text-xs text-slate-400 mt-2">* 입력 필드에 포커스가 있거나 모달이 열린 상태에서는 비활성화됩니다</p>
    </div>
  `);
}

export function openSettingsModal(container, onComplete) {
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
