import { formatDate, calcAge } from '../utils.js';
import { OD_COLOR, OS_COLOR } from '../constants.js';

export function openPrintReport(patient) {
  const age = calcAge(patient.birthDate, new Date());
  const genderLabel = patient.gender === 'male' ? '남' : '여';
  const lastRecord = patient.records?.length > 0 ? patient.records[patient.records.length - 1] : null;

  const reportHtml = `
    <!DOCTYPE html>
    <html lang="ko">
    <head>
      <meta charset="UTF-8">
      <title>${patient.name} - 근시관리 리포트</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Noto Sans KR', sans-serif; padding: 40px; color: #1e293b; font-size: 12px; line-height: 1.6; }
        .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 16px; margin-bottom: 24px; }
        .header h1 { font-size: 18px; color: #2563eb; }
        .header p { font-size: 11px; color: #64748b; }
        .patient-info { display: flex; justify-content: space-between; background: #f8fafc; padding: 12px 16px; border-radius: 8px; margin-bottom: 20px; }
        .patient-info div { }
        .patient-info .label { color: #64748b; font-size: 10px; }
        .patient-info .value { font-weight: 600; font-size: 13px; }
        .section { margin-bottom: 20px; }
        .section h2 { font-size: 13px; font-weight: 600; color: #2563eb; border-bottom: 1px solid #e2e8f0; padding-bottom: 6px; margin-bottom: 10px; }
        table { width: 100%; border-collapse: collapse; font-size: 11px; }
        th { background: #f1f5f9; padding: 6px 8px; text-align: center; font-weight: 600; color: #64748b; border: 1px solid #e2e8f0; }
        td { padding: 5px 8px; text-align: center; border: 1px solid #e2e8f0; }
        .od { color: #0891b2; font-weight: 600; }
        .os { color: #e11d48; font-weight: 600; }
        .stats-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px; }
        .stat-box { border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px; }
        .stat-box.od { border-left: 3px solid #0891b2; }
        .stat-box.os { border-left: 3px solid #e11d48; }
        .stat-box .eye-label { font-size: 10px; color: #64748b; font-weight: 600; text-transform: uppercase; }
        .stat-box .stat-row { display: flex; justify-content: space-between; margin-top: 4px; }
        .stat-box .stat-label { color: #64748b; }
        .stat-box .stat-value { font-weight: 600; }
        .treatments { display: flex; flex-wrap: wrap; gap: 6px; }
        .treatment-tag { padding: 3px 10px; border-radius: 12px; font-size: 10px; border: 1px solid #e2e8f0; }
        .footer { margin-top: 30px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
        .print-date { text-align: right; font-size: 10px; color: #94a3b8; margin-bottom: 8px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div class="print-date">출력일: ${new Date().toLocaleDateString('ko-KR')}</div>
      <div class="header">
        <h1>근시관리 트래커 - 환자 리포트</h1>
        <p>Myopia Management Tracker - Patient Report</p>
      </div>

      <div class="patient-info">
        <div><div class="label">환자명</div><div class="value">${patient.name}</div></div>
        <div><div class="label">생년월일</div><div class="value">${patient.birthDate}</div></div>
        <div><div class="label">성별</div><div class="value">${genderLabel}</div></div>
        <div><div class="label">나이</div><div class="value">${age}세</div></div>
        ${patient.customRef ? `<div><div class="label">관리번호</div><div class="value">${patient.customRef}</div></div>` : ''}
      </div>

      ${lastRecord ? `
      <div class="section">
        <h2>현재 상태 (${formatDate(lastRecord.date)})</h2>
        <div class="stats-grid">
          <div class="stat-box od">
            <div class="eye-label">우안 (OD)</div>
            <div class="stat-row"><span class="stat-label">안축장</span><span class="stat-value">${lastRecord.odAL?.toFixed(2)}mm</span></div>
            <div class="stat-row"><span class="stat-label">굴절력</span><span class="stat-value">${lastRecord.odSE?.toFixed(2) ?? '-'}D</span></div>
            <div class="stat-row"><span class="stat-label">백분위</span><span class="stat-value">${lastRecord.odPct ?? '-'}%ile</span></div>
          </div>
          <div class="stat-box os">
            <div class="eye-label">좌안 (OS)</div>
            <div class="stat-row"><span class="stat-label">안축장</span><span class="stat-value">${lastRecord.osAL?.toFixed(2)}mm</span></div>
            <div class="stat-row"><span class="stat-label">굴절력</span><span class="stat-value">${lastRecord.osSE?.toFixed(2) ?? '-'}D</span></div>
            <div class="stat-row"><span class="stat-label">백분위</span><span class="stat-value">${lastRecord.osPct ?? '-'}%ile</span></div>
          </div>
        </div>
      </div>
      ` : ''}

      ${patient.treatments?.length > 0 ? `
      <div class="section">
        <h2>치료 이력</h2>
        <div class="treatments">
          ${patient.treatments.map(t => `<span class="treatment-tag">${t.type} (${formatDate(t.date)}${t.endDate ? ' ~ ' + formatDate(t.endDate) : ' ~ 진행중'})</span>`).join('')}
        </div>
      </div>
      ` : ''}

      ${patient.records?.length > 0 ? `
      <div class="section">
        <h2>측정 기록</h2>
        <table>
          <thead><tr>
            <th>날짜</th><th>나이</th><th>OD AL</th><th>OS AL</th><th>OD SE</th><th>OS SE</th><th>OD %</th><th>OS %</th>
          </tr></thead>
          <tbody>
            ${patient.records.map(r => `
              <tr>
                <td>${formatDate(r.date)}</td>
                <td>${r.age?.toFixed(1)}</td>
                <td class="od">${r.odAL?.toFixed(2)}</td>
                <td class="os">${r.osAL?.toFixed(2)}</td>
                <td>${r.odSE?.toFixed(2) ?? '-'}</td>
                <td>${r.osSE?.toFixed(2) ?? '-'}</td>
                <td>${r.odPct ?? '-'}</td>
                <td>${r.osPct ?? '-'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
      ` : ''}

      <div class="footer">
        근시관리 트래커 | myopia-tracker.vercel.app | 본 리포트는 참고용이며, 의료적 판단은 담당 의사와 상의하세요.
      </div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(reportHtml);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => printWindow.print(), 500);
}
