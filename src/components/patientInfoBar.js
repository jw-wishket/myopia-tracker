import { calcAge } from '../utils.js';

export function renderPatientInfoBar(patient) {
  if (!patient) return '';
  const age = calcAge(patient.birthDate, new Date());
  const genderLabel = patient.gender === 'male' ? '남' : '여';

  return `
    <div class="flex items-center gap-3 flex-wrap px-4 py-3 bg-primary-50 rounded-xl border border-primary-100">
      <span class="text-lg font-semibold text-primary-700">${patient.name}</span>
      <div class="flex items-center gap-2 text-sm text-slate-500">
        <span>${patient.birthDate}</span>
        <span>·</span>
        <span>${genderLabel}</span>
        <span>·</span>
        <span>${age}세</span>
        ${patient.regNo ? `<span>·</span><span class="font-mono text-xs text-slate-400">#${patient.regNo}</span>` : ''}
        ${patient.customRef ? `<span>·</span><span class="text-xs text-slate-400">관리: ${patient.customRef}</span>` : ''}
      </div>
    </div>
  `;
}
