import { OD_COLOR, OS_COLOR } from '../constants.js';

const D_TOP = -6;   // 캔버스 상단 굴절값
const D_BOTTOM = 8; // 캔버스 하단 굴절값
const TICKS = [-6, -4, -2, 0, 2, 4, 6, 8];

export function renderRefractionPanel(id) {
  return `<canvas id="${id}" width="90" height="400" class="block" style="height:400px;max-height:60vh;width:90px"></canvas>`;
}

// 정규분포 밀도 (정규화 안 된 상대값)
function gaussian(x, mean, sd) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z);
}

export function initRefractionPanel(id, model) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!model || model.error) return;

  const padTop = 10, padBottom = 10;
  const plotH = H - padTop - padBottom;
  const barX = 4, barW = 14;
  const yOf = (d) => padTop + ((d - D_TOP) / (D_BOTTOM - D_TOP)) * plotH;

  // 1) 그라데이션 컬러바 (위=근시/위험=빨강, 아래=초록)
  const grad = ctx.createLinearGradient(0, padTop, 0, H - padBottom);
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(0.45, '#facc15');
  grad.addColorStop(1, '#16a34a');
  ctx.fillStyle = grad;
  ctx.fillRect(barX, padTop, barW, plotH);

  // 2) 눈금 라벨
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'middle';
  for (const d of TICKS) {
    const y = yOf(d);
    ctx.fillText(`${d > 0 ? '+' : ''}${d} D`, barX + barW + 4, y);
  }

  // 3) 예측 굴절 종형곡선 (OD/OS)
  const curveLeft = barX + barW + 40;
  const curveMaxW = W - curveLeft - 2;
  function drawBell(predSE, color) {
    if (!predSE) return;
    const { mean, sd } = predSE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let d = D_TOP; d <= D_BOTTOM; d += 0.1) {
      const x = curveLeft + gaussian(d, mean, sd) * curveMaxW;
      const y = yOf(d);
      d === D_TOP ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();
    // 평균 위치 점
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(curveLeft + curveMaxW, yOf(mean), 3, 0, Math.PI * 2);
    ctx.fill();
  }
  drawBell(model.od?.predSE, OD_COLOR);
  drawBell(model.os?.predSE, OS_COLOR);
}

export function destroyRefractionPanel(id) {
  const canvas = document.getElementById(id);
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}
