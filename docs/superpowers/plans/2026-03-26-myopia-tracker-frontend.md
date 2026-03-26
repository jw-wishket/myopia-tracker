# Myopia Tracker Frontend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a complete responsive SPA for myopia management tracking with mock data, ready for Supabase integration later.

**Architecture:** Vite + vanilla JS with ES modules for a clean, modern build. Tailwind CSS for responsive design matching the Stitch design system (Geist font, subtle borders, tonal-spot colors). SPA routing via hash-based router. All data operations go through a `dataService` module that currently uses localStorage/mock data but exposes the same API that Supabase will later implement.

**Tech Stack:** Vite, Tailwind CSS v3, Chart.js + annotation plugin, vanilla ES modules, localStorage

---

## File Structure

```
eyes/
├── index.html                    # Entry point (Vite)
├── package.json                  # Dependencies
├── vite.config.js                # Vite config
├── tailwind.config.js            # Tailwind config
├── postcss.config.js             # PostCSS config
├── public/
│   └── favicon.svg               # App icon
├── src/
│   ├── main.js                   # App entry: router init, auth check
│   ├── style.css                 # Tailwind directives + custom styles
│   ├── router.js                 # Hash-based SPA router
│   ├── state.js                  # Global app state (current user, patient, etc.)
│   ├── constants.js              # Percentile data, treatment colors, config
│   ├── utils.js                  # calcAge, calcPct, interpolateValue, helpers
│   ├── data/
│   │   ├── mockData.js           # Demo patients, users, clinics
│   │   └── dataService.js        # CRUD operations (localStorage now, Supabase later)
│   ├── components/
│   │   ├── navbar.js             # Top navigation bar
│   │   ├── bottomNav.js          # Mobile bottom navigation
│   │   ├── sidebar.js            # Doctor dashboard sidebar (patient list)
│   │   ├── statsCard.js          # Eye measurement stats display
│   │   ├── treatmentTags.js      # Treatment tag pills
│   │   ├── measurementTable.js   # Measurement records table
│   │   ├── growthChart.js        # Chart.js growth curve with percentiles
│   │   ├── progressChart.js      # Chart.js AL/SE progress over time
│   │   ├── patientInfoBar.js     # Patient info header bar
│   │   └── modal.js              # Generic modal component
│   └── screens/
│       ├── loginScreen.js        # Login / patient search / register tabs
│       ├── registerScreen.js     # Step wizard: role → clinic → children
│       ├── doctorScreen.js       # Doctor dashboard (main)
│       ├── customerScreen.js     # Parent read-only dashboard
│       ├── adminScreen.js        # Admin approval + stats dashboard
│       └── pendingScreen.js      # Doctor approval pending screen
└── reference-index.html          # Original reference (renamed from index.html)
```

Each screen module exports a `render(container)` function. Each component exports a `render()` or `create()` function returning an HTML string or DOM element. The router calls the appropriate screen's render function based on the hash.

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `vite.config.js`
- Create: `tailwind.config.js`
- Create: `postcss.config.js`
- Create: `index.html` (Vite entry - rename old one first)
- Create: `src/style.css`
- Create: `src/main.js`
- Create: `public/favicon.svg`

- [ ] **Step 1: Rename reference file**

```bash
cd C:\Users\JWLabs\Documents\eyes
mv index.html reference-index.html
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "myopia-tracker",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  }
}
```

- [ ] **Step 3: Install dependencies**

```bash
npm install vite tailwindcss @tailwindcss/vite chart.js chartjs-plugin-annotation --save-dev
```

- [ ] **Step 4: Create vite.config.js**

```js
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [tailwindcss()],
  root: '.',
  build: {
    outDir: 'dist',
  },
});
```

- [ ] **Step 5: Create src/style.css**

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&display=swap');

@theme {
  --font-sans: 'Geist', 'Noto Sans KR', system-ui, sans-serif;
  --color-primary-50: #eff6ff;
  --color-primary-100: #dbeafe;
  --color-primary-200: #bfdbfe;
  --color-primary-300: #93c5fd;
  --color-primary-400: #60a5fa;
  --color-primary-500: #3b82f6;
  --color-primary-600: #2563eb;
  --color-primary-700: #1d4ed8;
  --color-primary-800: #1e40af;
  --color-primary-900: #1e3a8a;
  --color-od: #0891b2;
  --color-os: #e11d48;
  --color-od-light: #ecfeff;
  --color-os-light: #fff1f2;
}

/* Smooth transitions for screen changes */
#app {
  min-height: 100vh;
}

/* Chart container responsive */
.chart-container {
  position: relative;
  width: 100%;
}

/* Scrollbar styling */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: #cbd5e1;
  border-radius: 3px;
}

/* Mobile bottom nav safe area */
.has-bottom-nav {
  padding-bottom: 80px;
}

@media (min-width: 768px) {
  .has-bottom-nav {
    padding-bottom: 0;
  }
}
```

- [ ] **Step 6: Create index.html (Vite entry)**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>근시관리 트래커</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body class="bg-slate-50 text-slate-800 font-sans antialiased">
  <div id="app"></div>
  <script type="module" src="/src/main.js"></script>
</body>
</html>
```

- [ ] **Step 7: Create public/favicon.svg**

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <circle cx="16" cy="16" r="14" fill="#2563eb"/>
  <circle cx="16" cy="16" r="6" fill="white"/>
  <circle cx="16" cy="16" r="3" fill="#2563eb"/>
</svg>
```

- [ ] **Step 8: Create placeholder main.js**

```js
import './style.css';

document.getElementById('app').innerHTML = `
  <div class="flex items-center justify-center min-h-screen">
    <p class="text-slate-400">Loading...</p>
  </div>
`;
```

- [ ] **Step 9: Verify dev server starts**

```bash
npx vite --open
```

Expected: Browser opens with "Loading..." text on a light slate background with Geist font.

- [ ] **Step 10: Commit**

```bash
git init
echo "node_modules\ndist\n.DS_Store" > .gitignore
git add -A
git commit -m "feat: scaffold Vite + Tailwind project for myopia tracker"
```

---

### Task 2: Constants, Utils, and Data Layer

**Files:**
- Create: `src/constants.js`
- Create: `src/utils.js`
- Create: `src/data/mockData.js`
- Create: `src/data/dataService.js`
- Create: `src/state.js`

- [ ] **Step 1: Create src/constants.js**

```js
export const PERCENTILE_DATA = {
  male: [
    {Age:4,P3:21.26,P5:21.41,P10:21.63,P25:21.99,P50:22.39,P75:22.78,P90:23.13,P95:23.33},
    {Age:5,P3:21.49,P5:21.64,P10:21.87,P25:22.26,P50:22.69,P75:23.12,P90:23.51,P95:23.74},
    {Age:6,P3:21.71,P5:21.86,P10:22.1,P25:22.51,P50:22.97,P75:23.45,P90:23.88,P95:24.15},
    {Age:7,P3:21.91,P5:22.07,P10:22.32,P25:22.75,P50:23.25,P75:23.76,P90:24.24,P95:24.54},
    {Age:8,P3:22.09,P5:22.26,P10:22.53,P25:22.98,P50:23.51,P75:24.07,P90:24.6,P95:24.92},
    {Age:9,P3:22.27,P5:22.44,P10:22.72,P25:23.19,P50:23.76,P75:24.36,P90:24.93,P95:25.3},
    {Age:10,P3:22.42,P5:22.6,P10:22.89,P25:23.4,P50:23.99,P75:24.64,P90:25.26,P95:25.65},
    {Age:11,P3:22.56,P5:22.75,P10:23.05,P25:23.58,P50:24.22,P75:24.9,P90:25.57,P95:25.99},
    {Age:12,P3:22.68,P5:22.88,P10:23.2,P25:23.76,P50:24.43,P75:25.15,P90:25.86,P95:26.31},
    {Age:13,P3:22.78,P5:22.99,P10:23.33,P25:23.92,P50:24.62,P75:25.39,P90:26.14,P95:26.61},
    {Age:14,P3:22.86,P5:23.08,P10:23.44,P25:24.06,P50:24.81,P75:25.61,P90:26.39,P95:26.89},
    {Age:15,P3:22.91,P5:23.15,P10:23.53,P25:24.19,P50:24.98,P75:25.82,P90:26.63,P95:27.14},
    {Age:16,P3:22.94,P5:23.2,P10:23.6,P25:24.31,P50:25.13,P75:26.01,P90:26.84,P95:27.36},
    {Age:17,P3:22.95,P5:23.23,P10:23.66,P25:24.41,P50:25.28,P75:26.18,P90:27.04,P95:27.56},
    {Age:18,P3:22.92,P5:23.22,P10:23.69,P25:24.5,P50:25.41,P75:26.35,P90:27.21,P95:27.74},
  ],
  female: [
    {Age:4,P3:20.74,P5:20.87,P10:21.08,P25:21.41,P50:21.78,P75:22.14,P90:22.46,P95:22.66},
    {Age:5,P3:20.96,P5:21.11,P10:21.33,P25:21.69,P50:22.1,P75:22.5,P90:22.87,P95:23.08},
    {Age:6,P3:21.17,P5:21.33,P10:21.56,P25:21.96,P50:22.41,P75:22.85,P90:23.26,P95:23.5},
    {Age:7,P3:21.37,P5:21.53,P10:21.79,P25:22.22,P50:22.7,P75:23.19,P90:23.63,P95:23.9},
    {Age:8,P3:21.56,P5:21.73,P10:22.0,P25:22.46,P50:22.98,P75:23.51,P90:23.99,P95:24.28},
    {Age:9,P3:21.73,P5:21.92,P10:22.21,P25:22.7,P50:23.25,P75:23.82,P90:24.34,P95:24.65},
    {Age:10,P3:21.89,P5:22.09,P10:22.4,P25:22.92,P50:23.51,P75:24.11,P90:24.67,P95:25.01},
    {Age:11,P3:22.04,P5:22.25,P10:22.57,P25:23.12,P50:23.75,P75:24.39,P90:24.98,P95:25.34},
    {Age:12,P3:22.18,P5:22.39,P10:22.73,P25:23.31,P50:23.97,P75:24.65,P90:25.28,P95:25.66},
    {Age:13,P3:22.29,P5:22.53,P10:22.88,P25:23.49,P50:24.19,P75:24.9,P90:25.55,P95:25.95},
    {Age:14,P3:22.4,P5:22.64,P10:23.02,P25:23.66,P50:24.39,P75:25.13,P90:25.81,P95:26.22},
    {Age:15,P3:22.48,P5:22.74,P10:23.14,P25:23.81,P50:24.57,P75:25.34,P90:26.05,P95:26.47},
    {Age:16,P3:22.55,P5:22.82,P10:23.24,P25:23.95,P50:24.75,P75:25.54,P90:26.27,P95:26.7},
    {Age:17,P3:22.59,P5:22.89,P10:23.33,P25:24.08,P50:24.91,P75:25.73,P90:26.46,P95:26.9},
    {Age:18,P3:22.61,P5:22.93,P10:23.41,P25:24.19,P50:25.05,P75:25.89,P90:26.64,P95:27.08},
  ],
};

