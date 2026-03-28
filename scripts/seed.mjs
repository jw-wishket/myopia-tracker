import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://rwqggjbozibuyajdluqn.supabase.co';
const SERVICE_ROLE_KEY = process.argv[2];

if (!SERVICE_ROLE_KEY) {
  console.error('Usage: node scripts/seed.mjs <service_role_key>');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function createUser(email, password, metadata) {
  // Check if user already exists
  const { data: existing } = await supabase.auth.admin.listUsers();
  const found = existing?.users?.find(u => u.email === email);
  if (found) {
    console.log(`  User ${email} already exists (${found.id})`);
    return found.id;
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (error) { console.error(`  Failed to create ${email}:`, error.message); return null; }
  console.log(`  Created user ${email} (${data.user.id})`);
  return data.user.id;
}

async function seed() {
  console.log('\n=== Creating Clinic ===');
  let clinicId;
  const { data: existingClinics } = await supabase.from('clinics').select('*').eq('name', 'OO안과');
  if (existingClinics && existingClinics.length > 0) {
    clinicId = existingClinics[0].id;
    console.log(`  Clinic OO안과 already exists (${clinicId})`);
  } else {
    const { data: clinic, error } = await supabase.from('clinics').insert({ name: 'OO안과' }).select().single();
    if (error) { console.error('  Failed to create clinic:', error.message); return; }
    clinicId = clinic.id;
    console.log(`  Created clinic OO안과 (${clinicId})`);
  }

  console.log('\n=== Creating Users ===');

  // Admin
  const adminId = await createUser('admin@myopia-tracker.com', 'admin1234!', { name: '관리자', role: 'admin' });
  if (adminId) {
    await supabase.from('profiles').upsert({
      id: adminId, email: 'admin@myopia-tracker.com', name: '관리자', role: 'admin', approved: true
    });
    console.log('  Admin profile set');
  }

  // Doctor
  const doctorId = await createUser('doctor@myopia-tracker.com', 'doctor1234!', { name: '홍길동', role: 'doctor' });
  if (doctorId) {
    await supabase.from('profiles').upsert({
      id: doctorId, email: 'doctor@myopia-tracker.com', name: '홍길동', role: 'doctor',
      approved: true, clinic_id: clinicId, clinic_name: 'OO안과'
    });
    console.log('  Doctor profile set');
  }

  // Customer (Parent)
  const customerId = await createUser('parent@myopia-tracker.com', 'parent1234!', { name: '김영희', role: 'customer' });
  if (customerId) {
    await supabase.from('profiles').upsert({
      id: customerId, email: 'parent@myopia-tracker.com', name: '김영희', role: 'customer',
      approved: true, clinic_id: clinicId, clinic_name: 'OO안과',
      children: [
        { name: '김민준', birthDate: '2016-03-15' },
        { name: '이서연', birthDate: '2015-07-22' }
      ]
    });
    console.log('  Customer profile set');
  }

  console.log('\n=== Creating Patients ===');

  const patients = [
    { reg_no: '2024-001', name: '김민준', birth_date: '2016-03-15', gender: 'male', clinic_id: clinicId },
    { reg_no: '2024-002', name: '이서연', birth_date: '2015-07-22', gender: 'female', clinic_id: clinicId },
    { reg_no: '2024-003', name: '박지호', birth_date: '2014-11-08', gender: 'male', clinic_id: clinicId },
  ];

  const patientIds = {};
  for (const p of patients) {
    const { data: existing } = await supabase.from('patients').select('*').eq('name', p.name).eq('birth_date', p.birth_date);
    if (existing && existing.length > 0) {
      patientIds[p.name] = existing[0].id;
      console.log(`  Patient ${p.name} already exists (${existing[0].id})`);
    } else {
      const { data, error } = await supabase.from('patients').insert(p).select().single();
      if (error) { console.error(`  Failed to create patient ${p.name}:`, error.message); continue; }
      patientIds[p.name] = data.id;
      console.log(`  Created patient ${p.name} (${data.id})`);
    }
  }

  console.log('\n=== Creating Measurements ===');

  const measurementsData = {
    '김민준': [
      { date: '2023-03-20', age: 7.0, od_al: 22.85, os_al: 22.90, od_se: -0.50, os_se: -0.75, od_pct: '45', os_pct: '48' },
      { date: '2023-09-15', age: 7.5, od_al: 23.15, os_al: 23.20, od_se: -1.00, os_se: -1.25, od_pct: '52', os_pct: '55' },
      { date: '2024-03-18', age: 8.0, od_al: 23.45, os_al: 23.52, od_se: -1.50, os_se: -1.75, od_pct: '58', os_pct: '61' },
      { date: '2024-09-20', age: 8.5, od_al: 23.68, os_al: 23.75, od_se: -2.00, os_se: -2.25, od_pct: '62', os_pct: '65' },
      { date: '2025-02-10', age: 8.9, od_al: 23.82, os_al: 23.88, od_se: -2.25, os_se: -2.50, od_pct: '64', os_pct: '66' },
    ],
    '이서연': [
      { date: '2023-01-10', age: 7.5, od_al: 22.50, os_al: 22.45, od_se: -0.25, os_se: -0.25, od_pct: '42', os_pct: '40' },
      { date: '2023-07-15', age: 8.0, od_al: 22.78, os_al: 22.72, od_se: -0.75, os_se: -0.50, od_pct: '48', os_pct: '45' },
      { date: '2024-01-20', age: 8.5, od_al: 23.05, os_al: 23.00, od_se: -1.25, os_se: -1.00, od_pct: '55', os_pct: '52' },
      { date: '2024-07-18', age: 9.0, od_al: 23.28, os_al: 23.22, od_se: -1.75, os_se: -1.50, od_pct: '58', os_pct: '55' },
    ],
    '박지호': [
      { date: '2022-11-15', age: 8.0, od_al: 23.80, os_al: 23.75, od_se: -2.00, os_se: -1.75, od_pct: '68', os_pct: '65' },
      { date: '2023-05-20', age: 8.5, od_al: 24.20, os_al: 24.15, od_se: -2.75, os_se: -2.50, od_pct: '75', os_pct: '72' },
      { date: '2023-11-18', age: 9.0, od_al: 24.55, os_al: 24.48, od_se: -3.50, os_se: -3.25, od_pct: '80', os_pct: '78' },
      { date: '2024-05-22', age: 9.5, od_al: 24.75, os_al: 24.68, od_se: -3.75, os_se: -3.50, od_pct: '82', os_pct: '80' },
      { date: '2024-11-20', age: 10.0, od_al: 24.90, os_al: 24.82, od_se: -4.00, os_se: -3.75, od_pct: '83', os_pct: '81' },
    ],
  };

  for (const [name, measurements] of Object.entries(measurementsData)) {
    const pid = patientIds[name];
    if (!pid) continue;

    // Check if measurements already exist
    const { data: existing } = await supabase.from('measurements').select('id').eq('patient_id', pid);
    if (existing && existing.length > 0) {
      console.log(`  ${name}: ${existing.length} measurements already exist, skipping`);
      continue;
    }

    const rows = measurements.map(m => ({ ...m, patient_id: pid }));
    const { error } = await supabase.from('measurements').insert(rows);
    if (error) { console.error(`  Failed measurements for ${name}:`, error.message); continue; }
    console.log(`  ${name}: ${rows.length} measurements inserted`);
  }

  console.log('\n=== Creating Treatments ===');

  const treatmentsData = {
    '김민준': [
      { type: '아트로핀 0.01%', date: '2024-03-18', age: 8.0 },
    ],
    '이서연': [
      { type: '드림렌즈', date: '2024-01-20', age: 8.5 },
    ],
    '박지호': [
      { type: '아트로핀 0.025%', date: '2023-05-20', age: 8.5 },
      { type: '아트로핀 0.05%', date: '2024-05-22', age: 9.5 },
    ],
  };

  for (const [name, treatments] of Object.entries(treatmentsData)) {
    const pid = patientIds[name];
    if (!pid) continue;

    const { data: existing } = await supabase.from('treatments').select('id').eq('patient_id', pid);
    if (existing && existing.length > 0) {
      console.log(`  ${name}: ${existing.length} treatments already exist, skipping`);
      continue;
    }

    const rows = treatments.map(t => ({ ...t, patient_id: pid }));
    const { error } = await supabase.from('treatments').insert(rows);
    if (error) { console.error(`  Failed treatments for ${name}:`, error.message); continue; }
    console.log(`  ${name}: ${rows.length} treatments inserted`);
  }

  console.log('\n=== Done! ===');
  console.log('\nTest accounts:');
  console.log('  Admin:    admin@myopia-tracker.com  / admin1234!');
  console.log('  Doctor:   doctor@myopia-tracker.com / doctor1234!');
  console.log('  Customer: parent@myopia-tracker.com / parent1234!');
}

seed().catch(console.error);
