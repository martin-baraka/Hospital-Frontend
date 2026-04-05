/* ============================================================
   MEDICORE HMS — Application Data & Utilities
   ============================================================ */

// ── Session Guard ──
const session = JSON.parse(sessionStorage.getItem('hms_user') || 'null');
if (!session && !window.location.pathname.includes('login')) {
  window.location.href = 'login.html';
}

// ── Role-based Navigation Config ──
const NAV_CONFIG = {
  admin:        ['dashboard','patients','appointments','consultations','lab','billing','inventory','users','reports'],
  doctor:       ['dashboard','patients','appointments','consultations','lab','billing'],
  receptionist: ['dashboard','patients','appointments','billing'],
  labtech:      ['dashboard','lab','patients'],
};

// ── Mock Data Store ──
const DB = {
  patients: [
    { id:'PT-001', name:'Alice Mwangi',    age:34, gender:'Female', blood:'O+',  phone:'0712-345-678', email:'alice@mail.com',   dob:'1990-03-12', address:'Nairobi, Kenya',        condition:'Hypertension',  status:'Active',    registered:'2024-01-10', insurance:'NHIF', allergies:'Penicillin', emergency:'John Mwangi 0700000001' },
    { id:'PT-002', name:'Brian Omondi',    age:28, gender:'Male',   blood:'A+',  phone:'0723-456-789', email:'brian@mail.com',   dob:'1996-07-22', address:'Mombasa, Kenya',        condition:'Diabetes T2',   status:'Active',    registered:'2024-01-15', insurance:'AAR',  allergies:'None',       emergency:'Mary Omondi 0700000002' },
    { id:'PT-003', name:'Carol Wanjiku',   age:52, gender:'Female', blood:'B-',  phone:'0734-567-890', email:'carol@mail.com',   dob:'1972-11-05', address:'Kisumu, Kenya',         condition:'Arthritis',     status:'Active',    registered:'2024-02-03', insurance:'CIC',  allergies:'Sulfa',      emergency:'Peter Wanjiku 0700000003' },
    { id:'PT-004', name:'Daniel Kipchoge', age:45, gender:'Male',   blood:'AB+', phone:'0745-678-901', email:'daniel@mail.com',  dob:'1979-04-18', address:'Eldoret, Kenya',        condition:'Asthma',        status:'Discharged',registered:'2024-02-20', insurance:'NHIF', allergies:'Aspirin',    emergency:'Ruth Kipchoge 0700000004' },
    { id:'PT-005', name:'Eva Njeri',       age:19, gender:'Female', blood:'O-',  phone:'0756-789-012', email:'eva@mail.com',     dob:'2005-08-30', address:'Thika, Kenya',          condition:'Fracture-Arm',  status:'Active',    registered:'2024-03-08', insurance:'None', allergies:'None',       emergency:'Lucy Njeri 0700000005' },
    { id:'PT-006', name:'Francis Otieno',  age:67, gender:'Male',   blood:'A-',  phone:'0767-890-123', email:'francis@mail.com', dob:'1957-01-14', address:'Nakuru, Kenya',         condition:'Heart Disease', status:'Critical',  registered:'2024-03-15', insurance:'Jubilee', allergies:'Latex',   emergency:'Agnes Otieno 0700000006' },
    { id:'PT-007', name:'Grace Achieng',   age:31, gender:'Female', blood:'B+',  phone:'0778-901-234', email:'grace@mail.com',   dob:'1993-09-26', address:'Nairobi, Kenya',        condition:'Pregnancy',     status:'Active',    registered:'2024-04-01', insurance:'NHIF', allergies:'None',       emergency:'Thomas Achieng 0700000007' },
    { id:'PT-008', name:'Henry Kamau',     age:42, gender:'Male',   blood:'O+',  phone:'0789-012-345', email:'henry@mail.com',   dob:'1982-12-03', address:'Kiambu, Kenya',         condition:'Back Pain',     status:'Active',    registered:'2024-04-12', insurance:'AAR',  allergies:'Codeine',    emergency:'Lisa Kamau 0700000008' },
  ],

  appointments: [
    { id:'APT-001', patientId:'PT-001', patient:'Alice Mwangi',    doctor:'Dr. James Odhiambo', department:'Cardiology',   date:'2024-12-01', time:'09:00', type:'Follow-up',    status:'Completed', notes:'Blood pressure review' },
    { id:'APT-002', patientId:'PT-002', patient:'Brian Omondi',    doctor:'Dr. Mary Kariuki',   department:'Endocrinology',date:'2024-12-01', time:'09:30', type:'Consultation', status:'Completed', notes:'Blood sugar management' },
    { id:'APT-003', patientId:'PT-003', patient:'Carol Wanjiku',   doctor:'Dr. James Odhiambo', department:'Orthopedics',  date:'2024-12-02', time:'10:00', type:'Check-up',     status:'Confirmed', notes:'Joint pain evaluation' },
    { id:'APT-004', patientId:'PT-004', patient:'Daniel Kipchoge', doctor:'Dr. Ann Muthoni',    department:'Pulmonology',  date:'2024-12-02', time:'11:00', type:'Follow-up',    status:'Confirmed', notes:'Inhaler adjustment' },
    { id:'APT-005', patientId:'PT-005', patient:'Eva Njeri',       doctor:'Dr. James Odhiambo', department:'Orthopedics',  date:'2024-12-03', time:'14:00', type:'Follow-up',    status:'Pending',   notes:'Cast check' },
    { id:'APT-006', patientId:'PT-006', patient:'Francis Otieno',  doctor:'Dr. Paul Ochieng',   department:'Cardiology',   date:'2024-12-03', time:'08:00', type:'Emergency',    status:'Confirmed', notes:'Urgent cardiac review' },
    { id:'APT-007', patientId:'PT-007', patient:'Grace Achieng',   doctor:'Dr. Mary Kariuki',   department:'OB/GYN',       date:'2024-12-04', time:'10:30', type:'Antenatal',    status:'Pending',   notes:'36-week check' },
    { id:'APT-008', patientId:'PT-008', patient:'Henry Kamau',     doctor:'Dr. James Odhiambo', department:'Neurology',    date:'2024-12-04', time:'15:00', type:'Consultation', status:'Pending',   notes:'MRI results review' },
  ],

  labTests: [
    { id:'LAB-001', patientId:'PT-001', patient:'Alice Mwangi',    test:'Complete Blood Count',   orderedBy:'Dr. James Odhiambo', date:'2024-11-30', status:'Completed', result:'Normal',    cost:1500, priority:'Normal', specimen:'Blood' },
    { id:'LAB-002', patientId:'PT-002', patient:'Brian Omondi',    test:'HbA1c Test',             orderedBy:'Dr. Mary Kariuki',   date:'2024-11-30', status:'Completed', result:'7.2% (High)', cost:2500, priority:'Normal', specimen:'Blood' },
    { id:'LAB-003', patientId:'PT-003', patient:'Carol Wanjiku',   test:'Rheumatoid Factor',      orderedBy:'Dr. James Odhiambo', date:'2024-12-01', status:'In Progress',result:'Pending',   cost:3000, priority:'Normal', specimen:'Blood' },
    { id:'LAB-004', patientId:'PT-004', patient:'Daniel Kipchoge', test:'Spirometry',             orderedBy:'Dr. Ann Muthoni',    date:'2024-12-01', status:'Completed', result:'FEV1: 68%', cost:4500, priority:'Normal', specimen:'Breath' },
    { id:'LAB-005', patientId:'PT-005', patient:'Eva Njeri',       test:'X-Ray — Right Arm',      orderedBy:'Dr. James Odhiambo', date:'2024-12-02', status:'Completed', result:'Healing well',cost:2000, priority:'Normal', specimen:'Imaging'},
    { id:'LAB-006', patientId:'PT-006', patient:'Francis Otieno',  test:'Troponin Test',          orderedBy:'Dr. Paul Ochieng',   date:'2024-12-02', status:'In Progress',result:'Pending',   cost:5000, priority:'Urgent',  specimen:'Blood' },
    { id:'LAB-007', patientId:'PT-007', patient:'Grace Achieng',   test:'Urinalysis',             orderedBy:'Dr. Mary Kariuki',   date:'2024-12-03', status:'Pending',   result:'—',         cost:800,  priority:'Normal', specimen:'Urine' },
    { id:'LAB-008', patientId:'PT-008', patient:'Henry Kamau',     test:'MRI — Lumbar Spine',     orderedBy:'Dr. James Odhiambo', date:'2024-12-03', status:'Pending',   result:'—',         cost:15000,priority:'Normal', specimen:'Imaging'},
  ],

  bills: [
    { id:'BILL-001', patientId:'PT-001', patient:'Alice Mwangi',    date:'2024-11-30', items:[{desc:'Consultation',qty:1,rate:2000},{desc:'CBC Test',qty:1,rate:1500},{desc:'Medication',qty:2,rate:500}], status:'Paid',    insurance:'NHIF' },
    { id:'BILL-002', patientId:'PT-002', patient:'Brian Omondi',    date:'2024-11-30', items:[{desc:'Consultation',qty:1,rate:2000},{desc:'HbA1c Test',qty:1,rate:2500},{desc:'Metformin 500mg',qty:30,rate:50}], status:'Paid',    insurance:'AAR' },
    { id:'BILL-003', patientId:'PT-003', patient:'Carol Wanjiku',   date:'2024-12-01', items:[{desc:'Consultation',qty:1,rate:2000},{desc:'Rheumatoid Factor',qty:1,rate:3000},{desc:'Ibuprofen',qty:20,rate:30}], status:'Pending', insurance:'CIC' },
    { id:'BILL-004', patientId:'PT-004', patient:'Daniel Kipchoge', date:'2024-12-01', items:[{desc:'Consultation',qty:1,rate:2000},{desc:'Spirometry',qty:1,rate:4500},{desc:'Inhaler',qty:1,rate:1200}], status:'Paid',    insurance:'NHIF' },
    { id:'BILL-005', patientId:'PT-005', patient:'Eva Njeri',       date:'2024-12-02', items:[{desc:'Emergency Visit',qty:1,rate:5000},{desc:'X-Ray',qty:1,rate:2000},{desc:'Cast Application',qty:1,rate:3000}], status:'Pending', insurance:'None' },
    { id:'BILL-006', patientId:'PT-006', patient:'Francis Otieno',  date:'2024-12-02', items:[{desc:'Emergency Admission',qty:1,rate:15000},{desc:'Troponin Test',qty:1,rate:5000},{desc:'ECG',qty:1,rate:2000},{desc:'ICU per day',qty:2,rate:8000}], status:'Pending', insurance:'Jubilee' },
  ],

  inventory: [
    { id:'INV-001', name:'Paracetamol 500mg',      category:'Medication',   quantity:450, unit:'Tablets', minQty:100, unitCost:5,    supplier:'PharmaCo Ltd',       expiry:'2025-12-31', status:'Good' },
    { id:'INV-002', name:'Amoxicillin 250mg',       category:'Medication',   quantity:80,  unit:'Capsules',minQty:100, unitCost:15,   supplier:'MedSupply Africa',   expiry:'2025-06-30', status:'Low' },
    { id:'INV-003', name:'Surgical Gloves (L)',     category:'PPE',          quantity:200, unit:'Pairs',   minQty:50,  unitCost:30,   supplier:'SafeGuard Medical',  expiry:'2026-01-01', status:'Good' },
    { id:'INV-004', name:'IV Drip Set',             category:'Equipment',    quantity:35,  unit:'Sets',    minQty:50,  unitCost:120,  supplier:'MedEquip Kenya',     expiry:'2026-06-01', status:'Low' },
    { id:'INV-005', name:'Bandages 10cm',           category:'Consumables',  quantity:300, unit:'Rolls',   minQty:100, unitCost:45,   supplier:'PharmaCo Ltd',       expiry:'2027-01-01', status:'Good' },
    { id:'INV-006', name:'Syringes 5ml',            category:'Consumables',  quantity:500, unit:'Pieces',  minQty:200, unitCost:12,   supplier:'SafeGuard Medical',  expiry:'2026-08-01', status:'Good' },
    { id:'INV-007', name:'Blood Glucose Strips',    category:'Diagnostics',  quantity:20,  unit:'Boxes',   minQty:30,  unitCost:1200, supplier:'DiagnoLab Kenya',    expiry:'2025-03-31', status:'Critical' },
    { id:'INV-008', name:'Metformin 500mg',         category:'Medication',   quantity:600, unit:'Tablets', minQty:100, unitCost:8,    supplier:'MedSupply Africa',   expiry:'2025-10-31', status:'Good' },
    { id:'INV-009', name:'Oxygen Masks',            category:'Equipment',    quantity:40,  unit:'Pieces',  minQty:30,  unitCost:250,  supplier:'MedEquip Kenya',     expiry:'2027-01-01', status:'Good' },
    { id:'INV-010', name:'Betadine Solution 100ml', category:'Antiseptics',  quantity:12,  unit:'Bottles', minQty:20,  unitCost:350,  supplier:'PharmaCo Ltd',       expiry:'2025-09-30', status:'Low' },
  ],

  users: [
    { id:'USR-001', name:'Dr. Sarah Admin',      role:'Administrator',   email:'admin@medicore.com',   phone:'0700-001-001', department:'Administration', status:'Active',   joined:'2023-01-01' },
    { id:'USR-002', name:'Dr. James Odhiambo',   role:'Doctor',          email:'doctor@medicore.com',  phone:'0700-002-002', department:'General Surgery',status:'Active',   joined:'2023-03-15' },
    { id:'USR-003', name:'Jane Wanjiku',          role:'Receptionist',    email:'recept@medicore.com',  phone:'0700-003-003', department:'Front Desk',     status:'Active',   joined:'2023-06-01' },
    { id:'USR-004', name:'Peter Mwangi',          role:'Lab Technician',  email:'lab@medicore.com',     phone:'0700-004-004', department:'Laboratory',     status:'Active',   joined:'2023-08-20' },
    { id:'USR-005', name:'Dr. Mary Kariuki',      role:'Doctor',          email:'mary@medicore.com',    phone:'0700-005-005', department:'OB/GYN',         status:'Active',   joined:'2023-02-10' },
    { id:'USR-006', name:'Dr. Ann Muthoni',       role:'Doctor',          email:'ann@medicore.com',     phone:'0700-006-006', department:'Pulmonology',    status:'Active',   joined:'2023-05-05' },
    { id:'USR-007', name:'Dr. Paul Ochieng',      role:'Doctor',          email:'paul@medicore.com',    phone:'0700-007-007', department:'Cardiology',     status:'Inactive', joined:'2023-07-12' },
  ],

  consultations: [
    { id:'CONS-001', patientId:'PT-001', patient:'Alice Mwangi',  doctor:'Dr. James Odhiambo', date:'2024-11-30', diagnosis:'Hypertension Stage 2',   complaint:'Headache, dizziness', prescription:'Amlodipine 5mg OD', followUp:'2024-12-14', notes:'Monitor BP daily' },
    { id:'CONS-002', patientId:'PT-002', patient:'Brian Omondi',  doctor:'Dr. Mary Kariuki',   date:'2024-11-30', diagnosis:'Type 2 Diabetes Mellitus',complaint:'Frequent urination, fatigue', prescription:'Metformin 500mg BD', followUp:'2024-12-15', notes:'Diet counseling done' },
    { id:'CONS-003', patientId:'PT-003', patient:'Carol Wanjiku', doctor:'Dr. James Odhiambo', date:'2024-12-01', diagnosis:'Rheumatoid Arthritis',    complaint:'Joint pain & swelling', prescription:'Ibuprofen 400mg TDS', followUp:'2024-12-20', notes:'Awaiting RF results' },
    { id:'CONS-004', patientId:'PT-005', patient:'Eva Njeri',     doctor:'Dr. James Odhiambo', date:'2024-12-02', diagnosis:'Fractured Radius (R)',     complaint:'Fall injury, arm pain', prescription:'Tramadol 50mg PRN', followUp:'2024-12-16', notes:'Cast in place, X-ray review' },
  ],
};