export const TREATMENT_COLORS = {
  '아트로핀 0.01%': '#dc2626',
  '아트로핀 0.025%': '#ea580c',
  '아트로핀 0.05%': '#d97706',
  '아트로핀 0.1%': '#65a30d',
  '드림렌즈': '#059669',
  '마이사이트': '#0891b2',
  'PPSL': '#7c3aed',
};

export const TREATMENT_TYPES = Object.keys(TREATMENT_COLORS);

export const OD_COLOR = '#0891b2';
export const OS_COLOR = '#e11d48';

export const PERCENTILE_CURVE_STYLES = {
  P95: { color: '#dc2626', width: 2, dash: [6,3] },
  P90: { color: '#ea580c', width: 1.5, dash: [4,4] },
  P75: { color: '#f59e0b', width: 2, dash: [6,3] },
  P50: { color: '#16a34a', width: 3, dash: [] },
  P25: { color: '#6b7280', width: 2, dash: [6,3] },
  P10: { color: '#9ca3af', width: 1.5, dash: [4,4] },
  P5:  { color: '#d1d5db', width: 2, dash: [6,3] },
};
```

- [ ] **Step 2: Create src/utils.js**

```js
import { PERCENTILE_DATA } from './constants.js';

export function calcAge(birth, date) {
  const b = new Date(birth), d = new Date(date || new Date());
  return Math.round((d.getFullYear()-b.getFullYear()+(d.getMonth()-b.getMonth())/12+(d.getDate()-b.getDate())/365.25)*10)/10;
}

export function interpolateValue(data, age, key) {
  if (age <= data[0].Age) return data[0][key];
  if (age >= data[data.length-1].Age) return data[data.length-1][key];
  for (let i = 0; i < data.length-1; i++) {
    if (data[i].Age <= age && data[i+1].Age >= age) {
      const r = (age - data[i].Age) / (data[i+1].Age - data[i].Age);
      return data[i][key] + r * (data[i+1][key] - data[i][key]);
    }
  }
  return data[0][key];
}

export function calcPct(gender, age, al) {
  const data = PERCENTILE_DATA[gender];
  if (!data || age < 4 || age > 18) return null;
  const refs = {};
  ['P3','P5','P10','P25','P50','P75','P90','P95'].forEach(k => refs[k] = interpolateValue(data, age, k));
  if (al <= refs.P3) return '<3';
  if (al >= refs.P95) return '>95';
  const pcts = [['P3',3],['P5',5],['P10',10],['P25',25],['P50',50],['P75',75],['P90',90],['P95',95]];
  for (let i = 0; i < pcts.length-1; i++) {
    if (al >= refs[pcts[i][0]] && al <= refs[pcts[i+1][0]]) {
      return Math.round(pcts[i][1] + (al - refs[pcts[i][0]]) / (refs[pcts[i+1][0]] - refs[pcts[i][0]]) * (pcts[i+1][1] - pcts[i][1]));
    }
  }
  return 50;
}

export function generateCurveData(gender, pKey) {
  const data = PERCENTILE_DATA[gender];
  const points = [];
  for (let age = 4; age <= 18; age += 0.5)
    points.push({ x: age, y: interpolateValue(data, age, pKey) });
  return points;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`;
}

export function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function pctBadgeClass(pct) {
  if (pct === null || pct === undefined) return 'bg-slate-100 text-slate-500';
  const n = typeof pct === 'string' ? parseInt(pct) : pct;
  if (isNaN(n) || n <= 50) return 'bg-emerald-50 text-emerald-700';
  if (n <= 75) return 'bg-amber-50 text-amber-700';
  return 'bg-red-50 text-red-700';
}

export function progressLabel(records) {
  if (!records || records.length < 2) return { text: '데이터 부족', cls: 'text-slate-400' };
  const last = records[records.length - 1];
  const prev = records[records.length - 2];
  const months = (new Date(last.date) - new Date(prev.date)) / (1000*60*60*24*30.44);
  if (months <= 0) return { text: '-', cls: 'text-slate-400' };
  const rate = ((last.odAL - prev.odAL) / months * 12).toFixed(2);
  if (rate <= 0.1) return { text: `${rate}mm/년 · 안정`, cls: 'text-emerald-600' };
  if (rate <= 0.3) return { text: `${rate}mm/년 · 보통`, cls: 'text-amber-600' };
  return { text: `${rate}mm/년 · 빠름`, cls: 'text-red-600' };
}
```

- [ ] **Step 3: Create src/data/mockData.js**

```js
export const MOCK_USERS = {
  doctor1: { id: 'doctor1', email: 'doctor@example.com', name: '홍길동', role: 'doctor', approved: true, clinicId: 'clinic1', clinicName: 'OO안과' },
  customer1: { id: 'customer1', email: 'parent@example.com', name: '김영희', role: 'customer', clinicId: 'clinic1', clinicName: 'OO안과', children: [
    { name: '김민준', birthDate: '2016-03-15' },
    { name: '김서연', birthDate: '2015-07-22' },
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
```

- [ ] **Step 4: Create src/data/dataService.js**

```js
import { MOCK_PATIENTS, MOCK_USERS, MOCK_CLINICS, MOCK_APPROVAL_REQUESTS } from './mockData.js';
import { calcAge, calcPct } from '../utils.js';

const STORAGE_KEY = 'myopia_tracker_data';

function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  const store = {
    patients: [...MOCK_PATIENTS],
    users: { ...MOCK_USERS },
    clinics: [...MOCK_CLINICS],
    approvalRequests: [...MOCK_APPROVAL_REQUESTS],
    currentUserId: null,
  };
  saveStore(store);
  return store;
}

function saveStore(store) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

function getStore() {
  return loadStore();
}

// Auth
export function login(role) {
  const store = getStore();
  const userMap = { doctor: 'doctor1', customer: 'customer1', admin: 'admin1' };
  store.currentUserId = userMap[role] || null;
  saveStore(store);
  return store.users[store.currentUserId] || null;
}

export function logout() {
  const store = getStore();
  store.currentUserId = null;
  saveStore(store);
}

export function getCurrentUser() {
  const store = getStore();
  if (!store.currentUserId) return null;
  return store.users[store.currentUserId] || null;
}

// Patients
export function getPatients(clinicId) {
  const store = getStore();
  if (clinicId) return store.patients.filter(p => p.clinicId === clinicId);
  return store.patients;
}

export function getPatientById(id) {
  return getStore().patients.find(p => p.id === id) || null;
}

export function searchPatients(query, clinicId) {
  const q = query.toLowerCase();
  return getPatients(clinicId).filter(p =>
    p.name.toLowerCase().includes(q) || p.regNo.toLowerCase().includes(q)
  );
}

export function searchPatientByInfo(name, birthDate) {
  return getStore().patients.find(p => p.name === name && p.birthDate === birthDate) || null;
}

export function addPatient(patient) {
  const store = getStore();
  const id = 'p' + Date.now();
  const newPatient = { ...patient, id, records: [], treatments: [] };
  store.patients.push(newPatient);
  saveStore(store);
  return newPatient;
}

export function deletePatient(id) {
  const store = getStore();
  store.patients = store.patients.filter(p => p.id !== id);
  saveStore(store);
}

// Measurements
export function addMeasurement(patientId, record) {
  const store = getStore();
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return null;
  const age = calcAge(patient.birthDate, record.date);
  const odPct = calcPct(patient.gender, age, record.odAL);
  const osPct = calcPct(patient.gender, age, record.osAL);
  const fullRecord = { ...record, age, odPct, osPct };
  patient.records.push(fullRecord);
  patient.records.sort((a, b) => new Date(a.date) - new Date(b.date));
  saveStore(store);
  return fullRecord;
}

export function deleteRecord(patientId, index) {
  const store = getStore();
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return;
  patient.records.splice(index, 1);
  saveStore(store);
}

// Treatments
export function addTreatment(patientId, treatment) {
  const store = getStore();
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return null;
  const age = calcAge(patient.birthDate, treatment.date);
  const fullTreatment = { ...treatment, age };
  patient.treatments.push(fullTreatment);
  saveStore(store);
  return fullTreatment;
}

export function removeTreatment(patientId, index) {
  const store = getStore();
  const patient = store.patients.find(p => p.id === patientId);
  if (!patient) return;
  patient.treatments.splice(index, 1);
  saveStore(store);
}

// Clinics
export function getClinics() {
  return getStore().clinics;
}

// Admin
export function getApprovalRequests() {
  return getStore().approvalRequests.filter(r => r.status === 'pending');
}

export function approveRequest(id) {
  const store = getStore();
  const req = store.approvalRequests.find(r => r.id === id);
  if (req) req.status = 'approved';
  saveStore(store);
}

export function rejectRequest(id) {
  const store = getStore();
  const req = store.approvalRequests.find(r => r.id === id);
  if (req) req.status = 'rejected';
  saveStore(store);
}

export function getStats() {
  const store = getStore();
  return {
    totalPatients: store.patients.length,
    totalDoctors: Object.values(store.users).filter(u => u.role === 'doctor').length,
    totalClinics: store.clinics.length,
    pendingRequests: store.approvalRequests.filter(r => r.status === 'pending').length,
  };
}

// Reset
export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
}
```

- [ ] **Step 5: Create src/state.js**

```js
let _state = {
  currentUser: null,
  currentPatient: null,
  currentChartType: 'AL',
};

const listeners = new Set();

export function getState() {
  return _state;
}

export function setState(partial) {
  _state = { ..._state, ...partial };
  listeners.forEach(fn => fn(_state));
}

export function subscribe(fn) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
```

- [ ] **Step 6: Commit**

```bash
git add src/constants.js src/utils.js src/data/ src/state.js
git commit -m "feat: add constants, utils, mock data, and data service layer"
```

---

### Task 3: Router and Navbar Components

**Files:**
- Create: `src/router.js`
- Create: `src/components/navbar.js`
- Create: `src/components/bottomNav.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/router.js**

```js
const routes = {};
let currentCleanup = null;

export function registerRoute(hash, renderFn) {
  routes[hash] = renderFn;
}

export function navigate(hash) {
  window.location.hash = hash;
}

export function startRouter(container) {
  function handleRoute() {
    const hash = window.location.hash.slice(1) || 'login';
    const renderFn = routes[hash];
    if (currentCleanup) {
      currentCleanup();
      currentCleanup = null;
    }
    if (renderFn) {
      container.innerHTML = '';
      currentCleanup = renderFn(container) || null;
    } else {
      navigate('login');
    }
  }
  window.addEventListener('hashchange', handleRoute);
  handleRoute();
}
```

- [ ] **Step 2: Create src/components/navbar.js**

```js
import { getState } from '../state.js';
import { navigate } from '../router.js';
import { logout } from '../data/dataService.js';
import { setState } from '../state.js';

export function renderNavbar(options = {}) {
  const { title = '근시관리 트래커', subtitle = '', showBack = false, backTarget = 'login', user = null } = options;

  const userBadge = user ? `
    <div class="flex items-center gap-3">
      <div class="hidden sm:flex items-center gap-2 text-sm text-slate-600">
        <div class="w-8 h-8 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-xs font-semibold">
          ${user.name?.charAt(0) || '?'}
        </div>
        <span>${user.name}${user.clinicName ? ' · ' + user.clinicName : ''}</span>
      </div>
      <button id="navLogoutBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors" title="로그아웃">
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
      </button>
    </div>
  ` : '';

  const backBtn = showBack ? `
    <button id="navBackBtn" class="text-slate-400 hover:text-slate-600 p-2 rounded-lg hover:bg-slate-100 transition-colors mr-2">
      <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"/></svg>
    </button>
  ` : '';

  const html = `
    <nav class="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-200">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div class="flex items-center">
          ${backBtn}
          <div class="flex items-center gap-2 cursor-pointer" id="navLogo">
            <svg class="w-7 h-7 text-primary-600" viewBox="0 0 32 32" fill="currentColor"><circle cx="16" cy="16" r="14"/><circle cx="16" cy="16" r="6" fill="white"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>
            <span class="font-semibold text-slate-800 tracking-tight">${title}</span>
            ${subtitle ? `<span class="text-xs text-slate-400 hidden sm:inline">· ${subtitle}</span>` : ''}
          </div>
        </div>
        ${userBadge}
      </div>
    </nav>
  `;

  return {
    html,
    bind(container) {
      const logoutBtn = container.querySelector('#navLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
          logout();
          setState({ currentUser: null, currentPatient: null });
          navigate('login');
        });
      }
      const backBtnEl = container.querySelector('#navBackBtn');
      if (backBtnEl) {
        backBtnEl.addEventListener('click', () => navigate(backTarget));
      }
    }
  };
}
```

- [ ] **Step 3: Create src/components/bottomNav.js**

```js
import { navigate } from '../router.js';
import { getState } from '../state.js';

