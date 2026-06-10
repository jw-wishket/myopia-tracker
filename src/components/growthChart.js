import {
  Chart,
  ScatterController, LineController,
  LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { OD_COLOR, OS_COLOR, TREATMENT_COLORS, PERCENTILE_GRID } from '../constants.js';
import { escapeHtml } from '../utils.js';
import { computeChartModel } from '../myopiaModel.js';
import { renderRefractionPanel, initRefractionPanel, destroyRefractionPanel } from './refractionPanel.js';
import { renderRiskGauge, initRiskGauge } from './riskGauge.js';

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
    const cx = (chart.chartArea.left + chart.chartArea.right) / 2;
    const cy = (chart.chartArea.top + chart.chartArea.bottom) / 2;
    ctx.fillText('근시관리 트래커', cx, cy);
    ctx.restore();
  },
};

Chart.register(
  ScatterController, LineController, LinearScale,
  PointElement, LineElement, Title, Tooltip, Legend, Filler,
  annotationPlugin, watermarkPlugin,
);

const chartInstances = {};

export function renderGrowthChart(canvasId, patient, projectionMode = 'trend') {
  const refId = `${canvasId}__refraction`;
  const riskId = `${canvasId}__risk`;
  return `
    <div class="flex gap-2 items-stretch" style="height:400px; max-height:60vh;">
      <div class="flex-1 min-w-0"><canvas id="${canvasId}"></canvas></div>
      <div class="shrink-0">${renderRefractionPanel(refId)}</div>
    </div>
    <div class="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-3 text-xs text-slate-500">
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OD_COLOR}"></span>우안 (OD)</span>
      <span class="flex items-center gap-1.5"><span class="w-2.5 h-2.5 rounded-full" style="background:${OS_COLOR}"></span>좌안 (OS)</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded" style="background:#16a34a"></span>P50</span>
      <span class="flex items-center gap-1.5"><span class="w-5 border-t-2 border-dashed border-slate-400"></span>18세 예측 · ${projectionMode === 'trend' ? '추세 연장' : '백분위 추종'}</span>
    </div>
    ${renderRiskGauge(riskId)}
  `;
}

export function initGrowthChart(canvasId, patient, projectionMode = 'trend') {
  if (!patient) return;
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;
  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  const model = computeChartModel(patient, projectionMode);
  const refId = `${canvasId}__refraction`;
  const riskId = `${canvasId}__risk`;

  if (model.error) {
    const c = ctx.getContext('2d');
    c.clearRect(0, 0, ctx.width, ctx.height);
    c.fillStyle = '#94a3b8';
    c.font = '14px sans-serif';
    c.textAlign = 'center';
    c.fillText('성별 정보가 필요합니다', ctx.width / 2, ctx.height / 2);
    return;
  }

  // 19개 백분위 곡선 (P50 굵은 실선, 나머지 얇은 회색)
  const curveDatasets = PERCENTILE_GRID.map((p) => ({
    type: 'line', label: `P${p}`,
    data: model.curves[p],
    borderColor: p === 50 ? '#475569' : '#cbd5e1',
    borderWidth: p === 50 ? 2.5 : 1,
    pointRadius: 0, tension: 0.4, fill: false, order: 10,
  }));

  // 환자 측정점 + 18세 예측 점선
  const eyeDatasets = [];
  for (const [eye, color, label] of [[model.od, OD_COLOR, '우안 (OD)'], [model.os, OS_COLOR, '좌안 (OS)']]) {
    if (!eye) continue;
    eyeDatasets.push({
      type: 'scatter', label, data: eye.points,
      borderColor: color, backgroundColor: color,
      pointRadius: 5, pointHoverRadius: 7, showLine: true, borderWidth: 2, tension: 0.2, order: 1,
    });
    eyeDatasets.push({
      type: 'line', label: `${label} 예측`, data: eye.projection.points,
      borderColor: color, borderWidth: 2, borderDash: [6, 4],
      pointRadius: 0, tension: 0.2, fill: false, order: 2,
    });
  }

  // 치료 수직선
  const annotations = {};
  (model.treatments || []).forEach((t, i) => {
    if (t.age >= 4 && t.age <= 18) {
      const c = TREATMENT_COLORS[t.type] || '#7c3aed';
      annotations['t' + i] = {
        type: 'line', xMin: t.age, xMax: t.age,
        borderColor: c, borderWidth: 2, borderDash: [6, 4],
        label: {
          display: true, content: escapeHtml(t.type), position: i % 2 === 0 ? 'start' : 'end',
          backgroundColor: 'rgba(255,255,255,0.95)', color: c,
          font: { size: 10, weight: 'bold' }, padding: { x: 6, y: 3 }, borderRadius: 4,
        },
      };
    }
  });
  // 예측 안축장 라벨 (18세 지점)
  for (const [eye, color] of [[model.od, OD_COLOR], [model.os, OS_COLOR]]) {
    if (!eye) continue;
    annotations[`pred_${color}`] = {
      type: 'label', xValue: 18, yValue: eye.projection.predictedAL,
      content: `${eye.projection.predictedAL.toFixed(2)}mm`,
      color, font: { size: 10, weight: 'bold' }, position: 'end', xAdjust: -4, yAdjust: -8,
    };
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'scatter',
    data: { datasets: [...curveDatasets, ...eyeDatasets] },
    options: {
      responsive: true, maintainAspectRatio: false,
      interaction: { intersect: false, mode: 'nearest' },
      plugins: {
        legend: { display: false },
        tooltip: { filter: (item) => item.dataset.label === '우안 (OD)' || item.dataset.label === '좌안 (OS)' },
        annotation: { annotations },
      },
      scales: {
        x: { type: 'linear', min: 4, max: 18, title: { display: true, text: '나이 (세)' }, ticks: { stepSize: 2, callback: (v) => (v === 18 ? '성인' : v) }, grid: { color: '#f1f5f9' } },
        y: { min: 20, max: 28, title: { display: true, text: '안축장 (mm)' }, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
      },
    },
  });

  initRefractionPanel(refId, model);
  initRiskGauge(riskId, model);
}

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
  destroyRefractionPanel(`${canvasId}__refraction`);
}