// ── Utility Functions ──
function getBillTotal(items) {
  return items.reduce((s, i) => s + (i.qty * i.rate), 0);
}
function fmtKES(n) { return 'KES ' + n.toLocaleString(); }
function fmtDate(d) { if (!d) return '—'; const dt = new Date(d); return dt.toLocaleDateString('en-KE',{day:'2-digit',month:'short',year:'numeric'}); }
function initials(name) { return name.split(' ').slice(0,2).map(w=>w[0]).join('').toUpperCase(); }
function avatarColor(name) {
  const colors = ['#0891b2','#16a34a','#d97706','#9333ea','#dc2626','#2563eb','#db2777'];
  let h = 0; for(const c of name) h = (h*31+c.charCodeAt(0))%colors.length;
  return colors[h];
}

// ── Toast System ──
function toast(msg, type='info', duration=3500) {
  const icons = { success:'✅', error:'❌', warning:'⚠️', info:'ℹ️' };
  const container = document.getElementById('toastContainer');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span>${icons[type]}</span><span>${msg}</span>`;
  container.appendChild(el);
  requestAnimationFrame(() => { requestAnimationFrame(() => { el.classList.add('show'); }); });
  setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 400); }, duration);
}

// ── Modal Helpers ──
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }
document.addEventListener('keydown', e => { if(e.key==='Escape') document.querySelectorAll('.modal-overlay.open').forEach(m=>m.classList.remove('open')); });
document.addEventListener('click', e => { if(e.target.classList.contains('modal-overlay')) e.target.classList.remove('open'); });

// ── Navigation ──
function navigate(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const pageEl = document.getElementById('page-' + page);
  if (pageEl) pageEl.classList.add('active');
  const navEl = document.querySelector(`.nav-item[data-page="${page}"]`);
  if (navEl) navEl.classList.add('active');
  // Update header
  const titles = {
    dashboard: ['Dashboard', 'Welcome back, ' + (session?.name?.split(' ')[0] || 'User')],
    patients: ['Patient Management', 'View and manage patient records'],
    appointments: ['Appointment Scheduling', 'Manage and track appointments'],
    consultations: ['Consultations & Visits', 'Doctor consultation records'],
    lab: ['Laboratory Management', 'Lab tests and results tracking'],
    billing: ['Billing & Invoicing', 'Automated billing and payments'],
    inventory: ['Inventory Management', 'Stock and supplier tracking'],
    users: ['User Management', 'System users and access control'],
    reports: ['Reports & Analytics', 'Hospital performance insights'],
  };
  const [title, sub] = titles[page] || ['MediCore HMS', ''];
  document.getElementById('headerTitle').textContent = title;
  document.getElementById('headerSub').textContent = sub;
}

// ── Logout ──
function logout() {
  sessionStorage.removeItem('hms_user');
  window.location.href = 'login.html';
}