export function renderBottomNav(activeTab = 'patients') {
  const tabs = [
    { id: 'patients', icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>', label: '환자' },
    { id: 'chart', icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>', label: '차트' },
    { id: 'add', icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>', label: '측정' },
    { id: 'settings', icon: '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>', label: '설정' },
  ];

  return `
    <div class="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-slate-200 md:hidden z-50 safe-area-bottom">
      <div class="flex justify-around py-2">
        ${tabs.map(t => `
          <button class="bottom-nav-tab flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition-colors ${t.id === activeTab ? 'text-primary-600' : 'text-slate-400'}" data-tab="${t.id}">
            ${t.icon}
            <span class="text-[10px] font-medium">${t.label}</span>
          </button>
        `).join('')}
      </div>
    </div>
  `;
}
```

- [ ] **Step 4: Update src/main.js**

```js
import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { setState } from './state.js';

// Screens will be registered in subsequent tasks
// For now, register a placeholder login route

registerRoute('login', (container) => {
  container.innerHTML = `
    <div class="flex items-center justify-center min-h-screen">
      <div class="text-center">
        <h1 class="text-2xl font-semibold text-slate-800 mb-4">근시관리 트래커</h1>
        <p class="text-slate-500 mb-6">Myopia Management Tracker</p>
        <div class="space-y-3">
          <button class="demo-login w-48 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors" data-role="doctor">의사로 로그인</button><br>
          <button class="demo-login w-48 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" data-role="customer">보호자로 로그인</button><br>
          <button class="demo-login w-48 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors" data-role="admin">관리자로 로그인</button>
        </div>
      </div>
    </div>
  `;
  container.querySelectorAll('.demo-login').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      import('./data/dataService.js').then(ds => {
        const user = ds.login(role);
        setState({ currentUser: user });
        navigate(role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'doctor');
      });
    });
  });
});

// Check existing session
const user = getCurrentUser();
if (user) {
  setState({ currentUser: user });
}

const app = document.getElementById('app');
startRouter(app);
```

- [ ] **Step 5: Verify routing works**

```bash
npx vite
```

Expected: Login page shows with three demo buttons. Clicking navigates to `#doctor` / `#customer` / `#admin` (which show blank since screens aren't registered yet).

- [ ] **Step 6: Commit**

```bash
git add src/router.js src/components/navbar.js src/components/bottomNav.js src/main.js
git commit -m "feat: add hash router, navbar, and bottom nav components"
```

---

### Task 4: Shared UI Components

**Files:**
- Create: `src/components/statsCard.js`
- Create: `src/components/treatmentTags.js`
- Create: `src/components/measurementTable.js`
- Create: `src/components/patientInfoBar.js`
- Create: `src/components/modal.js`

- [ ] **Step 1: Create src/components/statsCard.js**

