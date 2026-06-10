import { OD_COLOR, OS_COLOR, REFRACTION_MODEL } from '../constants.js';

const TICKS = [-8, -6, -4, -2, 0, 2, 4, 6, 8];

export function renderRefractionPanel(id) {
  return `<canvas id="${id}" width="90" height="400" class="block" style="height:400px;max-height:60vh;width:90px"></canvas>`;
}

// 정규분포 밀도 (정규화 안 된 상대값)
function gaussian(x, mean, sd) {
  const z = (x - mean) / sd;
  return Math.exp(-0.5 * z * z);
}

// initRefractionPanel(id, model, align)
// align = { topFrac, bottomFrac, alMin, alMax } 가 주어지면 성장차트 AL축과 세로 픽셀을 공유한다.
//   → 예측 굴절(종형곡선) 중심이 성장차트 점선 끝점(예측 안축장)과 정확히 같은 높이에 표시된다.
//   SE = α + β·AL (선형)이므로 SE축을 AL축의 상으로 매핑. frac은 캔버스 높이 비율이라 DPI/높이에 무관.
// align이 없거나 유효하지 않으면 기존 고정 -6~+8D 축으로 폴백.
export function initRefractionPanel(id, model, align) {
  const canvas = document.getElementById(id);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0, 0, W, H);
  if (!model || model.error) return;

  const { alpha, beta } = REFRACTION_MODEL;
  const seToAL = (se) => (se - alpha) / beta;
  const alToSE = (al) => alpha + beta * al;

  const aligned = align
    && Number.isFinite(align.topFrac) && Number.isFinite(align.bottomFrac)
    && Number.isFinite(align.alMin) && Number.isFinite(align.alMax)
    && align.bottomFrac > align.topFrac && align.alMax > align.alMin;

  let topY, bottomY, yOf, seTop, seBottom;
  if (aligned) {
    // 성장차트 플롯영역과 동일한 세로 구간 + AL→SE 좌표 공유
    topY = align.topFrac * H;
    bottomY = align.bottomFrac * H;
    const yForAL = (al) => topY + ((align.alMax - al) / (align.alMax - align.alMin)) * (bottomY - topY);
    yOf = (se) => yForAL(seToAL(se));
    seTop = alToSE(align.alMax);    // 차트 상단(높은 AL) = 근시(더 음수)
    seBottom = alToSE(align.alMin); // 차트 하단(낮은 AL) = 원시(양수)
  } else {
    const padTop = 10, padBottom = 10;
    topY = padTop; bottomY = H - padBottom;
    seTop = -6; seBottom = 8;
    yOf = (se) => topY + ((se - seTop) / (seBottom - seTop)) * (bottomY - topY);
  }

  const barX = 4, barW = 14;

  // 1) 그라데이션 컬러바 (상단=근시=빨강, 정시(0D)=노랑, 하단=원시=초록)
  const grad = ctx.createLinearGradient(0, topY, 0, bottomY);
  const zeroFrac = Math.max(0, Math.min(1, (yOf(0) - topY) / (bottomY - topY)));
  grad.addColorStop(0, '#dc2626');
  grad.addColorStop(zeroFrac, '#facc15');
  grad.addColorStop(1, '#16a34a');
  ctx.fillStyle = grad;
  ctx.fillRect(barX, topY, barW, bottomY - topY);

  // 2) 눈금 라벨 (보이는 SE 범위 안의 값만)
  ctx.fillStyle = '#94a3b8';
  ctx.font = '10px sans-serif';
  ctx.textBaseline = 'middle';
  const loSE = Math.min(seTop, seBottom), hiSE = Math.max(seTop, seBottom);
  for (const d of TICKS) {
    if (d < loSE || d > hiSE) continue;
    ctx.fillText(`${d > 0 ? '+' : ''}${d} D`, barX + barW + 4, yOf(d));
  }

  // 3) 예측 굴절 종형곡선 (OD/OS) — 중심(평균)이 예측 안축장 끝점과 같은 높이
  const curveLeft = barX + barW + 40;
  const curveMaxW = W - curveLeft - 2;
  function drawBell(predSE, color) {
    if (!predSE) return;
    const { mean, sd } = predSE;
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.beginPath();
    let started = false;
    for (let d = loSE; d <= hiSE + 1e-9; d += 0.1) {
      const x = curveLeft + gaussian(d, mean, sd) * curveMaxW;
      const y = yOf(d);
      if (started) ctx.lineTo(x, y); else { ctx.moveTo(x, y); started = true; }
    }
    ctx.stroke();
    // 평균 위치 점 (= 예측 안축장 끝점 높이)
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
