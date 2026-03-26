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

export function getClinics() {
  return getStore().clinics;
}

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

export function resetData() {
  localStorage.removeItem(STORAGE_KEY);
}