```js
import { pctBadgeClass } from '../utils.js';

export function renderStatsCard(patient) {
  if (!patient || !patient.records || patient.records.length === 0) {
    return `<div class="text-center py-8 text-slate-400">측정 기록이 없습니다</div>`;
  }
  const r = patient.records[patient.records.length - 1];

  function pctDisplay(val) {
    if (val === null || val === undefined) return '-';
    return typeof val === 'string' ? val : val + '%ile';
  }

  return `
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
      <div class="rounded-xl border border-slate-200 p-4 border-l-4 border-l-od">
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">우안 (OD)</div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">안축장</span>
            <span class="text-xl font-semibold text-slate-800">${r.odAL?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">mm</span></span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">굴절력</span>
            <span class="text-lg font-semibold text-slate-800">${r.odSE?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">D</span></span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-slate-500">백분위</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${pctBadgeClass(r.odPct)}">${pctDisplay(r.odPct)}</span>
          </div>
        </div>
      </div>
      <div class="rounded-xl border border-slate-200 p-4 border-l-4 border-l-os">
        <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-3">좌안 (OS)</div>
        <div class="space-y-2">
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">안축장</span>
            <span class="text-xl font-semibold text-slate-800">${r.osAL?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">mm</span></span>
          </div>
          <div class="flex justify-between items-baseline">
            <span class="text-sm text-slate-500">굴절력</span>
            <span class="text-lg font-semibold text-slate-800">${r.osSE?.toFixed(2) ?? '-'}<span class="text-xs text-slate-400 ml-1">D</span></span>
          </div>
          <div class="flex justify-between items-center">
            <span class="text-sm text-slate-500">백분위</span>
            <span class="px-2.5 py-0.5 rounded-full text-xs font-semibold ${pctBadgeClass(r.osPct)}">${pctDisplay(r.osPct)}</span>
          </div>
        </div>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: Create src/components/treatmentTags.js**

```js
import { TREATMENT_COLORS, TREATMENT_TYPES } from '../constants.js';
import { formatDate } from '../utils.js';

export function renderTreatmentTags(treatments, options = {}) {
  const { editable = false, onRemove = null, onAdd = null } = options;

  if (!treatments || treatments.length === 0) {
    const empty = editable ? '' : '<p class="text-sm text-slate-400">치료 기록이 없습니다</p>';
    return `
      <div class="flex flex-wrap items-center gap-2">
        ${empty}
        ${editable ? renderAddForm() : ''}
      </div>
    `;
  }

  const tags = treatments.map((t, i) => {
    const color = TREATMENT_COLORS[t.type] || '#7c3aed';
    return `
      <span class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border" style="border-color:${color}30; background:${color}10; color:${color}">
        <span class="w-2 h-2 rounded-full" style="background:${color}"></span>
        <span class="font-medium">${t.type}</span>
        <span class="text-xs opacity-70">${formatDate(t.date)}</span>
        ${editable ? `<button class="treatment-remove ml-1 hover:opacity-70" data-index="${i}">&times;</button>` : ''}
      </span>
    `;
  }).join('');

  return `
    <div class="flex flex-wrap items-center gap-2">
      ${tags}
      ${editable ? renderAddForm() : ''}
    </div>
  `;
}

function renderAddForm() {
  return `
    <button id="treatmentAddToggle" class="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-sm text-primary-600 border border-dashed border-primary-300 hover:bg-primary-50 transition-colors">
      <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
      추가
    </button>
    <div id="treatmentAddForm" class="hidden w-full mt-2 flex flex-wrap gap-2 items-end">
      <select id="treatmentTypeSelect" class="px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:border-primary-400">
        ${TREATMENT_TYPES.map(t => `<option value="${t}">${t}</option>`).join('')}
      </select>
      <input type="date" id="treatmentDateInput" class="px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400">
      <button id="treatmentAddConfirm" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm hover:bg-primary-700 transition-colors">추가</button>
    </div>
  `;
}
```

- [ ] **Step 3: Create src/components/measurementTable.js**

```js
import { formatDate, pctBadgeClass } from '../utils.js';

export function renderMeasurementTable(records, options = {}) {
  const { editable = false } = options;

  if (!records || records.length === 0) {
    return `<div class="text-center py-8 text-slate-400">측정 기록이 없습니다</div>`;
  }

  const rows = [...records].reverse().map((r, i) => {
    const realIndex = records.length - 1 - i;
    function pctCell(val) {
      if (val === null || val === undefined) return '<td class="px-3 py-2.5 text-sm text-slate-400">-</td>';
      const display = typeof val === 'string' ? val : val + '%';
      return `<td class="px-3 py-2.5"><span class="inline-block px-2 py-0.5 rounded-full text-xs font-medium ${pctBadgeClass(val)}">${display}</span></td>`;
    }
    return `
      <tr class="border-b border-slate-100 hover:bg-slate-50 transition-colors">
        <td class="px-3 py-2.5 text-sm text-slate-600 whitespace-nowrap">${formatDate(r.date)}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.age?.toFixed(1) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm font-medium text-od">${r.odAL?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm font-medium text-os">${r.osAL?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.odSE?.toFixed(2) ?? '-'}</td>
        <td class="px-3 py-2.5 text-sm text-slate-600">${r.osSE?.toFixed(2) ?? '-'}</td>
        ${pctCell(r.odPct)}
        ${pctCell(r.osPct)}
        ${editable ? `<td class="px-3 py-2.5"><button class="record-delete text-slate-300 hover:text-red-500 transition-colors" data-index="${realIndex}"><svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button></td>` : ''}
      </tr>
    `;
  }).join('');

  return `
    <div class="overflow-x-auto">
      <table class="w-full min-w-[640px]">
        <thead>
          <tr class="border-b border-slate-200">
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">날짜</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">나이</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-od uppercase tracking-wider">OD AL</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-os uppercase tracking-wider">OS AL</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OD SE</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OS SE</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OD %</th>
            <th class="px-3 py-2.5 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">OS %</th>
            ${editable ? '<th class="px-3 py-2.5 w-10"></th>' : ''}
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}
```

- [ ] **Step 4: Create src/components/patientInfoBar.js**

```js
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
      </div>
    </div>
  `;
}
```

- [ ] **Step 5: Create src/components/modal.js**

```js
export function openModal(title, contentHtml, options = {}) {
  const { onClose, width = 'max-w-lg' } = options;
  const overlay = document.createElement('div');
  overlay.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4';
  overlay.innerHTML = `
    <div class="absolute inset-0 bg-black/40 backdrop-blur-sm modal-backdrop"></div>
    <div class="${width} w-full bg-white rounded-2xl shadow-xl relative z-10 max-h-[90vh] overflow-y-auto">
      <div class="flex items-center justify-between p-5 border-b border-slate-100">
        <h3 class="text-lg font-semibold text-slate-800">${title}</h3>
        <button class="modal-close-btn text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="p-5">${contentHtml}</div>
    </div>
  `;

  function close() {
    overlay.remove();
    if (onClose) onClose();
  }

  overlay.querySelector('.modal-backdrop').addEventListener('click', close);
  overlay.querySelector('.modal-close-btn').addEventListener('click', close);
  document.body.appendChild(overlay);

  return { close, element: overlay };
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/
git commit -m "feat: add shared UI components (stats, treatments, table, modal)"
```

---

### Task 5: Chart Components

**Files:**
- Create: `src/components/growthChart.js`
- Create: `src/components/progressChart.js`

- [ ] **Step 1: Create src/components/growthChart.js**

```js
import { Chart, registerables } from 'chart.js';
import annotationPlugin from 'chartjs-plugin-annotation';
import { OD_COLOR, OS_COLOR, TREATMENT_COLORS, PERCENTILE_CURVE_STYLES } from '../constants.js';
import { generateCurveData } from '../utils.js';

Chart.register(...registerables, annotationPlugin);

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
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded border-dashed" style="background:#f59e0b"></span>P75</span>
      <span class="flex items-center gap-1.5"><span class="w-5 h-0.5 rounded border-dashed" style="background:#dc2626"></span>P95</span>
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
```

- [ ] **Step 2: Create src/components/progressChart.js**

```js
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
```

- [ ] **Step 3: Commit**

```bash
git add src/components/growthChart.js src/components/progressChart.js
git commit -m "feat: add Chart.js growth curve and progress chart components"
```

---

### Task 6: Login Screen

**Files:**
- Create: `src/screens/loginScreen.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/screens/loginScreen.js**

```js
import { renderNavbar } from '../components/navbar.js';
import { login, searchPatientByInfo } from '../data/dataService.js';
import { setState } from '../state.js';
import { navigate } from '../router.js';
import { todayStr } from '../utils.js';

export function renderLoginScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커' });

  container.innerHTML = `
    ${nav.html}
    <div class="min-h-[calc(100vh-56px)] flex items-center justify-center p-4">
      <div class="w-full max-w-md">
        <div class="text-center mb-8">
          <svg class="w-12 h-12 mx-auto text-primary-600 mb-3" viewBox="0 0 32 32" fill="currentColor"><circle cx="16" cy="16" r="14"/><circle cx="16" cy="16" r="6" fill="white"/><circle cx="16" cy="16" r="3" fill="currentColor"/></svg>
          <h1 class="text-2xl font-semibold text-slate-800 tracking-tight">근시관리 트래커</h1>
          <p class="text-sm text-slate-500 mt-1">근시 관리 기록을 확인하세요</p>
        </div>

        <div class="bg-white rounded-2xl border border-slate-200 overflow-hidden">
          <div class="flex border-b border-slate-200">
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-primary-600 bg-primary-50 border-b-2 border-primary-600" data-tab="search">환자조회</button>
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-slate-500 hover:text-slate-700" data-tab="login">로그인</button>
            <button class="login-tab flex-1 py-3 text-sm font-medium text-center transition-colors text-slate-500 hover:text-slate-700" data-tab="register">회원가입</button>
          </div>

          <div class="p-6">
            <!-- Search Tab -->
            <div id="tab-search" class="tab-content">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
                  <input type="text" id="searchName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="홍길동">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
                  <input type="date" id="searchBirth" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">등록번호</label>
                  <input type="text" id="searchRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="2024-001">
                </div>
                <div id="searchError" class="hidden text-sm text-red-500 text-center"></div>
                <button id="searchBtn" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors flex items-center justify-center gap-2">
                  조회하기
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
                </button>
              </div>
            </div>

            <!-- Login Tab -->
            <div id="tab-login" class="tab-content hidden">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">이메일</label>
                  <input type="email" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <button class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors">로그인</button>
                <p class="text-center text-sm text-primary-600 cursor-pointer hover:underline">비밀번호 찾기</p>
              </div>
            </div>

            <!-- Register Tab -->
            <div id="tab-register" class="tab-content hidden">
              <div class="space-y-4">
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">이메일</label>
                  <input type="email" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="email@example.com">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="8자 이상">
                </div>
                <div>
                  <label class="block text-sm font-medium text-slate-600 mb-1.5">비밀번호 확인</label>
                  <input type="password" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 focus:ring-2 focus:ring-primary-100 transition" placeholder="••••••••">
                </div>
                <button class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors" onclick="location.hash='register'">회원가입</button>
              </div>
            </div>
          </div>

          <!-- Divider -->
          <div class="px-6">
            <div class="flex items-center gap-3 text-slate-400 text-xs">
              <div class="flex-1 border-t border-slate-200"></div>
              <span>또는</span>
              <div class="flex-1 border-t border-slate-200"></div>
            </div>
          </div>

          <!-- Demo Buttons -->
          <div class="p-6 pt-4 space-y-2.5">
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="doctor">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
              의사 체험하기
            </button>
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="customer">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              보호자 체험하기
            </button>
            <button class="demo-login w-full py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors flex items-center justify-center gap-2" data-role="admin">
              <svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
              관리자 체험하기
            </button>
          </div>
        </div>

        <p class="text-center text-xs text-slate-400 mt-4">
          의사: 환자 관리 · 보호자: 기록 조회 · 체험: 둘러보기
        </p>
      </div>
    </div>
  `;

  // Tab switching
  container.querySelectorAll('.login-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      container.querySelectorAll('.login-tab').forEach(t => {
        t.classList.remove('text-primary-600', 'bg-primary-50', 'border-b-2', 'border-primary-600');
        t.classList.add('text-slate-500');
      });
      tab.classList.add('text-primary-600', 'bg-primary-50', 'border-b-2', 'border-primary-600');
      tab.classList.remove('text-slate-500');
      container.querySelectorAll('.tab-content').forEach(c => c.classList.add('hidden'));
      container.querySelector(`#tab-${tab.dataset.tab}`).classList.remove('hidden');
    });
  });

  // Patient search
  container.querySelector('#searchBtn').addEventListener('click', () => {
    const name = container.querySelector('#searchName').value.trim();
    const birth = container.querySelector('#searchBirth').value;
    const errEl = container.querySelector('#searchError');
    if (!name || !birth) {
      errEl.textContent = '이름과 생년월일을 입력해주세요';
      errEl.classList.remove('hidden');
      return;
    }
    const patient = searchPatientByInfo(name, birth);
    if (patient) {
      setState({ currentPatient: patient });
      navigate('patient-result');
    } else {
      errEl.textContent = '일치하는 환자를 찾을 수 없습니다';
      errEl.classList.remove('hidden');
    }
  });

  // Demo logins
  container.querySelectorAll('.demo-login').forEach(btn => {
    btn.addEventListener('click', () => {
      const role = btn.dataset.role;
      const user = login(role);
      setState({ currentUser: user });
      navigate(role === 'admin' ? 'admin' : role === 'customer' ? 'customer' : 'doctor');
    });
  });

  nav.bind(container);
}
```

- [ ] **Step 2: Update src/main.js to use real screens**

```js
import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { setState } from './state.js';
import { renderLoginScreen } from './screens/loginScreen.js';

