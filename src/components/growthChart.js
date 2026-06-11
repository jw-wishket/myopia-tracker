import {
  Chart,
  ScatterController, LineController,
  LinearScale,
  PointElement, LineElement,
  Title, Tooltip, Legend, Filler,
} from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { OD_COLOR, OS_COLOR, TREATMENT_COLORS, PERCENTILE_GRID } from '../constants.js';
import { escapeHtml, predictionLabelAdjusts } from '../utils.js';
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
const chartMeta = {}; // canvasId -> { model, projectionMode } : 이미지 내보내기용

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
  chartMeta[canvasId] = { model, projectionMode };
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
  // 예측 안축장 라벨 (18세 지점) — 양안 값이 가까우면 위/아래로 분리해 겹침 방지
  const labelAdjusts = predictionLabelAdjusts(
    model.od?.projection.predictedAL ?? null,
    model.os?.projection.predictedAL ?? null,
  );
  for (const [eye, color, adjust] of [[model.od, OD_COLOR, labelAdjusts.od], [model.os, OS_COLOR, labelAdjusts.os]]) {
    if (!eye) continue;
    annotations[`pred_${color}`] = {
      type: 'label', xValue: 18, yValue: eye.projection.predictedAL,
      content: `${eye.projection.predictedAL.toFixed(2)}mm`,
      color, font: { size: 10, weight: 'bold' }, position: 'end', xAdjust: -4, yAdjust: adjust,
    };
  }

  const chart = new Chart(ctx, {
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
        y: { min: 20, max: 30, title: { display: true, text: '안축장 (mm)' }, ticks: { stepSize: 1 }, grid: { color: '#f1f5f9' } },
      },
    },
  });
  chartInstances[canvasId] = chart;

  // 굴절 패널을 성장차트 AL축에 세로 정렬: 예측 굴절 종형곡선 중심이 점선 끝점(예측 안축장)과 같은 높이.
  // chartArea/scale이 동기 계산되지 않았으면(NaN/0) align을 넘기지 않아 패널이 고정축으로 폴백.
  const yScale = chart.scales?.y;
  const h = ctx.clientHeight;
  const area = chart.chartArea;
  let align;
  if (yScale && area && h > 0
      && Number.isFinite(area.top) && Number.isFinite(area.bottom)
      && Number.isFinite(yScale.getPixelForValue(24))) {
    align = { topFrac: area.top / h, bottomFrac: area.bottom / h, alMin: yScale.min, alMax: yScale.max };
  }

  initRefractionPanel(refId, model, align);
  initRiskGauge(riskId, model);
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

const RISK_TEXT_COLORS = ['#059669', '#d97706', '#dc2626']; // 낮음/중간/높음
const GAUGE_POS = [0.166, 0.5, 0.833];

