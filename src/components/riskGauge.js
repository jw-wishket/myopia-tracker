import { escapeHtml } from '../utils.js';

const LEVEL_LABEL = ['낮음', '중간', '높음'];
const LEVEL_POS = ['16.6%', '50%', '83.3%']; // 각 구간 중앙

export function renderRiskGauge(id) {
  return `
    <div id="${id}" class="mt-4">
      <div class="flex items-center gap-2 mb-1.5 text-sm">
        <span class="text-slate-500">데이터 기반 위험도:</span>
        <span data-role="label" class="font-semibold text-slate-800">-</span>
      </div>
      <div class="relative h-3 rounded-full" style="background:linear-gradient(to right,#16a34a 0%,#facc15 50%,#dc2626 100%)">
        <span data-role="prev" class="hidden absolute -top-1 w-2 h-5 -ml-1 rounded-sm bg-slate-400/70 border border-white" title="직전 방문"></span>
        <span data-role="cur" class="absolute -top-1.5 w-3.5 h-6 -ml-1.5 rounded-sm bg-slate-900 border-2 border-white shadow" title="현재"></span>
      </div>
      <div class="flex justify-between mt-1 text-[11px] text-slate-400">
        <span>위험도 낮음</span><span>위험도 중간</span><span>위험도 높음</span>
      </div>
    </div>`;
}

export function initRiskGauge(id, model) {
  const root = document.getElementById(id);
  if (!root || !model || model.error || model.riskLevel == null) return;
  const label = root.querySelector('[data-role="label"]');
  const cur = root.querySelector('[data-role="cur"]');
  const prev = root.querySelector('[data-role="prev"]');

  label.textContent = escapeHtml(model.risk);
  label.className = 'font-semibold ' + ['text-emerald-600', 'text-amber-600', 'text-red-600'][model.riskLevel];
  cur.style.left = LEVEL_POS[model.riskLevel];

  if (model.previousRiskLevel != null) {
    prev.style.left = LEVEL_POS[model.previousRiskLevel];
    prev.classList.remove('hidden');
  }
}