registerRoute('login', renderLoginScreen);

// Placeholder routes for other screens (will be replaced in subsequent tasks)
['doctor', 'customer', 'admin', 'register', 'patient-result', 'pending'].forEach(route => {
  registerRoute(route, (container) => {
    container.innerHTML = `<div class="flex items-center justify-center min-h-screen"><p class="text-slate-400">${route} screen - coming soon</p></div>`;
  });
});

const user = getCurrentUser();
if (user) {
  setState({ currentUser: user });
  const route = user.role === 'admin' ? 'admin' : user.role === 'customer' ? 'customer' : 'doctor';
  window.location.hash = route;
}

startRouter(document.getElementById('app'));
```

- [ ] **Step 3: Verify login screen renders**

```bash
npx vite
```

Expected: Modern login screen with tabs, demo buttons, clean design.

- [ ] **Step 4: Commit**

```bash
git add src/screens/loginScreen.js src/main.js
git commit -m "feat: add modern login screen with tabs, search, and demo login"
```

---

### Task 7: Doctor Dashboard Screen

**Files:**
- Create: `src/screens/doctorScreen.js`
- Create: `src/components/sidebar.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/components/sidebar.js**

```js
export function renderSidebar(patients, selectedId, options = {}) {
  const { onSelect, onAdd, searchQuery = '' } = options;

  const items = patients.map(p => `
    <button class="sidebar-patient w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors ${p.id === selectedId ? 'bg-primary-50 text-primary-700 font-medium' : 'text-slate-600 hover:bg-slate-50'}" data-id="${p.id}">
      <div class="font-medium">${p.name}</div>
      <div class="text-xs ${p.id === selectedId ? 'text-primary-500' : 'text-slate-400'}">${p.birthDate} · ${p.gender === 'male' ? '남' : '여'}</div>
    </button>
  `).join('');

  return `
    <div class="hidden md:flex flex-col w-60 border-r border-slate-200 bg-white h-[calc(100vh-56px)] sticky top-14">
      <div class="p-3">
        <input type="text" id="sidebarSearch" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-primary-400 transition" placeholder="환자 검색..." value="${searchQuery}">
      </div>
      <div class="flex-1 overflow-y-auto px-2 space-y-0.5">
        ${items || '<p class="text-center text-sm text-slate-400 py-4">환자가 없습니다</p>'}
      </div>
      <div class="p-3 border-t border-slate-200">
        <button id="sidebarAddBtn" class="w-full py-2 text-sm font-medium text-primary-600 border border-dashed border-primary-300 rounded-lg hover:bg-primary-50 transition-colors flex items-center justify-center gap-1">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
          새 환자
        </button>
      </div>
    </div>
  `;
}
```

- [ ] **Step 2: Create src/screens/doctorScreen.js**

Complete doctor dashboard with sidebar, patient detail, charts, measurements, treatments. This is the largest screen. The file renders:

1. Navbar with doctor info
2. Sidebar with patient list (desktop) / horizontal scroll chips (mobile)
3. Patient detail area: info bar, stats, charts, treatments, measurement table
4. Add measurement modal
5. Add patient modal

