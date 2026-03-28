export function exportCSV(patient) {
  if (!patient || !patient.records) return;
  const header = '날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct\n';
  const rows = patient.records.map(r => `${r.date},${r.age},${r.odAL},${r.osAL},${r.odSE ?? ''},${r.osSE ?? ''},${r.odPct ?? ''},${r.osPct ?? ''}`).join('\n');
  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${patient.name}_measurements.csv`;
  link.click();
}
