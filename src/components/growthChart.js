import {
  Chart,
  ScatterController, LineController,
  LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { OD_COLOR, OS_COLOR, TREATMENT_COLORS, PERCENTILE_CURVE_STYLES } from '../constants.js';
import { generateCurveData } from '../utils.js';

const watermarkPlugin = {
  id: 'watermark',
  afterDraw(chart) {
    const ctx = chart.ctx;
    ctx.save();
    ctx.globalAlpha = 0.06;
    ctx.font = 'bold 48px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2563eb';
    const centerX = (chart.chartArea.left + chart.chartArea.right) / 2;
    const centerY = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    ctx.fillText('근시관리 트래커', centerX, centerY);
    ctx.restore();
  }
};

Chart.register(
  ScatterController, LineController,
  LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
  annotationPlugin, watermarkPlugin
);

let chartInstances = {};

export function renderGrowthChart(canvasId, patient) {
  return `
    <div class="chart-container" style="height:400px; max-height:60vh;">
      <canvas id="${canvasId}"></canvas>
    </div>
    <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OD_COLOR}"></span>우안 (OD)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OS_COLOR}"></span>좌안 (OS)</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded" style="background:#16a34a"></span>P50</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded" style="background:#f59e0b"></span>P75</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded" style="background:#dc2626"></span>P95</span>
    </div>
  `;
}

export function initGrowthChart(canvasId, patient) {
  if (!patient) return;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const gender = patient.gender;
  const records = patient.records || [];

  function createRefLine(pKey) {
    const style = PERCENTILE_CURVE_STYLES[pKey];
    return {
      type: 'line', label: pKey,
      data: generateCurveData(gender, pKey),
      borderColor: style.color, borderWidth: style.width, borderDash: style.dash,
      pointRadius: 0, tension: 0.4, fill: false, order: 10,
    };
  }

  const odData = records.filter(r => r.odAL && r.age >= 4 && r.age <= 18).map(r => ({ x: r.age, y: r.odAL }));
  const osData = records.filter(r => r.osAL && r.age >= 4 && r.age <= 18).map(r => ({ x: r.age, y: r.osAL }));

  const annotations = {};
  if (patient.treatments) {
    patient.treatments.forEach((t, i) => {
      if (t.age >= 4 && t.age <= 18) {
        const c = TREATMENT_COLORS[t.type] || '#7c3aed';
        annotations['t' + i] = {
          type: 'line', xMin: t.age, xMax: t.age,
          borderColor: c, borderWidth: 2, borderDash: [6, 4],
          label: {
            display: true, content: t.type, position: i % 2 === 0 ? 'start' : 'end',
            backgroundColor: 'rgba(255,255,255,0.95)', color: c,
            font: { size: 10, weight: 'bold' }, padding: { x: 6, y: 3 }, borderRadius: 4,
          },
        };
      }
    });
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'scatter',
    data: {
      datasets: [
        createRefLine('P95'), createRefLine('P90'), createRefLine('P75'),
        createRefLine('P50'), createRefLine('P25'), createRefLine('P10'), createRefLine('P5'),
        {
          type: 'scatter', label: '우안 (OD)', data: odData,
          borderColor: OD_COLOR, backgroundColor: OD_COLOR,
          pointRadius: 5, pointHoverRadius: 7, showLine: true, borderWidth: 2, tension: 0.2, order: 1,
        },
        {
          type: 'scatter', label: '좌안 (OS)', data: osData,
          borderColor: OS_COLOR, backgroundColor: OS_COLOR,
          pointRadius: 5, pointHoverRadius: 7, showLine: true, borderWidth: 2, tension: 0.2, order: 1,
        },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'nearest' },
      plugins: {
        legend: { display: false },
        tooltip: { filter: item => item.dataset.label === '우안 (OD)' || item.dataset.label === '좌안 (OS)' },
        annotation: { annotations },
      },
      scales: {
        x: { type: 'linear', min: 4, max: 18, title: { display: true, text: '나이 (세)' }, ticks: { stepSize: 2 }, grid: { color: '#f1f5f9' } },
        y: { min: 20, max: 29, title: { display: true, text: '안축장 (mm)' }, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
      },
    },
  });
}

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
}