```js
import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderSidebar } from '../components/sidebar.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { renderProgressChart, initProgressChart, destroyProgressChart } from '../components/progressChart.js';
import { openModal } from '../components/modal.js';
import { getState, setState } from '../state.js';
import { getPatients, searchPatients, getPatientById, addPatient, addMeasurement, deleteRecord, addTreatment, removeTreatment, deletePatient } from '../data/dataService.js';
import { todayStr, calcAge, progressLabel } from '../utils.js';

let currentSearchQuery = '';

export function renderDoctorScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const patients = currentSearchQuery
    ? searchPatients(currentSearchQuery, user.clinicId)
    : getPatients(user.clinicId);

  const selectedPatient = getState().currentPatient || patients[0] || null;
  if (selectedPatient && !getState().currentPatient) {
    setState({ currentPatient: selectedPatient });
  }

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: user.clinicName, user });
  const sidebar = renderSidebar(patients, selectedPatient?.id, { searchQuery: currentSearchQuery });

  container.innerHTML = `
    ${nav.html}
    <div class="flex">
      ${sidebar}
      <main class="flex-1 min-h-[calc(100vh-56px)] has-bottom-nav">
        ${renderPatientContent(selectedPatient, patients)}
      </main>
    </div>
    ${renderBottomNav('patients')}
  `;

  nav.bind(container);
  bindDoctorEvents(container, user, patients, selectedPatient);

  if (selectedPatient) {
    initGrowthChart('growthChart', selectedPatient);
    initProgressChart(selectedPatient, getState().currentChartType || 'AL');
  }

  return () => {
    destroyChart('growthChart');
    destroyProgressChart();
  };
}

function renderPatientContent(patient, patients) {
  if (!patient) {
    return `
      <div class="flex flex-col items-center justify-center h-full text-slate-400 p-8">
        <svg class="w-16 h-16 mb-4 text-slate-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
        <p class="text-lg font-medium">환자를 선택하세요</p>
        <p class="text-sm mt-1">좌측 목록에서 환자를 선택하거나 새 환자를 등록하세요</p>
      </div>
    `;
  }

  const prog = progressLabel(patient.records);

  // Mobile patient chips
  const mobileChips = `
    <div class="md:hidden overflow-x-auto px-4 py-3 flex gap-2 border-b border-slate-200 bg-white">
      <input type="text" id="mobileSearch" class="flex-shrink-0 w-32 px-3 py-1.5 border border-slate-200 rounded-full text-xs focus:outline-none" placeholder="검색...">
      ${patients.map(p => `
        <button class="mobile-patient-chip flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${p.id === patient.id ? 'bg-primary-600 text-white' : 'bg-slate-100 text-slate-600'}" data-id="${p.id}">${p.name}</button>
      `).join('')}
      <button id="mobileAddBtn" class="flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium text-primary-600 border border-dashed border-primary-300">+ 추가</button>
    </div>
  `;

  return `
    ${mobileChips}
    <div class="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      ${renderPatientInfoBar(patient)}

      <div class="flex items-center justify-between">
        <span class="text-sm ${prog.cls}">${prog.text}</span>
        <div class="flex gap-2">
          <button id="addMeasurementBtn" class="px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors flex items-center gap-1.5">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
            새 측정
          </button>
          <button id="exportCsvBtn" class="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition-colors">CSV</button>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
          ${renderStatsCard(patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 이력</h3>
          ${renderTreatmentTags(patient.treatments, { editable: true })}
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 차트</h3>
          ${renderGrowthChart('growthChart', patient)}
        </div>
        <div class="bg-white rounded-2xl border border-slate-200 p-5">
          <h3 class="text-sm font-semibold text-slate-800 mb-4">진행 추이</h3>
          ${renderProgressChart()}
        </div>
      </div>

      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-sm font-semibold text-slate-800">측정 기록</h3>
        </div>
        ${renderMeasurementTable(patient.records, { editable: true })}
      </div>
    </div>
  `;
}

function bindDoctorEvents(container, user, patients, selectedPatient) {
  // Sidebar patient selection
  container.querySelectorAll('.sidebar-patient').forEach(btn => {
    btn.addEventListener('click', () => {
      const patient = getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        renderDoctorScreen(container);
      }
    });
  });

  // Mobile patient chips
  container.querySelectorAll('.mobile-patient-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      const patient = getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        renderDoctorScreen(container);
      }
    });
  });

  // Sidebar search
  const searchInput = container.querySelector('#sidebarSearch');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearchQuery = e.target.value;
      renderDoctorScreen(container);
      const newInput = container.querySelector('#sidebarSearch');
      if (newInput) { newInput.focus(); newInput.selectionStart = newInput.selectionEnd = newInput.value.length; }
    });
  }

  // Add patient
  const addBtns = [container.querySelector('#sidebarAddBtn'), container.querySelector('#mobileAddBtn')];
  addBtns.forEach(btn => {
    if (btn) btn.addEventListener('click', () => openAddPatientModal(container, user));
  });

  // Add measurement
  const addMeasBtn = container.querySelector('#addMeasurementBtn');
  if (addMeasBtn) {
    addMeasBtn.addEventListener('click', () => openAddMeasurementModal(container, selectedPatient));
  }

  // Treatment events
  const treatmentToggle = container.querySelector('#treatmentAddToggle');
  if (treatmentToggle) {
    treatmentToggle.addEventListener('click', () => {
      container.querySelector('#treatmentAddForm')?.classList.toggle('hidden');
    });
  }
  const treatmentConfirm = container.querySelector('#treatmentAddConfirm');
  if (treatmentConfirm && selectedPatient) {
    treatmentConfirm.addEventListener('click', () => {
      const type = container.querySelector('#treatmentTypeSelect').value;
      const date = container.querySelector('#treatmentDateInput').value;
      if (type && date) {
        addTreatment(selectedPatient.id, { type, date });
        setState({ currentPatient: getPatientById(selectedPatient.id) });
        renderDoctorScreen(container);
      }
    });
  }
  container.querySelectorAll('.treatment-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedPatient) {
        removeTreatment(selectedPatient.id, parseInt(btn.dataset.index));
        setState({ currentPatient: getPatientById(selectedPatient.id) });
        renderDoctorScreen(container);
      }
    });
  });

  // Delete record
  container.querySelectorAll('.record-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (selectedPatient && confirm('이 측정 기록을 삭제하시겠습니까?')) {
        deleteRecord(selectedPatient.id, parseInt(btn.dataset.index));
        setState({ currentPatient: getPatientById(selectedPatient.id) });
        renderDoctorScreen(container);
      }
    });
  });

  // Chart type toggle
  container.querySelectorAll('.chart-type-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      setState({ currentChartType: type });
      container.querySelectorAll('.chart-type-btn').forEach(b => {
        b.className = b.dataset.type === type
          ? 'chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium bg-primary-600 text-white'
          : 'chart-type-btn px-4 py-1.5 rounded-full text-sm font-medium text-slate-500 border border-slate-200 hover:bg-slate-50';
      });
      initProgressChart(selectedPatient, type);
    });
  });

  // CSV export
  const csvBtn = container.querySelector('#exportCsvBtn');
  if (csvBtn && selectedPatient) {
    csvBtn.addEventListener('click', () => exportCSV(selectedPatient));
  }
}

function openAddPatientModal(container, user) {
  const modal = openModal('새 환자 등록', `
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">환자 이름</label>
        <input type="text" id="newPatientName" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="홍길동">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">생년월일</label>
        <input type="date" id="newPatientBirth" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400">
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">성별</label>
        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input type="radio" name="gender" value="male" class="sr-only" checked> <span class="text-sm font-medium">남</span>
          </label>
          <label class="flex items-center justify-center gap-2 px-4 py-2.5 border-2 border-slate-200 rounded-xl cursor-pointer has-[:checked]:border-primary-500 has-[:checked]:bg-primary-50">
            <input type="radio" name="gender" value="female" class="sr-only"> <span class="text-sm font-medium">여</span>
          </label>
        </div>
      </div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">등록번호</label>
        <input type="text" id="newPatientRegNo" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" placeholder="2024-001">
      </div>
      <div class="flex gap-3 pt-2">
        <button id="cancelAddPatient" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">취소</button>
        <button id="confirmAddPatient" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">등록</button>
      </div>
    </div>
  `);

  modal.element.querySelector('#cancelAddPatient').addEventListener('click', modal.close);
  modal.element.querySelector('#confirmAddPatient').addEventListener('click', () => {
    const name = modal.element.querySelector('#newPatientName').value.trim();
    const birthDate = modal.element.querySelector('#newPatientBirth').value;
    const gender = modal.element.querySelector('input[name="gender"]:checked').value;
    const regNo = modal.element.querySelector('#newPatientRegNo').value.trim();
    if (!name || !birthDate) return;
    const newPatient = addPatient({ name, birthDate, gender, regNo, clinicId: user.clinicId });
    setState({ currentPatient: newPatient });
    modal.close();
    renderDoctorScreen(container);
  });
}

function openAddMeasurementModal(container, patient) {
  if (!patient) return;
  const modal = openModal('측정 입력', `
    <div class="space-y-4">
      <div class="px-3 py-2 bg-primary-50 rounded-lg text-sm text-primary-700 font-medium">${patient.name} · ${calcAge(patient.birthDate, new Date())}세</div>
      <div>
        <label class="block text-sm font-medium text-slate-600 mb-1.5">측정일</label>
        <input type="date" id="measDate" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400" value="${todayStr()}">
      </div>
      <div class="rounded-xl border-2 border-od/20 p-4 space-y-3">
        <div class="text-xs font-semibold text-od uppercase tracking-wide">우안 (OD)</div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs text-slate-500 mb-1">안축장 (mm)</label><input type="number" step="0.01" id="measOdAL" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-od" placeholder="23.50"></div>
          <div><label class="block text-xs text-slate-500 mb-1">굴절력 (D)</label><input type="number" step="0.25" id="measOdSE" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-od" placeholder="-1.50"></div>
        </div>
      </div>
      <div class="rounded-xl border-2 border-os/20 p-4 space-y-3">
        <div class="text-xs font-semibold text-os uppercase tracking-wide">좌안 (OS)</div>
        <div class="grid grid-cols-2 gap-3">
          <div><label class="block text-xs text-slate-500 mb-1">안축장 (mm)</label><input type="number" step="0.01" id="measOsAL" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-os" placeholder="23.45"></div>
          <div><label class="block text-xs text-slate-500 mb-1">굴절력 (D)</label><input type="number" step="0.25" id="measOsSE" class="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-os" placeholder="-1.25"></div>
        </div>
      </div>
      <button id="confirmMeasurement" class="w-full py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">측정 저장</button>
    </div>
  `);

  modal.element.querySelector('#confirmMeasurement').addEventListener('click', () => {
    const date = modal.element.querySelector('#measDate').value;
    const odAL = parseFloat(modal.element.querySelector('#measOdAL').value);
    const osAL = parseFloat(modal.element.querySelector('#measOsAL').value);
    const odSE = parseFloat(modal.element.querySelector('#measOdSE').value);
    const osSE = parseFloat(modal.element.querySelector('#measOsSE').value);
    if (!date || isNaN(odAL) || isNaN(osAL)) return;
    addMeasurement(patient.id, { date, odAL, osAL, odSE: isNaN(odSE) ? null : odSE, osSE: isNaN(osSE) ? null : osSE });
    setState({ currentPatient: getPatientById(patient.id) });
    modal.close();
    renderDoctorScreen(container);
  });
}

function exportCSV(patient) {
  if (!patient || !patient.records) return;
  const header = '날짜,나이,OD_AL,OS_AL,OD_SE,OS_SE,OD_Pct,OS_Pct\n';
  const rows = patient.records.map(r => `${r.date},${r.age},${r.odAL},${r.osAL},${r.odSE ?? ''},${r.osSE ?? ''},${r.odPct ?? ''},${r.osPct ?? ''}`).join('\n');
  const blob = new Blob(['\ufeff' + header + rows], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${patient.name}_measurements.csv`;
  link.click();
}
```

- [ ] **Step 3: Register doctor route in src/main.js**

Replace the placeholder `doctor` route:

```js
import { renderDoctorScreen } from './screens/doctorScreen.js';
registerRoute('doctor', renderDoctorScreen);
```

- [ ] **Step 4: Verify doctor dashboard**

```bash
npx vite
```

Expected: Click "의사 체험하기" → see sidebar with patients, patient detail with stats, charts, measurement table.

- [ ] **Step 5: Commit**

```bash
git add src/screens/doctorScreen.js src/components/sidebar.js src/main.js
git commit -m "feat: add doctor dashboard with patient management, charts, measurements"
```

---

### Task 8: Customer (Parent) Screen

**Files:**
- Create: `src/screens/customerScreen.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/screens/customerScreen.js**

```js
import { renderNavbar } from '../components/navbar.js';
import { renderBottomNav } from '../components/bottomNav.js';
import { renderStatsCard } from '../components/statsCard.js';
import { renderTreatmentTags } from '../components/treatmentTags.js';
import { renderMeasurementTable } from '../components/measurementTable.js';
import { renderPatientInfoBar } from '../components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from '../components/growthChart.js';
import { getState, setState } from '../state.js';
import { getPatients, getPatientById } from '../data/dataService.js';
import { progressLabel } from '../utils.js';

export function renderCustomerScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const patients = getPatients(user.clinicId);
  const children = user.children || [];

  // Match children to patients by name+birthDate
  const matchedPatients = children.map(c => patients.find(p => p.name === c.name && p.birthDate === c.birthDate)).filter(Boolean);
  const selectedPatient = getState().currentPatient || matchedPatients[0] || null;

  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '보호자', user });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5 has-bottom-nav">
      <div>
        <h2 class="text-sm font-semibold text-slate-800 mb-3">내 자녀</h2>
        <div class="flex gap-3 overflow-x-auto pb-2">
          ${matchedPatients.map(p => `
            <button class="child-select flex-shrink-0 flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-colors ${p.id === selectedPatient?.id ? 'border-primary-500 bg-primary-50' : 'border-slate-200 hover:border-slate-300'}" data-id="${p.id}">
              <div class="w-10 h-10 rounded-full ${p.id === selectedPatient?.id ? 'bg-primary-200 text-primary-700' : 'bg-slate-100 text-slate-500'} flex items-center justify-center text-sm font-semibold">${p.name.charAt(0)}</div>
              <div class="text-left">
                <div class="text-sm font-medium text-slate-800">${p.name}</div>
                <div class="text-xs text-slate-500">${p.birthDate} · ${p.gender === 'male' ? '남' : '여'}</div>
              </div>
            </button>
          `).join('')}
          ${matchedPatients.length === 0 ? '<p class="text-sm text-slate-400">연결된 자녀가 없습니다</p>' : ''}
        </div>
      </div>

      ${selectedPatient ? renderChildDetail(selectedPatient) : '<p class="text-center text-slate-400 py-8">자녀를 선택하세요</p>'}
    </main>
    ${renderBottomNav('patients')}
  `;

  nav.bind(container);

  // Child selection
  container.querySelectorAll('.child-select').forEach(btn => {
    btn.addEventListener('click', () => {
      const patient = getPatientById(btn.dataset.id);
      if (patient) {
        setState({ currentPatient: patient });
        renderCustomerScreen(container);
      }
    });
  });

  if (selectedPatient) {
    initGrowthChart('customerGrowthChart', selectedPatient);
  }

  return () => destroyChart('customerGrowthChart');
}

function renderChildDetail(patient) {
  const prog = progressLabel(patient.records);
  return `
    ${renderPatientInfoBar(patient)}

    <div class="flex items-center justify-between">
      <span class="text-sm ${prog.cls}">${prog.text}</span>
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
      ${renderStatsCard(patient)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 현황</h3>
      ${renderTreatmentTags(patient.treatments)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 추이</h3>
      ${renderGrowthChart('customerGrowthChart', patient)}
    </div>

    <div class="bg-white rounded-2xl border border-slate-200 p-5">
      <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
      ${renderMeasurementTable(patient.records)}
      <p class="text-xs text-slate-400 mt-3 text-center">측정 데이터는 담당 안과에서 입력합니다</p>
    </div>
  `;
}
```

- [ ] **Step 2: Register customer route in src/main.js**

```js
import { renderCustomerScreen } from './screens/customerScreen.js';
registerRoute('customer', renderCustomerScreen);
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/customerScreen.js src/main.js
git commit -m "feat: add customer (parent) read-only dashboard screen"
```

---

### Task 9: Admin Screen

**Files:**
- Create: `src/screens/adminScreen.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/screens/adminScreen.js**

