import { Chart } from 'chart.js';
import { OD_COLOR, OS_COLOR } from '../constants.js';

let progressChartInstance = null;

export function renderProgressChart() {
  return `
    <div class="flex gap-2 mb-4">
      <button class="chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white" data-type="AL">안축장 (AL)</button>
      <button class="chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50" data-type="SE">굴절력 (SE)</button>
    </div>
    <div class="chart-container" style="height:300px; max-height:50vh;">
      <canvas id="progressChart"></canvas>
    </div>
  `;
}

export function initProgressChart(patient, chartType = 'AL') {
  if (!patient) return;
  const ctx = document.getElementById('progressChart');
  if (!ctx) return;

  if (progressChartInstance) progressChartInstance.destroy();

  const records = patient.records || [];
  const key = chartType === 'AL'
    ? { od: 'odAL', os: 'osAL', label: '안축장 (mm)' }
    : { od: 'odSE', os: 'osSE', label: '굴절력 (D)' };

  progressChartInstance = new Chart(ctx, {
    type: 'line',
    data: {
      labels: records.map(r => r.date),
      datasets: [
        { label: '우안 (OD)', data: records.map(r => r[key.od]), borderColor: OD_COLOR, backgroundColor: OD_COLOR + '20', borderWidth: 3, tension: 0.3, pointRadius: 5 },
        { label: '좌안 (OS)', data: records.map(r => r[key.os]), borderColor: OS_COLOR, backgroundColor: OS_COLOR + '20', borderWidth: 3, tension: 0.3, pointRadius: 5 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { position: 'top' } },
      scales: { y: { title: { display: true, text: key.label } } },
    },
  });
}

export function destroyProgressChart() {
  if (progressChartInstance) {
    progressChartInstance.destroy();
    progressChartInstance = null;
  }
}
