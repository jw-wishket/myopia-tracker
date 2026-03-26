export const MOCK_USERS = {
  doctor1: { id: 'doctor1', email: 'doctor@example.com', name: '홍길동', role: 'doctor', approved: true, clinicId: 'clinic1', clinicName: 'OO안과' },
  customer1: { id: 'customer1', email: 'parent@example.com', name: '김영희', role: 'customer', clinicId: 'clinic1', clinicName: 'OO안과', children: [
    { name: '김민준', birthDate: '2016-03-15' },
    { name: '이서연', birthDate: '2015-07-22' },
  ]},
  admin1: { id: 'admin1', email: 'admin@example.com', name: '관리자', role: 'admin' },
};

export const MOCK_CLINICS = [
  { id: 'clinic1', name: 'OO안과', createdBy: 'doctor1' },
  { id: 'clinic2', name: '밝은눈안과', createdBy: 'doctor2' },
  { id: 'clinic3', name: '새빛안과', createdBy: 'doctor3' },
];

export const MOCK_PATIENTS = [
  {
    id: 'p1', regNo: '2024-001', name: '김민준', birthDate: '2016-03-15', gender: 'male', clinicId: 'clinic1',
    records: [
      { date: '2023-03-20', age: 7.0, odAL: 22.85, osAL: 22.90, odSE: -0.50, osSE: -0.75, odPct: 45, osPct: 48 },
      { date: '2023-09-15', age: 7.5, odAL: 23.15, osAL: 23.20, odSE: -1.00, osSE: -1.25, odPct: 52, osPct: 55 },
      { date: '2024-03-18', age: 8.0, odAL: 23.45, osAL: 23.52, odSE: -1.50, osSE: -1.75, odPct: 58, osPct: 61 },
      { date: '2024-09-20', age: 8.5, odAL: 23.68, osAL: 23.75, odSE: -2.00, osSE: -2.25, odPct: 62, osPct: 65 },
      { date: '2025-02-10', age: 8.9, odAL: 23.82, osAL: 23.88, odSE: -2.25, osSE: -2.50, odPct: 64, osPct: 66 },
    ],
    treatments: [{ type: '아트로핀 0.01%', date: '2024-03-18', age: 8.0 }],
  },
  {
    id: 'p2', regNo: '2024-002', name: '이서연', birthDate: '2015-07-22', gender: 'female', clinicId: 'clinic1',
    records: [
      { date: '2023-01-10', age: 7.5, odAL: 22.50, osAL: 22.45, odSE: -0.25, osSE: -0.25, odPct: 42, osPct: 40 },
      { date: '2023-07-15', age: 8.0, odAL: 22.78, osAL: 22.72, odSE: -0.75, osSE: -0.50, odPct: 48, osPct: 45 },
      { date: '2024-01-20', age: 8.5, odAL: 23.05, osAL: 23.00, odSE: -1.25, osSE: -1.00, odPct: 55, osPct: 52 },
      { date: '2024-07-18', age: 9.0, odAL: 23.28, osAL: 23.22, odSE: -1.75, osSE: -1.50, odPct: 58, osPct: 55 },
    ],
    treatments: [{ type: '드림렌즈', date: '2024-01-20', age: 8.5 }],
  },
  {
    id: 'p3', regNo: '2024-003', name: '박지호', birthDate: '2014-11-08', gender: 'male', clinicId: 'clinic1',
    records: [
      { date: '2022-11-15', age: 8.0, odAL: 23.80, osAL: 23.75, odSE: -2.00, osSE: -1.75, odPct: 68, osPct: 65 },
      { date: '2023-05-20', age: 8.5, odAL: 24.20, osAL: 24.15, odSE: -2.75, osSE: -2.50, odPct: 75, osPct: 72 },
      { date: '2023-11-18', age: 9.0, odAL: 24.55, osAL: 24.48, odSE: -3.50, osSE: -3.25, odPct: 80, osPct: 78 },
      { date: '2024-05-22', age: 9.5, odAL: 24.75, osAL: 24.68, odSE: -3.75, osSE: -3.50, odPct: 82, osPct: 80 },
      { date: '2024-11-20', age: 10.0, odAL: 24.90, osAL: 24.82, odSE: -4.00, osSE: -3.75, odPct: 83, osPct: 81 },
    ],
    treatments: [
      { type: '아트로핀 0.025%', date: '2023-05-20', age: 8.5 },
      { type: '아트로핀 0.05%', date: '2024-05-22', age: 9.5 },
    ],
  },
];

export const MOCK_APPROVAL_REQUESTS = [
  { id: 'ar1', userId: 'doc_pending1', email: 'park@example.com', name: '박지훈', clinicName: '새빛안과', status: 'pending', createdAt: '2024-01-15' },
  { id: 'ar2', userId: 'doc_pending2', email: 'lee@example.com', name: '이수진', clinicName: '밝은눈안과', status: 'pending', createdAt: '2024-01-20' },
];