```js
import { renderNavbar } from '../components/navbar.js';
import { getState } from '../state.js';
import { getStats, getApprovalRequests, approveRequest, rejectRequest, getClinics } from '../data/dataService.js';
import { formatDate } from '../utils.js';

let activeTab = 'approvals';

export function renderAdminScreen(container) {
  const user = getState().currentUser;
  if (!user) return;

  const stats = getStats();
  const requests = getApprovalRequests();
  const clinics = getClinics();
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '관리자', user });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-6xl mx-auto p-4 sm:p-6 space-y-5">
      <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
        ${statCard('전체 환자', stats.totalPatients + '명', 'blue')}
        ${statCard('등록 의사', stats.totalDoctors + '명', 'emerald')}
        ${statCard('안과', stats.totalClinics + '곳', 'purple')}
        ${statCard('승인 대기', stats.pendingRequests + '건', stats.pendingRequests > 0 ? 'amber' : 'slate')}
      </div>

      <div class="flex gap-2 border-b border-slate-200 pb-0">
        ${tabBtn('approvals', '승인 관리', requests.length)}
        ${tabBtn('clinics', '안과 관리')}
      </div>

      <div id="adminTabContent">
        ${activeTab === 'approvals' ? renderApprovals(requests) : renderClinics(clinics)}
      </div>
    </main>
  `;

  nav.bind(container);

  container.querySelectorAll('.admin-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      activeTab = btn.dataset.tab;
      renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.approve-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      approveRequest(btn.dataset.id);
      renderAdminScreen(container);
    });
  });

  container.querySelectorAll('.reject-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      rejectRequest(btn.dataset.id);
      renderAdminScreen(container);
    });
  });
}

function statCard(label, value, color) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600', emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600', amber: 'bg-amber-50 text-amber-600', slate: 'bg-slate-50 text-slate-600',
  };
  return `
    <div class="bg-white rounded-xl border border-slate-200 p-4">
      <div class="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1">${label}</div>
      <div class="text-2xl font-semibold text-slate-800">${value}</div>
    </div>
  `;
}

function tabBtn(id, label, count) {
  const isActive = activeTab === id;
  return `
    <button class="admin-tab px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${isActive ? 'border-primary-600 text-primary-600' : 'border-transparent text-slate-500 hover:text-slate-700'}" data-tab="${id}">
      ${label}${count ? ` <span class="ml-1 px-1.5 py-0.5 text-xs rounded-full ${isActive ? 'bg-primary-100 text-primary-700' : 'bg-slate-100 text-slate-500'}">${count}</span>` : ''}
    </button>
  `;
}

function renderApprovals(requests) {
  if (requests.length === 0) return '<div class="text-center py-8 text-slate-400">대기 중인 승인 요청이 없습니다</div>';
  return `
    <div class="space-y-3">
      ${requests.map(r => `
        <div class="bg-white rounded-xl border border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center gap-4">
          <div class="w-10 h-10 rounded-full bg-primary-100 text-primary-600 flex items-center justify-center text-sm font-semibold flex-shrink-0">${r.name.charAt(0)}</div>
          <div class="flex-1 min-w-0">
            <div class="font-medium text-slate-800">${r.name}</div>
            <div class="text-sm text-slate-500">${r.email} · ${r.clinicName} · ${formatDate(r.createdAt)}</div>
          </div>
          <div class="flex gap-2">
            <button class="approve-btn px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors" data-id="${r.id}">승인</button>
            <button class="reject-btn px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors" data-id="${r.id}">거부</button>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

function renderClinics(clinics) {
  return `
    <div class="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table class="w-full">
        <thead><tr class="border-b border-slate-200">
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">안과명</th>
          <th class="px-4 py-3 text-left text-xs font-semibold text-slate-400 uppercase">등록자</th>
        </tr></thead>
        <tbody>
          ${clinics.map(c => `<tr class="border-b border-slate-100 hover:bg-slate-50"><td class="px-4 py-3 text-sm text-slate-800">${c.name}</td><td class="px-4 py-3 text-sm text-slate-500">${c.createdBy}</td></tr>`).join('')}
        </tbody>
      </table>
    </div>
  `;
}
```

- [ ] **Step 2: Register admin route in src/main.js**

```js
import { renderAdminScreen } from './screens/adminScreen.js';
registerRoute('admin', renderAdminScreen);
```

- [ ] **Step 3: Commit**

```bash
git add src/screens/adminScreen.js src/main.js
git commit -m "feat: add admin dashboard with approval management and stats"
```

---

### Task 10: Registration Screen and Patient Result Screen

**Files:**
- Create: `src/screens/registerScreen.js`
- Create: `src/screens/pendingScreen.js`
- Modify: `src/main.js`

- [ ] **Step 1: Create src/screens/registerScreen.js**

```js
import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { getClinics } from '../data/dataService.js';

let step = 1;
let selectedRole = 'customer';
let selectedClinic = null;
let children = [];

export function renderRegisterScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '회원가입', showBack: true, backTarget: 'login' });

  container.innerHTML = `
    ${nav.html}
    <main class="max-w-lg mx-auto p-4 sm:p-6 space-y-5">
      <div class="flex items-center justify-center gap-2 mb-6">
        ${[1,2,3].map(s => `
          <div class="flex items-center gap-2">
            <div class="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step >= s ? 'bg-primary-600 text-white' : 'bg-slate-200 text-slate-500'}">${s}</div>
            ${s < 3 ? `<div class="w-8 h-0.5 ${step > s ? 'bg-primary-600' : 'bg-slate-200'}"></div>` : ''}
          </div>
        `).join('')}
      </div>

      ${step === 1 ? renderStep1() : step === 2 ? renderStep2() : renderStep3()}
    </main>
  `;

  nav.bind(container);
  bindRegisterEvents(container);
}

function renderStep1() {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">계정 유형</h3>
      <p class="text-sm text-slate-500 mb-5">사용 목적에 맞는 유형을 선택하세요</p>
      <div class="grid grid-cols-2 gap-4">
        <label class="cursor-pointer">
          <input type="radio" name="regRole" value="doctor" class="sr-only peer" ${selectedRole === 'doctor' ? 'checked' : ''}>
          <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
            <div class="text-3xl mb-2">🩺</div>
            <div class="font-medium text-slate-800">안과의사</div>
            <div class="text-xs text-slate-500 mt-1">환자 데이터 관리</div>
          </div>
        </label>
        <label class="cursor-pointer">
          <input type="radio" name="regRole" value="customer" class="sr-only peer" ${selectedRole === 'customer' ? 'checked' : ''}>
          <div class="p-5 rounded-xl border-2 border-slate-200 text-center peer-checked:border-primary-500 peer-checked:bg-primary-50 transition-colors">
            <div class="text-3xl mb-2">👨‍👩‍👧</div>
            <div class="font-medium text-slate-800">보호자</div>
            <div class="text-xs text-slate-500 mt-1">자녀 기록 조회</div>
          </div>
        </label>
      </div>
      <button id="regNext1" class="w-full mt-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">다음</button>
    </div>
  `;
}

function renderStep2() {
  const clinics = getClinics();
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">안과 연결</h3>
      <p class="text-sm text-slate-500 mb-4">${selectedRole === 'doctor' ? '소속 안과를 선택하세요' : '다니는 안과를 검색하세요'}</p>
      <input type="text" id="clinicSearch" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-primary-400 mb-3" placeholder="안과 검색...">
      <div id="clinicList" class="space-y-2">
        ${clinics.map(c => `
          <div class="clinic-item px-4 py-3 rounded-xl border border-slate-200 cursor-pointer hover:border-primary-400 transition-colors flex items-center justify-between ${selectedClinic?.id === c.id ? 'border-primary-500 bg-primary-50' : ''}" data-id="${c.id}" data-name="${c.name}">
            <span class="text-sm font-medium text-slate-800">${c.name}</span>
            ${selectedClinic?.id === c.id ? '<svg class="w-5 h-5 text-primary-600" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"/></svg>' : ''}
          </div>
        `).join('')}
      </div>
      <div class="flex gap-3 mt-5">
        <button id="regBack2" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">이전</button>
        <button id="regNext2" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 ${!selectedClinic ? 'opacity-50' : ''}">다음</button>
      </div>
    </div>
  `;
}

function renderStep3() {
  return `
    <div class="bg-white rounded-2xl border border-slate-200 p-6">
      <h3 class="text-lg font-semibold text-slate-800 mb-2">${selectedRole === 'customer' ? '자녀 등록' : '의사 정보'}</h3>
      ${selectedRole === 'customer' ? renderChildrenForm() : renderDoctorForm()}
      <div class="flex gap-3 mt-5">
        <button id="regBack3" class="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600">이전</button>
        <button id="regComplete" class="flex-1 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700">가입 완료</button>
      </div>
    </div>
  `;
}

function renderChildrenForm() {
  const childList = children.map((c, i) => `
    <div class="flex items-center justify-between px-3 py-2 bg-slate-50 rounded-lg">
      <span class="text-sm text-slate-700">${c.name} · ${c.birthDate}</span>
      <button class="remove-child text-slate-400 hover:text-red-500" data-index="${i}">&times;</button>
    </div>
  `).join('');
  return `
    <div class="space-y-3">
      ${childList}
      <div class="flex gap-2">
        <input type="text" id="childName" class="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm" placeholder="자녀 이름">
        <input type="date" id="childBirth" class="px-3 py-2 border border-slate-200 rounded-lg text-sm">
        <button id="addChildBtn" class="px-4 py-2 border border-dashed border-primary-300 text-primary-600 rounded-lg text-sm">추가</button>
      </div>
    </div>
  `;
}