// renderGrowthChartImage: 차트+굴절패널 캔버스에 제목·범례·위험도 게이지를 합성한 카드 이미지를 반환.
// (HTML 요소를 캔버스에 직접 그려 oklch/CSP 폰트 문제 없이 '이미지 저장'에서 본 카드와 동일하게 출력)
export function renderGrowthChartImage(canvasId) {
  const chart = document.getElementById(canvasId);
  const meta = chartMeta[canvasId];
  if (!chart || !meta || !meta.model || meta.model.error) return null;
  const { model, projectionMode } = meta;
  const panel = document.getElementById(`${canvasId}__refraction`);
  const hasPanel = panel && panel.clientWidth > 0;
  const scale = window.devicePixelRatio || 1;

  const cw = chart.clientWidth, ch = chart.clientHeight;
  const pw = hasPanel ? panel.clientWidth : 0;
  const ph = hasPanel ? panel.clientHeight : 0;
  const gap = hasPanel ? 8 : 0;
  const rowW = cw + gap + pw;

  const PAD = 16, titleH = 28, legendH = 28, riskTextH = 24, barH = 12, riskLabelH = 18, riskGap = 8;
  const W = PAD * 2 + rowW;
  const H = PAD * 2 + titleH + Math.max(ch, ph) + legendH + riskTextH + barH + riskGap + riskLabelH;

  const out = document.createElement('canvas');
  out.width = Math.round(W * scale);
  out.height = Math.round(H * scale);
  const ctx = out.getContext('2d');
  ctx.scale(scale, scale);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  let y = PAD;
  // 제목
  ctx.fillStyle = '#1e293b';
  ctx.font = '600 15px "Noto Sans KR", system-ui, sans-serif';
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText('성장 차트', PAD, y + 4);
  y += titleH;

  // 차트 + 굴절 패널
  ctx.drawImage(chart, PAD, y, cw, ch);
  if (hasPanel) ctx.drawImage(panel, PAD + cw + gap, y, pw, ph);
  y += Math.max(ch, ph);

  // 범례 (가운데 정렬)
  const projLabel = '18세 예측 · ' + (projectionMode === 'trend' ? '추세 연장' : '백분위 추종');
  const legend = [
    { kind: 'dot', color: OD_COLOR, text: '우안 (OD)' },
    { kind: 'dot', color: OS_COLOR, text: '좌안 (OS)' },
    { kind: 'line', color: '#16a34a', text: 'P50' },
    { kind: 'dash', color: '#94a3b8', text: projLabel },
  ];
  ctx.font = '12px "Noto Sans KR", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const mW = 20, mGap = 6, itemGap = 16;
  let totalW = -itemGap;
  for (const it of legend) totalW += mW + mGap + ctx.measureText(it.text).width + itemGap;
  let lx = PAD + Math.max(0, (rowW - totalW) / 2);
  const ly = y + legendH / 2;
  for (const it of legend) {
    if (it.kind === 'dot') {
      ctx.fillStyle = it.color;
      ctx.beginPath(); ctx.arc(lx + 5, ly, 5, 0, Math.PI * 2); ctx.fill();
    } else {
      ctx.strokeStyle = it.color; ctx.lineWidth = 2;
      ctx.setLineDash(it.kind === 'dash' ? [5, 3] : []);
      ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(lx + mW, ly); ctx.stroke();
      ctx.setLineDash([]);
    }
    lx += mW + mGap;
    ctx.fillStyle = '#64748b'; ctx.textAlign = 'left';
    ctx.fillText(it.text, lx, ly);
    lx += ctx.measureText(it.text).width + itemGap;
  }
  y += legendH;

  // 위험도 라벨
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.font = '13px "Noto Sans KR", system-ui, sans-serif';
  ctx.fillStyle = '#64748b';
  const pre = '데이터 기반 위험도: ';
  ctx.fillText(pre, PAD, y + 4);
  ctx.font = '600 13px "Noto Sans KR", system-ui, sans-serif';
  ctx.fillStyle = model.riskLevel != null ? RISK_TEXT_COLORS[model.riskLevel] : '#1e293b';
  ctx.fillText(model.risk || '-', PAD + ctx.measureText(pre).width, y + 4);
  y += riskTextH;

  // 그라데이션 게이지 바
  const barX = PAD, barW = rowW;
  const grad = ctx.createLinearGradient(barX, 0, barX + barW, 0);
  grad.addColorStop(0, '#16a34a'); grad.addColorStop(0.5, '#facc15'); grad.addColorStop(1, '#dc2626');
  roundRect(ctx, barX, y, barW, barH, 6); ctx.fillStyle = grad; ctx.fill();
  if (model.previousRiskLevel != null) {
    const pmx = barX + barW * GAUGE_POS[model.previousRiskLevel];
    ctx.fillStyle = 'rgba(148,163,184,0.85)';
    roundRect(ctx, pmx - 2, y - 2, 4, barH + 4, 2); ctx.fill();
  }
  if (model.riskLevel != null) {
    const mx = barX + barW * GAUGE_POS[model.riskLevel];
    ctx.fillStyle = '#0f172a';
    roundRect(ctx, mx - 3, y - 3, 6, barH + 6, 2); ctx.fill();
    ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 1.5; roundRect(ctx, mx - 3, y - 3, 6, barH + 6, 2); ctx.stroke();
  }
  y += barH + riskGap;

  // 구간 라벨
  ctx.font = '11px "Noto Sans KR", system-ui, sans-serif';
  ctx.fillStyle = '#94a3b8'; ctx.textBaseline = 'top';
  ctx.textAlign = 'left'; ctx.fillText('위험도 낮음', barX, y);
  ctx.textAlign = 'center'; ctx.fillText('위험도 중간', barX + barW / 2, y);
  ctx.textAlign = 'right'; ctx.fillText('위험도 높음', barX + barW, y);

  return out;
}

export function destroyChart(canvasId) {
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }
  destroyRefractionPanel(`${canvasId}__refraction`);
}