function renderDoctorForm() {
  return `
    <div class="space-y-3">
      <div><label class="block text-sm font-medium text-slate-600 mb-1">의사 이름</label><input type="text" id="doctorNameInput" class="w-full px-4 py-2.5 border border-slate-200 rounded-xl text-sm" placeholder="홍길동"></div>
      <div class="px-4 py-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">안과의사 가입은 관리자 승인이 필요합니다.</div>
    </div>
  `;
}

function bindRegisterEvents(container) {
  container.querySelector('#regNext1')?.addEventListener('click', () => {
    selectedRole = container.querySelector('input[name="regRole"]:checked')?.value || 'customer';
    step = 2;
    renderRegisterScreen(container);
  });
  container.querySelector('#regBack2')?.addEventListener('click', () => { step = 1; renderRegisterScreen(container); });
  container.querySelector('#regNext2')?.addEventListener('click', () => { if (selectedClinic) { step = 3; renderRegisterScreen(container); } });
  container.querySelector('#regBack3')?.addEventListener('click', () => { step = 2; renderRegisterScreen(container); });
  container.querySelector('#regComplete')?.addEventListener('click', () => {
    if (selectedRole === 'doctor') { navigate('pending'); }
    else { navigate('login'); }
    step = 1; selectedClinic = null; children = [];
  });
  container.querySelectorAll('.clinic-item').forEach(item => {
    item.addEventListener('click', () => {
      selectedClinic = { id: item.dataset.id, name: item.dataset.name };
      renderRegisterScreen(container);
    });
  });
  container.querySelector('#addChildBtn')?.addEventListener('click', () => {
    const name = container.querySelector('#childName').value.trim();
    const birth = container.querySelector('#childBirth').value;
    if (name && birth) { children.push({ name, birthDate: birth }); renderRegisterScreen(container); }
  });
  container.querySelectorAll('.remove-child').forEach(btn => {
    btn.addEventListener('click', () => { children.splice(parseInt(btn.dataset.index), 1); renderRegisterScreen(container); });
  });
}
```

- [ ] **Step 2: Create src/screens/pendingScreen.js**

```js
import { renderNavbar } from '../components/navbar.js';
import { navigate } from '../router.js';
import { logout } from '../data/dataService.js';
import { setState } from '../state.js';

export function renderPendingScreen(container) {
  const nav = renderNavbar({ title: '근시관리 트래커' });
  container.innerHTML = `
    ${nav.html}
    <div class="flex items-center justify-center min-h-[calc(100vh-56px)] p-4">
      <div class="text-center max-w-sm">
        <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-amber-100 flex items-center justify-center">
          <svg class="w-8 h-8 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        </div>
        <h2 class="text-xl font-semibold text-slate-800 mb-2">승인 대기 중</h2>
        <p class="text-sm text-slate-500 mb-6">관리자가 요청을 검토 중입니다.<br>승인 완료 시 이메일로 알림을 보내드립니다.</p>
        <span class="inline-block px-4 py-1.5 bg-amber-50 text-amber-700 rounded-full text-sm font-medium">승인 대기중</span>
        <div class="mt-8">
          <button id="pendingLogout" class="text-sm text-slate-500 hover:text-slate-700 underline">로그아웃</button>
        </div>
      </div>
    </div>
  `;
  nav.bind(container);
  container.querySelector('#pendingLogout')?.addEventListener('click', () => {
    logout(); setState({ currentUser: null }); navigate('login');
  });
}
```

- [ ] **Step 3: Add a patient-result screen for search results**

Add to `src/screens/loginScreen.js` or create a simple inline route. For simplicity, add this to `src/main.js`:

```js
import { renderRegisterScreen } from './screens/registerScreen.js';
import { renderPendingScreen } from './screens/pendingScreen.js';
import { renderStatsCard } from './components/statsCard.js';
import { renderTreatmentTags } from './components/treatmentTags.js';
import { renderMeasurementTable } from './components/measurementTable.js';
import { renderPatientInfoBar } from './components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from './components/growthChart.js';
import { renderNavbar } from './components/navbar.js';

registerRoute('register', renderRegisterScreen);
registerRoute('pending', renderPendingScreen);

registerRoute('patient-result', (container) => {
  const patient = getState().currentPatient;
  if (!patient) { navigate('login'); return; }
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '환자 기록 조회', showBack: true, backTarget: 'login' });
  container.innerHTML = `
    ${nav.html}
    <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      ${renderPatientInfoBar(patient)}
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
        ${renderStatsCard(patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 기록</h3>
        ${renderTreatmentTags(patient.treatments)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 차트</h3>
        ${renderGrowthChart('searchResultChart', patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
        ${renderMeasurementTable(patient.records)}
      </div>
      <p class="text-center text-xs text-slate-400">더 자세한 기록 관리를 원하시면 회원가입 후 이용해주세요.</p>
    </main>
  `;
  nav.bind(container);
  initGrowthChart('searchResultChart', patient);
  return () => destroyChart('searchResultChart');
});
```

- [ ] **Step 4: Commit**

```bash
git add src/screens/ src/main.js
git commit -m "feat: add registration wizard, pending screen, and patient result screen"
```

---

### Task 11: Final Assembly, main.js Cleanup, and Verification

**Files:**
- Modify: `src/main.js` (final clean version with all routes)

- [ ] **Step 1: Write final clean src/main.js**

Combine all imports and route registrations into a single clean entry point. Remove all placeholder routes. Ensure auth guard redirects unauthenticated users.

```js
import './style.css';
import { registerRoute, startRouter, navigate } from './router.js';
import { getCurrentUser } from './data/dataService.js';
import { getState, setState } from './state.js';

import { renderLoginScreen } from './screens/loginScreen.js';
import { renderDoctorScreen } from './screens/doctorScreen.js';
import { renderCustomerScreen } from './screens/customerScreen.js';
import { renderAdminScreen } from './screens/adminScreen.js';
import { renderRegisterScreen } from './screens/registerScreen.js';
import { renderPendingScreen } from './screens/pendingScreen.js';

import { renderNavbar } from './components/navbar.js';
import { renderStatsCard } from './components/statsCard.js';
import { renderTreatmentTags } from './components/treatmentTags.js';
import { renderMeasurementTable } from './components/measurementTable.js';
import { renderPatientInfoBar } from './components/patientInfoBar.js';
import { renderGrowthChart, initGrowthChart, destroyChart } from './components/growthChart.js';

// Public routes
registerRoute('login', renderLoginScreen);
registerRoute('register', renderRegisterScreen);
registerRoute('pending', renderPendingScreen);

// Auth-guarded routes
function authGuard(renderFn) {
  return (container) => {
    if (!getState().currentUser) {
      navigate('login');
      return;
    }
    return renderFn(container);
  };
}

registerRoute('doctor', authGuard(renderDoctorScreen));
registerRoute('customer', authGuard(renderCustomerScreen));
registerRoute('admin', authGuard(renderAdminScreen));

// Patient search result (no auth needed)
registerRoute('patient-result', (container) => {
  const patient = getState().currentPatient;
  if (!patient) { navigate('login'); return; }
  const nav = renderNavbar({ title: '근시관리 트래커', subtitle: '환자 기록 조회', showBack: true, backTarget: 'login' });
  container.innerHTML = `
    ${nav.html}
    <main class="max-w-4xl mx-auto p-4 sm:p-6 space-y-5">
      ${renderPatientInfoBar(patient)}
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">현재 상태</h3>
        ${renderStatsCard(patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">치료 기록</h3>
        ${renderTreatmentTags(patient.treatments)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">성장 차트</h3>
        ${renderGrowthChart('searchResultChart', patient)}
      </div>
      <div class="bg-white rounded-2xl border border-slate-200 p-5">
        <h3 class="text-sm font-semibold text-slate-800 mb-4">측정 기록</h3>
        ${renderMeasurementTable(patient.records)}
      </div>
      <p class="text-center text-xs text-slate-400">더 자세한 기록 관리를 원하시면 회원가입 후 이용해주세요.</p>
    </main>
  `;
  nav.bind(container);
  initGrowthChart('searchResultChart', patient);
  return () => destroyChart('searchResultChart');
});

// Restore session
const user = getCurrentUser();
if (user) {
  setState({ currentUser: user });
  const route = user.role === 'admin' ? 'admin' : user.role === 'customer' ? 'customer' : 'doctor';
  window.location.hash = route;
}

startRouter(document.getElementById('app'));
```

- [ ] **Step 2: Run dev server and test all flows**

```bash
npx vite
```

Test checklist:
- [ ] Login screen renders with tabs, search, demo buttons
- [ ] Patient search finds "김민준" with birth "2016-03-15"
- [ ] Doctor dashboard shows sidebar, stats, charts, table
- [ ] Add measurement modal works
- [ ] Add treatment works
- [ ] Delete record works
- [ ] CSV export works
- [ ] Customer dashboard shows children, read-only data
- [ ] Admin dashboard shows stats, approval requests
- [ ] Registration wizard steps through 1→2→3
- [ ] Responsive: resize to mobile shows bottom nav, single column
- [ ] Charts render correctly with percentile curves

- [ ] **Step 3: Build production bundle**

```bash
npx vite build
npx vite preview
```

Expected: Production build works, preview shows same app.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete myopia tracker SPA with all screens, charts, and responsive design"
```

---

## Summary

| Task | Description | Key Files |
|------|-------------|-----------|
| 1 | Project scaffolding (Vite + Tailwind) | package.json, vite.config.js, index.html |
| 2 | Constants, utils, data layer | constants.js, utils.js, dataService.js |
| 3 | Router and navigation | router.js, navbar.js, bottomNav.js |
| 4 | Shared UI components | statsCard, treatmentTags, measurementTable, modal |
| 5 | Chart components | growthChart.js, progressChart.js |
| 6 | Login screen | loginScreen.js |
| 7 | Doctor dashboard | doctorScreen.js, sidebar.js |
| 8 | Customer dashboard | customerScreen.js |
| 9 | Admin dashboard | adminScreen.js |
| 10 | Registration + pending + patient result | registerScreen.js, pendingScreen.js |
| 11 | Final assembly and verification | main.js cleanup |
