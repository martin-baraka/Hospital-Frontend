/* ============================================================
   MEDICORE HMS — Application Logic
   ============================================================ */

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  if (!session) return;
  initSidebar();
  initHeader();
  populatePatientDropdowns();
  renderAll();
  initCharts();
  updateClock();
  setInterval(updateClock, 60000);

  // Default date fields
  const today = new Date().toISOString().split('T')[0];
  ['apptDate','labDate','cDate','cFollowUp','npDob'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = today;
  });

  // Double-booking detection
  ['apptDoctor','apptDate','apptTime'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('change', checkDoubleBooking);
  });
});

function updateClock() {
  const now = new Date();
  const el = document.getElementById('liveDate');
  if (el) el.textContent = now.toLocaleDateString('en-KE', { day:'2-digit', month:'short', year:'numeric' }) + ' ' + now.toLocaleTimeString('en-KE', { hour:'2-digit', minute:'2-digit' });
}

// ── Sidebar ──
const NAV_ITEMS = [
  { page:'dashboard',     icon:'fas fa-gauge-high',         label:'Dashboard',      section:'Main' },
  { page:'patients',      icon:'fas fa-users',              label:'Patients',       section:'Clinical' },
  { page:'appointments',  icon:'fas fa-calendar-days',      label:'Appointments',   section:'Clinical', badge:3 },
  { page:'consultations', icon:'fas fa-stethoscope',        label:'Consultations',  section:'Clinical' },
  { page:'lab',           icon:'fas fa-flask',              label:'Laboratory',     section:'Clinical', badge:2 },
  { page:'billing',       icon:'fas fa-file-invoice-dollar',label:'Billing',        section:'Admin' },
  { page:'inventory',     icon:'fas fa-boxes-stacked',      label:'Inventory',      section:'Admin' },
  { page:'users',         icon:'fas fa-user-shield',        label:'Users',          section:'Admin' },
  { page:'reports',       icon:'fas fa-chart-bar',          label:'Reports',        section:'Admin' },
];

function initSidebar() {
  const allowedPages = NAV_CONFIG[session.role] || [];
  const nav = document.getElementById('sidebarNav');
  let currentSection = '';
  let html = '';
  NAV_ITEMS.filter(i => allowedPages.includes(i.page)).forEach(item => {
    if (item.section !== currentSection) {
      currentSection = item.section;
      html += `<div class="nav-section-label">${currentSection}</div>`;
    }
    const badge = item.badge ? `<span class="nav-badge">${item.badge}</span>` : '';
    html += `<div class="nav-item" data-page="${item.page}" onclick="navigate('${item.page}')">
      <span class="nav-icon"><i class="${item.icon}"></i></span>
      <span class="nav-label">${item.label}</span>
      ${badge}
    </div>`;
  });
  nav.innerHTML = html;
  // Set first active
  const firstPage = allowedPages[0] || 'dashboard';
  navigate(firstPage);

  // User info
  document.getElementById('userAvatar').textContent = initials(session.name);
  document.getElementById('userAvatar').style.background = avatarColor(session.name);
  document.getElementById('userName').textContent = session.name;
  document.getElementById('userRoleName').textContent = session.roleName;
  document.getElementById('roleBadge').textContent = session.roleName;
  document.getElementById('sidebarRoleText').textContent = 'v2.4 — ' + session.roleName;
}

function initHeader() {
  document.getElementById('headerSub').textContent = 'Welcome back, ' + session.name.split(' ')[0];
}

// ── Global Search ──
function globalSearchHandler(q) {
  if (!q || q.length < 2) return;
  q = q.toLowerCase();
  const matches = DB.patients.filter(p =>
    p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q) || p.condition.toLowerCase().includes(q)
  );
  if (matches.length) {
    navigate('patients');
    document.getElementById('patientSearch').value = q;
    renderPatients();
  }
}

// ── Populate Dropdowns ──
function populatePatientDropdowns() {
  const patientOptions = DB.patients.map(p => `<option value="${p.id}">${p.name} (${p.id})</option>`).join('');
  ['apptPatient','labPatient','billPatient','cPatient'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '<option value="">Select patient</option>' + patientOptions;
  });
}

// ── Render All ──
function renderAll() {
  renderDashAppts();
  renderPatients();
  renderAppointments();
  renderConsultations();
  renderLab();
  renderBilling();
  renderInventory();
  renderUsers();
}

// ── Dashboard Appointments ──
function renderDashAppts() {
  const el = document.getElementById('dashApptList');
  if (!el) return;
  const todays = DB.appointments.slice(0, 5);
  el.innerHTML = todays.map(a => {
    const [h, m] = a.time.split(':');
    const hour = parseInt(h);
    const period = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const statusColor = { Pending:'amber', Confirmed:'teal', Completed:'green', Cancelled:'red' }[a.status] || 'navy';
    return `<div class="appt-card">
      <div class="appt-time-box"><div class="appt-hour">${h12}:${m}</div><div class="appt-period">${period}</div></div>
      <div class="appt-details">
        <div class="appt-patient">${a.patient}</div>
        <div class="appt-type">${a.type} · ${a.doctor}</div>
      </div>
      <span class="badge badge-${statusColor}">${a.status}</span>
    </div>`;
  }).join('');
}

// ── Patients ──
function renderPatients() {
  const search = (document.getElementById('patientSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('patientStatusFilter')?.value || '';
  const genderF = document.getElementById('patientGenderFilter')?.value || '';

  let data = DB.patients.filter(p => {
    const matchS = !search || p.name.toLowerCase().includes(search) || p.id.toLowerCase().includes(search) || p.condition.toLowerCase().includes(search);
    const matchSt = !statusF || p.status === statusF;
    const matchG = !genderF || p.gender === genderF;
    return matchS && matchSt && matchG;
  });

  document.getElementById('patientCount').textContent = data.length;
  const body = document.getElementById('patientsBody');
  if (!body) return;

  body.innerHTML = data.map(p => {
    const statusColor = { Active:'green', Discharged:'navy', Critical:'red' }[p.status] || 'navy';
    const bg = avatarColor(p.name);
    return `<tr>
      <td><span class="pid">${p.id}</span></td>
      <td>
        <div class="name-cell">
          <div class="avatar-sm" style="background:${bg};color:#fff">${initials(p.name)}</div>
          <div>
            <div style="font-weight:600;color:var(--navy-900)">${p.name}</div>
            <div style="font-size:.75rem;color:var(--navy-400)">${p.email}</div>
          </div>
        </div>
      </td>
      <td>${p.age} yrs / ${p.gender}</td>
      <td><span class="badge badge-teal">${p.blood || '—'}</span></td>
      <td style="max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${p.condition}</td>
      <td style="font-family:var(--font-mono);font-size:.8rem">${p.phone}</td>
      <td>${p.insurance}</td>
      <td><span class="badge badge-${statusColor}">${p.status}</span></td>
      <td style="font-size:.8rem;color:var(--navy-500)">${fmtDate(p.registered)}</td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewPatient('${p.id}')" title="View"><i class="fas fa-eye"></i></button>
          <button class="btn btn-ghost btn-icon btn-sm" onclick="editPatient('${p.id}')" title="Edit"><i class="fas fa-pen"></i></button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deletePatient('${p.id}')" title="Delete"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="10"><div class="empty-state"><div class="icon">👤</div><h3>No patients found</h3><p>Try adjusting filters or register a new patient.</p></div></td></tr>';
}

function viewPatient(id) {
  const p = DB.patients.find(x => x.id === id);
  if (!p) return;
  const appts = DB.appointments.filter(a => a.patientId === id);
  const labs = DB.labTests.filter(l => l.patientId === id);
  const bills = DB.bills.filter(b => b.patientId === id);

  document.getElementById('patientProfileBody').innerHTML = `
    <div style="display:flex;align-items:center;gap:18px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid var(--navy-100)">
      <div style="width:60px;height:60px;border-radius:50%;background:${avatarColor(p.name)};color:#fff;display:flex;align-items:center;justify-content:center;font-size:1.4rem;font-weight:800;font-family:var(--font-sans)">${initials(p.name)}</div>
      <div>
        <div style="font-family:var(--font-sans);font-size:1.2rem;font-weight:800;color:var(--navy-900)">${p.name}</div>
        <div style="display:flex;gap:8px;margin-top:4px">
          <span class="pid">${p.id}</span>
          <span class="badge badge-${p.status === 'Active' ? 'green' : p.status === 'Critical' ? 'red' : 'navy'}">${p.status}</span>
          <span class="badge badge-teal">${p.blood}</span>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">
      <div>
        <div class="field-label">Personal Details</div>
        <table style="width:100%;font-size:.85rem">
          <tr><td style="color:var(--navy-500);padding:5px 0">Age / DOB</td><td style="font-weight:500">${p.age} yrs / ${fmtDate(p.dob)}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Gender</td><td style="font-weight:500">${p.gender}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Phone</td><td style="font-weight:500;font-family:var(--font-mono)">${p.phone}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Email</td><td style="font-weight:500">${p.email}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Address</td><td style="font-weight:500">${p.address}</td></tr>
        </table>
      </div>
      <div>
        <div class="field-label">Medical Details</div>
        <table style="width:100%;font-size:.85rem">
          <tr><td style="color:var(--navy-500);padding:5px 0">Condition</td><td style="font-weight:500">${p.condition}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Allergies</td><td style="font-weight:500;color:var(--red-600)">${p.allergies}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Insurance</td><td style="font-weight:500">${p.insurance}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Emergency</td><td style="font-weight:500">${p.emergency}</td></tr>
          <tr><td style="color:var(--navy-500);padding:5px 0">Registered</td><td style="font-weight:500">${fmtDate(p.registered)}</td></tr>
        </table>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px">
      <div style="padding:14px;background:var(--teal-50);border:1px solid var(--teal-100);border-radius:var(--radius-md);text-align:center">
        <div style="font-size:1.4rem;font-weight:800;font-family:var(--font-sans);color:var(--teal-600)">${appts.length}</div>
        <div style="font-size:.75rem;color:var(--navy-500)">Appointments</div>
      </div>
      <div style="padding:14px;background:var(--amber-100);border:1px solid rgba(217,119,6,.2);border-radius:var(--radius-md);text-align:center">
        <div style="font-size:1.4rem;font-weight:800;font-family:var(--font-sans);color:var(--amber-600)">${labs.length}</div>
        <div style="font-size:.75rem;color:var(--navy-500)">Lab Tests</div>
      </div>
      <div style="padding:14px;background:var(--green-100);border:1px solid rgba(22,163,74,.2);border-radius:var(--radius-md);text-align:center">
        <div style="font-size:1.4rem;font-weight:800;font-family:var(--font-sans);color:var(--green-600)">${bills.length}</div>
        <div style="font-size:.75rem;color:var(--navy-500)">Bills</div>
      </div>
    </div>
  `;
  openModal('modalViewPatient');
}

function editPatient(id) {
  toast('Edit mode for ' + id + ' (connects to backend PUT endpoint)', 'info');
}

function deletePatient(id) {
  if (!confirm('Delete patient ' + id + '? This action cannot be undone.')) return;
  const idx = DB.patients.findIndex(p => p.id === id);
  if (idx > -1) { DB.patients.splice(idx, 1); renderPatients(); populatePatientDropdowns(); toast('Patient deleted', 'success'); }
}

function saveNewPatient() {
  const name = document.getElementById('npName').value.trim();
  const dob  = document.getElementById('npDob').value;
  const gender = document.getElementById('npGender').value;
  const phone = document.getElementById('npPhone').value.trim();
  if (!name || !dob || !gender || !phone) { toast('Please fill all required fields', 'error'); return; }

  const age = Math.floor((new Date() - new Date(dob)) / (365.25 * 86400000));
  const id = 'PT-' + String(DB.patients.length + 1).padStart(3, '0');
  DB.patients.push({
    id, name, age, gender, blood: document.getElementById('npBlood').value || '—',
    phone, email: document.getElementById('npEmail').value,
    dob, address: document.getElementById('npAddress').value,
    condition: document.getElementById('npCondition').value || 'Not specified',
    status: 'Active', registered: new Date().toISOString().split('T')[0],
    insurance: document.getElementById('npInsurance').value,
    allergies: document.getElementById('npAllergies').value || 'None',
    emergency: document.getElementById('npEmergency').value || '—',
  });
  closeModal('modalNewPatient');
  renderPatients();
  populatePatientDropdowns();
  navigate('patients');
  toast('Patient ' + name + ' registered successfully!', 'success');
  // Clear form
  ['npName','npDob','npPhone','npEmail','npAddress','npCondition','npAllergies','npEmergency'].forEach(id => { const el = document.getElementById(id); if(el) el.value = ''; });
}

// ── Appointments ──
function renderAppointments() {
  const search = (document.getElementById('apptSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('apptStatusFilter')?.value || '';
  const deptF = document.getElementById('apptDeptFilter')?.value || '';

  let data = DB.appointments.filter(a => {
    const matchS = !search || a.patient.toLowerCase().includes(search) || a.doctor.toLowerCase().includes(search);
    const matchSt = !statusF || a.status === statusF;
    const matchD = !deptF || a.department === deptF;
    return matchS && matchSt && matchD;
  });

  // Mini stats
  const stats = { Pending:0, Confirmed:0, Completed:0, Cancelled:0 };
  DB.appointments.forEach(a => { if (stats[a.status] !== undefined) stats[a.status]++; });
  const statsEl = document.getElementById('apptStats');
  if (statsEl) {
    const colors = { Pending:'amber', Confirmed:'teal', Completed:'green', Cancelled:'red' };
    statsEl.innerHTML = Object.entries(stats).map(([k,v]) => `
      <div class="stat-card ${colors[k]}" style="padding:14px">
        <div class="stat-value" style="font-size:1.5rem">${v}</div>
        <div class="stat-label">${k}</div>
      </div>
    `).join('');
  }

  const body = document.getElementById('apptsBody');
  if (!body) return;
  body.innerHTML = data.map(a => {
    const statusColor = { Pending:'amber', Confirmed:'teal', Completed:'green', Cancelled:'red' }[a.status] || 'navy';
    const typeColor = { Emergency:'red', Consultation:'teal', 'Follow-up':'navy', 'Check-up':'green' }[a.type] || 'navy';
    return `<tr>
      <td><span class="pid">${a.id}</span></td>
      <td>
        <div class="name-cell">
          <div class="avatar-sm" style="background:${avatarColor(a.patient)};color:#fff">${initials(a.patient)}</div>
          ${a.patient}
        </div>
      </td>
      <td style="font-size:.85rem">${a.doctor}</td>
      <td><span class="badge badge-navy">${a.department}</span></td>
      <td style="font-family:var(--font-mono);font-size:.8rem">${fmtDate(a.date)}</td>
      <td style="font-family:var(--font-mono);font-weight:600">${a.time}</td>
      <td><span class="badge badge-${typeColor}">${a.type}</span></td>
      <td><span class="badge badge-${statusColor}">${a.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          ${a.status !== 'Confirmed' ? `<button class="btn btn-success btn-sm" onclick="updateApptStatus('${a.id}','Confirmed')"><i class="fas fa-check"></i></button>` : ''}
          ${a.status !== 'Completed' ? `<button class="btn btn-ghost btn-sm" onclick="updateApptStatus('${a.id}','Completed')">Done</button>` : ''}
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteAppt('${a.id}')" title="Cancel"><i class="fas fa-ban"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="9"><div class="empty-state"><div class="icon">📅</div><h3>No appointments</h3><p>Book a new appointment to get started.</p></div></td></tr>';
}

function checkDoubleBooking() {
  const doctor = document.getElementById('apptDoctor')?.value;
  const date = document.getElementById('apptDate')?.value;
  const time = document.getElementById('apptTime')?.value;
  const alert = document.getElementById('doubleBookingAlert');
  if (!doctor || !date || !time || !alert) return;
  const conflict = DB.appointments.find(a => a.doctor === doctor && a.date === date && a.time === time && a.status !== 'Cancelled');
  alert.style.display = conflict ? 'block' : 'none';
}

function updateApptStatus(id, status) {
  const a = DB.appointments.find(x => x.id === id);
  if (a) { a.status = status; renderAppointments(); renderDashAppts(); toast(`Appointment ${id} marked as ${status}`, 'success'); }
}

function deleteAppt(id) {
  if (!confirm('Cancel appointment ' + id + '?')) return;
  const a = DB.appointments.find(x => x.id === id);
  if (a) { a.status = 'Cancelled'; renderAppointments(); toast('Appointment cancelled', 'warning'); }
}

function saveNewAppt() {
  const patientId = document.getElementById('apptPatient').value;
  const doctor = document.getElementById('apptDoctor').value;
  const dept = document.getElementById('apptDept').value;
  const date = document.getElementById('apptDate').value;
  const time = document.getElementById('apptTime').value;
  if (!patientId || !doctor || !dept || !date) { toast('Please fill all required fields', 'error'); return; }

  const conflict = DB.appointments.find(a => a.doctor === doctor && a.date === date && a.time === time && a.status !== 'Cancelled');
  if (conflict) { toast('Double-booking detected! Choose a different time.', 'error'); return; }

  const patient = DB.patients.find(p => p.id === patientId);
  const id = 'APT-' + String(DB.appointments.length + 1).padStart(3, '0');
  DB.appointments.push({
    id, patientId, patient: patient?.name || patientId, doctor, department: dept,
    date, time, type: document.getElementById('apptType').value,
    status: 'Pending', notes: document.getElementById('apptNotes').value,
  });
  closeModal('modalNewAppt');
  renderAppointments();
  renderDashAppts();
  toast('Appointment booked for ' + (patient?.name || patientId), 'success');
}

// ── Consultations ──
function renderConsultations() {
  const body = document.getElementById('consultsBody');
  if (!body) return;
  body.innerHTML = DB.consultations.map(c => `<tr>
    <td><span class="pid">${c.id}</span></td>
    <td><div class="name-cell"><div class="avatar-sm" style="background:${avatarColor(c.patient)};color:#fff">${initials(c.patient)}</div>${c.patient}</div></td>
    <td style="font-size:.85rem">${c.doctor}</td>
    <td style="font-family:var(--font-mono);font-size:.8rem">${fmtDate(c.date)}</td>
    <td style="font-weight:500;color:var(--navy-900)">${c.diagnosis}</td>
    <td style="font-size:.83rem;color:var(--navy-600);max-width:140px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${c.complaint}</td>
    <td style="font-size:.83rem;color:var(--teal-600)">${c.prescription}</td>
    <td style="font-family:var(--font-mono);font-size:.78rem;color:var(--amber-600)">${fmtDate(c.followUp)}</td>
    <td>
      <div style="display:flex;gap:6px">
        <button class="btn btn-ghost btn-icon btn-sm" title="View notes" onclick="toast('Consultation notes: ${c.notes.replace(/'/g,"'")}','info',5000)"><i class="fas fa-eye"></i></button>
        <button class="btn btn-primary btn-sm" onclick="createBillFromConsult('${c.patientId}')"><i class="fas fa-file-invoice-dollar"></i></button>
      </div>
    </td>
  </tr>`).join('') || '<tr><td colspan="9"><div class="empty-state"><div class="icon">🩺</div><h3>No consultations</h3></div></td></tr>';
}

function saveNewConsult() {
  const patientId = document.getElementById('cPatient').value;
  const diagnosis = document.getElementById('cDiagnosis').value.trim();
  if (!patientId || !diagnosis) { toast('Patient and diagnosis are required', 'error'); return; }
  const patient = DB.patients.find(p => p.id === patientId);
  const id = 'CONS-' + String(DB.consultations.length + 1).padStart(3, '0');
  DB.consultations.push({
    id, patientId, patient: patient?.name || patientId,
    doctor: document.getElementById('cDoctor').value,
    date: document.getElementById('cDate').value,
    diagnosis,
    complaint: document.getElementById('cComplaint').value,
    prescription: document.getElementById('cPrescription').value,
    followUp: document.getElementById('cFollowUp').value,
    notes: document.getElementById('cNotes').value,
  });
  closeModal('modalNewConsult');
  renderConsultations();
  toast('Consultation saved successfully', 'success');
}

function createBillFromConsult(patientId) {
  const patient = DB.patients.find(p => p.id === patientId);
  navigate('billing');
  openModal('modalNewBill');
  setTimeout(() => {
    document.getElementById('billPatient').value = patientId;
    if (patient) document.getElementById('billInsurance').value = patient.insurance || 'None';
  }, 200);
}

// ── Lab ──
function renderLab() {
  const search = (document.getElementById('labSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('labStatusFilter')?.value || '';
  const priorityF = document.getElementById('labPriorityFilter')?.value || '';

  let data = DB.labTests.filter(l => {
    const matchS = !search || l.patient.toLowerCase().includes(search) || l.test.toLowerCase().includes(search);
    const matchSt = !statusF || l.status === statusF;
    const matchP = !priorityF || l.priority === priorityF;
    return matchS && matchSt && matchP;
  });

  const body = document.getElementById('labBody');
  if (!body) return;
  body.innerHTML = data.map(l => {
    const statusColor = { Pending:'amber', 'In Progress':'teal', Completed:'green' }[l.status] || 'navy';
    return `<tr>
      <td><span class="pid">${l.id}</span></td>
      <td><div class="name-cell"><div class="avatar-sm" style="background:${avatarColor(l.patient)};color:#fff">${initials(l.patient)}</div>${l.patient}</div></td>
      <td style="font-weight:500;color:var(--navy-900)">${l.test}</td>
      <td><span class="badge badge-navy">${l.specimen}</span></td>
      <td style="font-size:.82rem">${l.orderedBy}</td>
      <td style="font-family:var(--font-mono);font-size:.8rem">${fmtDate(l.date)}</td>
      <td><span class="badge ${l.priority === 'Urgent' ? 'badge-red' : 'badge-navy'}">${l.priority}</span></td>
      <td><span class="badge badge-${statusColor}">${l.status}</span></td>
      <td style="font-size:.83rem;color:${l.result === 'Pending' || l.result === '—' ? 'var(--navy-400)' : 'var(--navy-900)'}">
        ${l.result || '—'}
      </td>
      <td style="font-family:var(--font-mono);font-size:.82rem;font-weight:600">${fmtKES(l.cost)}</td>
      <td>
        <div style="display:flex;gap:6px">
          ${l.status !== 'Completed' ? `<button class="btn btn-primary btn-sm" onclick="openLabResult('${l.id}')"><i class="fas fa-vial"></i> Result</button>` : `<span class="badge badge-green">✓ Done</span>`}
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="11"><div class="empty-state"><div class="icon">🔬</div><h3>No lab tests</h3></div></td></tr>';
}

function openLabResult(id) {
  const l = DB.labTests.find(x => x.id === id);
  if (!l) return;
  document.getElementById('labResultBody').innerHTML = `
    <div style="margin-bottom:16px;padding:14px;background:var(--navy-50);border-radius:var(--radius-md);border:1px solid var(--navy-200)">
      <div style="font-weight:700;font-family:var(--font-sans);color:var(--navy-900);margin-bottom:4px">${l.test}</div>
      <div style="font-size:.83rem;color:var(--navy-500)">${l.patient} · ${l.specimen} specimen · Ordered by ${l.orderedBy}</div>
    </div>
    <div class="form-row form-row-2">
      <div><label class="field-label">Status</label>
        <select class="field-select" id="lrStatus">
          <option ${l.status==='Pending'?'selected':''}>Pending</option>
          <option ${l.status==='In Progress'?'selected':''}>In Progress</option>
          <option value="Completed" ${l.status==='Completed'?'selected':''}>Completed</option>
        </select>
      </div>
      <div><label class="field-label">Result</label><input class="field-input" id="lrResult" value="${l.result === '—' || l.result === 'Pending' ? '' : l.result}" placeholder="Enter result value or description"></div>
    </div>
    <div><label class="field-label">Notes</label><textarea class="field-textarea" id="lrNotes" placeholder="Additional technical notes..."></textarea></div>
  `;
  document.getElementById('labResultSaveBtn').onclick = () => {
    l.status = document.getElementById('lrStatus').value;
    l.result = document.getElementById('lrResult').value || (l.status === 'Completed' ? 'Normal' : 'Pending');
    closeModal('modalLabResult');
    renderLab();
    toast('Lab result updated for ' + l.patient, 'success');
  };
  openModal('modalLabResult');
}

function saveNewLab() {
  const patientId = document.getElementById('labPatient').value;
  if (!patientId) { toast('Please select a patient', 'error'); return; }
  const patient = DB.patients.find(p => p.id === patientId);
  const id = 'LAB-' + String(DB.labTests.length + 1).padStart(3, '0');
  const costMap = { 'Complete Blood Count':1500,'HbA1c Test':2500,'Rheumatoid Factor':3000,'Troponin Test':5000,'Urinalysis':800,'X-Ray':2000,'MRI':15000,'CT Scan':18000,'Spirometry':4500,'Liver Function Test':3500,'Kidney Function Test':3000,'Thyroid Function Test':2800 };
  const testName = document.getElementById('labTestName').value;
  DB.labTests.push({
    id, patientId, patient: patient?.name || patientId,
    test: testName, specimen: document.getElementById('labSpecimen').value,
    orderedBy: document.getElementById('labDoctor').value,
    date: document.getElementById('labDate').value,
    status: 'Pending', result: '—',
    cost: costMap[testName] || 2000,
    priority: document.getElementById('labPriority').value,
  });
  closeModal('modalNewLab');
  renderLab();
  toast('Lab test ordered for ' + (patient?.name || patientId), 'success');
}

// ── Billing ──
function renderBilling() {
  const search = (document.getElementById('billSearch')?.value || '').toLowerCase();
  const statusF = document.getElementById('billStatusFilter')?.value || '';

  let data = DB.bills.filter(b => {
    const matchS = !search || b.patient.toLowerCase().includes(search) || b.id.toLowerCase().includes(search);
    const matchSt = !statusF || b.status === statusF;
    return matchS && matchSt;
  });

  const body = document.getElementById('billingBody');
  if (!body) return;
  body.innerHTML = data.map(b => {
    const total = getBillTotal(b.items);
    const statusColor = { Paid:'green', Pending:'amber', Overdue:'red' }[b.status] || 'navy';
    return `<tr>
      <td><span class="pid">${b.id}</span></td>
      <td><div class="name-cell"><div class="avatar-sm" style="background:${avatarColor(b.patient)};color:#fff">${initials(b.patient)}</div>${b.patient}</div></td>
      <td style="font-family:var(--font-mono);font-size:.8rem">${fmtDate(b.date)}</td>
      <td style="font-size:.83rem;color:var(--navy-500)">${b.items.length} item${b.items.length !== 1 ? 's' : ''}</td>
      <td style="font-family:var(--font-mono);font-weight:700;color:var(--navy-900)">${fmtKES(total)}</td>
      <td>${b.insurance !== 'None' ? `<span class="badge badge-teal">${b.insurance}</span>` : '<span style="color:var(--navy-400);font-size:.8rem">—</span>'}</td>
      <td><span class="badge badge-${statusColor}">${b.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-icon btn-sm" onclick="viewBill('${b.id}')" title="View"><i class="fas fa-eye"></i></button>
          ${b.status !== 'Paid' ? `<button class="btn btn-success btn-sm" onclick="markBillPaid('${b.id}')"><i class="fas fa-check"></i> Pay</button>` : '<span class="badge badge-green">✓ Paid</span>'}
          <button class="btn btn-ghost btn-icon btn-sm" onclick="toast('Printing invoice ${b.id}...','info')" title="Print"><i class="fas fa-print"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="8"><div class="empty-state"><div class="icon">🧾</div><h3>No bills found</h3></div></td></tr>';
}

function viewBill(id) {
  const b = DB.bills.find(x => x.id === id);
  if (!b) return;
  const total = getBillTotal(b.items);
  document.getElementById('billViewBody').innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px;padding-bottom:16px;border-bottom:1px solid var(--navy-100)">
      <div>
        <div style="font-family:var(--font-sans);font-size:1.1rem;font-weight:800;color:var(--navy-900)">Invoice ${b.id}</div>
        <div style="font-size:.83rem;color:var(--navy-500);margin-top:3px">Date: ${fmtDate(b.date)} · Patient: ${b.patient}</div>
      </div>
      <span class="badge badge-${b.status === 'Paid' ? 'green' : b.status === 'Overdue' ? 'red' : 'amber'}" style="font-size:.85rem;padding:5px 12px">${b.status}</span>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-bottom:16px">
      <thead>
        <tr style="background:var(--navy-50)">
          <th style="padding:8px 12px;text-align:left;font-size:.75rem;color:var(--navy-500);text-transform:uppercase;letter-spacing:.06em">Description</th>
          <th style="padding:8px 12px;text-align:center;font-size:.75rem;color:var(--navy-500);text-transform:uppercase">Qty</th>
          <th style="padding:8px 12px;text-align:right;font-size:.75rem;color:var(--navy-500);text-transform:uppercase">Unit Rate</th>
          <th style="padding:8px 12px;text-align:right;font-size:.75rem;color:var(--navy-500);text-transform:uppercase">Amount</th>
        </tr>
      </thead>
      <tbody>
        ${b.items.map(i => `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid var(--navy-100)">${i.desc}</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--navy-100);text-align:center">${i.qty}</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--navy-100);text-align:right;font-family:var(--font-mono);font-size:.83rem">${fmtKES(i.rate)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid var(--navy-100);text-align:right;font-family:var(--font-mono);font-weight:600">${fmtKES(i.qty * i.rate)}</td>
        </tr>`).join('')}
      </tbody>
      <tfoot>
        <tr>
          <td colspan="3" style="padding:12px;text-align:right;font-weight:700;color:var(--navy-700)">Total</td>
          <td style="padding:12px;text-align:right;font-family:var(--font-sans);font-size:1.1rem;font-weight:800;color:var(--navy-900)">${fmtKES(total)}</td>
        </tr>
      </tfoot>
    </table>
    <div style="font-size:.82rem;color:var(--navy-500)">Insurance: ${b.insurance}</div>
  `;
  document.getElementById('billMarkPaidBtn').onclick = () => { markBillPaid(id); closeModal('modalViewBill'); };
  document.getElementById('billMarkPaidBtn').style.display = b.status === 'Paid' ? 'none' : '';
  openModal('modalViewBill');
}

function markBillPaid(id) {
  const b = DB.bills.find(x => x.id === id);
  if (b) { b.status = 'Paid'; renderBilling(); toast('Payment received for ' + b.id, 'success'); }
}

function addBillItem() {
  const list = document.getElementById('billItemsList');
  const row = document.createElement('div');
  row.className = 'bill-item-row';
  row.style.cssText = 'display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:10px;align-items:end;margin-bottom:10px';
  row.innerHTML = `
    <div><input class="field-input" placeholder="Description" oninput="updateBillTotal()"></div>
    <div><input class="field-input" type="number" value="1" min="1" oninput="updateBillTotal()"></div>
    <div><input class="field-input" type="number" placeholder="0" oninput="updateBillTotal()"></div>
    <div><button class="btn btn-danger btn-icon btn-sm" onclick="removeBillItem(this)"><i class="fas fa-trash"></i></button></div>
  `;
  list.appendChild(row);
}

function removeBillItem(btn) {
  btn.closest('.bill-item-row').remove();
  updateBillTotal();
}

function updateBillTotal() {
  const rows = document.querySelectorAll('.bill-item-row');
  let total = 0;
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const qty = parseFloat(inputs[1]?.value) || 0;
    const rate = parseFloat(inputs[2]?.value) || 0;
    total += qty * rate;
  });
  const el = document.getElementById('billTotalDisplay');
  if (el) el.textContent = fmtKES(total);
}

function saveNewBill() {
  const patientId = document.getElementById('billPatient').value;
  if (!patientId) { toast('Please select a patient', 'error'); return; }
  const patient = DB.patients.find(p => p.id === patientId);
  const rows = document.querySelectorAll('.bill-item-row');
  const items = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll('input');
    const desc = inputs[0]?.value.trim();
    const qty = parseInt(inputs[1]?.value) || 1;
    const rate = parseFloat(inputs[2]?.value) || 0;
    if (desc) items.push({ desc, qty, rate });
  });
  if (!items.length) { toast('Add at least one billing item', 'error'); return; }
  const id = 'BILL-' + String(DB.bills.length + 1).padStart(3, '0');
  DB.bills.push({
    id, patientId, patient: patient?.name || patientId,
    date: new Date().toISOString().split('T')[0],
    items,
    status: 'Pending',
    insurance: document.getElementById('billInsurance').value,
  });
  closeModal('modalNewBill');
  renderBilling();
  toast('Invoice ' + id + ' created — Total: ' + fmtKES(items.reduce((s,i)=>s+i.qty*i.rate,0)), 'success');
}

// ── Inventory ──
function renderInventory() {
  const search = (document.getElementById('invSearch')?.value || '').toLowerCase();
  const catF = document.getElementById('invCategoryFilter')?.value || '';
  const stF = document.getElementById('invStatusFilter')?.value || '';

  let data = DB.inventory.filter(i => {
    const matchS = !search || i.name.toLowerCase().includes(search) || i.supplier.toLowerCase().includes(search);
    const matchC = !catF || i.category === catF;
    const matchSt = !stF || i.status === stF;
    return matchS && matchC && matchSt;
  });

  const body = document.getElementById('inventoryBody');
  if (!body) return;
  body.innerHTML = data.map(item => {
    const statusColor = { Good:'green', Low:'amber', Critical:'red' }[item.status] || 'navy';
    const pct = Math.min(100, Math.round((item.quantity / (item.minQty * 2)) * 100));
    return `<tr>
      <td><span class="pid">${item.id}</span></td>
      <td style="font-weight:600;color:var(--navy-900)">${item.name}</td>
      <td><span class="badge badge-navy">${item.category}</span></td>
      <td>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-weight:700;font-family:var(--font-mono)">${item.quantity}</span>
          <div style="flex:1;max-width:80px;height:5px;background:var(--navy-100);border-radius:99px;overflow:hidden">
            <div style="height:100%;width:${pct}%;background:${item.status==='Good'?'var(--green-500)':item.status==='Low'?'var(--amber-500)':'var(--red-500)'};border-radius:99px"></div>
          </div>
        </div>
      </td>
      <td style="color:var(--navy-500)">${item.unit}</td>
      <td style="font-family:var(--font-mono);font-size:.82rem">${item.minQty}</td>
      <td style="font-family:var(--font-mono);font-weight:600">${fmtKES(item.unitCost)}</td>
      <td style="font-size:.83rem;color:var(--navy-600)">${item.supplier}</td>
      <td style="font-family:var(--font-mono);font-size:.78rem;color:${new Date(item.expiry) < new Date(Date.now()+90*86400000) ? 'var(--red-600)' : 'var(--navy-500)'}">${fmtDate(item.expiry)}</td>
      <td><span class="badge badge-${statusColor}">${item.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-success btn-sm" onclick="restockItem('${item.id}')"><i class="fas fa-plus"></i> Restock</button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="deleteInvItem('${item.id}')"><i class="fas fa-trash"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('') || '<tr><td colspan="11"><div class="empty-state"><div class="icon">📦</div><h3>No items</h3></div></td></tr>';
}

function restockItem(id) {
  const item = DB.inventory.find(x => x.id === id);
  if (!item) return;
  const qty = prompt(`Restock "${item.name}"\nCurrent quantity: ${item.quantity}\nEnter quantity to add:`, '100');
  if (!qty || isNaN(qty)) return;
  item.quantity += parseInt(qty);
  item.status = item.quantity < item.minQty ? (item.quantity < item.minQty * 0.5 ? 'Critical' : 'Low') : 'Good';
  renderInventory();
  toast(`${item.name} restocked by ${qty} units`, 'success');
}

function deleteInvItem(id) {
  if (!confirm('Remove inventory item ' + id + '?')) return;
  const idx = DB.inventory.findIndex(x => x.id === id);
  if (idx > -1) { DB.inventory.splice(idx, 1); renderInventory(); toast('Item removed', 'warning'); }
}

function saveNewInventory() {
  const name = document.getElementById('invName').value.trim();
  const qty = parseInt(document.getElementById('invQty').value);
  if (!name || !qty) { toast('Name and quantity are required', 'error'); return; }
  const minQty = parseInt(document.getElementById('invMinQty').value) || 50;
  const id = 'INV-' + String(DB.inventory.length + 1).padStart(3, '0');
  DB.inventory.push({
    id, name,
    category: document.getElementById('invCategory').value,
    quantity: qty,
    unit: document.getElementById('invUnit').value,
    minQty,
    unitCost: parseFloat(document.getElementById('invCost').value) || 0,
    supplier: document.getElementById('invSupplier').value,
    expiry: document.getElementById('invExpiry').value,
    status: qty < minQty ? 'Low' : 'Good',
  });
  closeModal('modalNewInventory');
  renderInventory();
  toast('Inventory item "' + name + '" added', 'success');
}

// ── Users ──
function renderUsers() {
  const body = document.getElementById('usersBody');
  if (!body) return;
  body.innerHTML = DB.users.map(u => {
    const roleColor = { Administrator:'red', Doctor:'teal', Receptionist:'purple', 'Lab Technician':'amber' }[u.role] || 'navy';
    return `<tr>
      <td><span class="pid">${u.id}</span></td>
      <td>
        <div class="name-cell">
          <div class="avatar-sm" style="background:${avatarColor(u.name)};color:#fff">${initials(u.name)}</div>
          <span style="font-weight:600">${u.name}</span>
        </div>
      </td>
      <td><span class="badge badge-${roleColor}">${u.role}</span></td>
      <td style="font-size:.83rem">${u.email}</td>
      <td style="font-family:var(--font-mono);font-size:.8rem">${u.phone}</td>
      <td style="font-size:.83rem">${u.department}</td>
      <td style="font-family:var(--font-mono);font-size:.78rem;color:var(--navy-500)">${fmtDate(u.joined)}</td>
      <td><span class="badge badge-${u.status === 'Active' ? 'green' : 'red'}">${u.status}</span></td>
      <td>
        <div style="display:flex;gap:6px">
          <button class="btn btn-ghost btn-sm" onclick="toggleUserStatus('${u.id}')">
            ${u.status === 'Active' ? '<i class="fas fa-ban"></i> Disable' : '<i class="fas fa-check"></i> Enable'}
          </button>
          <button class="btn btn-danger btn-icon btn-sm" onclick="toast('Reset password email sent to ${u.email}','info')"><i class="fas fa-key"></i></button>
        </div>
      </td>
    </tr>`;
  }).join('');
}

function toggleUserStatus(id) {
  const u = DB.users.find(x => x.id === id);
  if (u) {
    u.status = u.status === 'Active' ? 'Inactive' : 'Active';
    renderUsers();
    toast('User ' + u.name + ' is now ' + u.status, u.status === 'Active' ? 'success' : 'warning');
  }
}

function saveNewUser() {
  const name = document.getElementById('uName').value.trim();
  const role = document.getElementById('uRole').value;
  const email = document.getElementById('uEmail').value.trim();
  const pass = document.getElementById('uPass').value;
  if (!name || !role || !email) { toast('Name, role, and email are required', 'error'); return; }
  if (pass && pass.length < 8) { toast('Password must be at least 8 characters', 'error'); return; }
  const id = 'USR-' + String(DB.users.length + 1).padStart(3, '0');
  DB.users.push({
    id, name, role, email,
    phone: document.getElementById('uPhone').value,
    department: document.getElementById('uDept').value,
    status: 'Active',
    joined: new Date().toISOString().split('T')[0],
  });
  closeModal('modalNewUser');
  renderUsers();
  toast('User ' + name + ' created successfully', 'success');
}

// ── Export ──
function exportTable(tableId, filename) {
  const table = document.getElementById(tableId);
  if (!table) return;
  let csv = '';
  table.querySelectorAll('tr').forEach(row => {
    const cols = [...row.querySelectorAll('th, td')].map(c => '"' + c.innerText.replace(/"/g,'""').replace(/\n/g,' ') + '"');
    csv += cols.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename + '_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  toast('Exported ' + filename + '.csv', 'success');
}

// ── Charts ──
Chart.defaults.font.family = "'IBM Plex Sans', sans-serif";
Chart.defaults.color = '#64748b';

function initCharts() {
  // Visits Line Chart
  const ctxVisits = document.getElementById('chartVisits');
  if (ctxVisits) {
    new Chart(ctxVisits, {
      type: 'line',
      data: {
        labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
        datasets: [{
          label: 'Outpatient',
          data: [28, 35, 42, 38, 50, 22, 18],
          borderColor: '#0891b2',
          backgroundColor: 'rgba(8,145,178,.08)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#0891b2',
        }, {
          label: 'Inpatient',
          data: [8, 10, 9, 11, 12, 6, 5],
          borderColor: '#16a34a',
          backgroundColor: 'rgba(22,163,74,.06)',
          fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#16a34a',
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { position: 'top' } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
      }
    });
  }

  // Dept Doughnut
  const ctxDept = document.getElementById('chartDept');
  if (ctxDept) {
    new Chart(ctxDept, {
      type: 'doughnut',
      data: {
        labels: ['Cardiology','Orthopedics','OB/GYN','Endocrinology','Pulmonology','Other'],
        datasets: [{ data: [42,38,35,29,24,18], backgroundColor: ['#0891b2','#16a34a','#9333ea','#d97706','#dc2626','#2563eb'], borderWidth: 0, hoverOffset: 4 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { boxWidth: 12, padding: 12, font: { size: 11 } } } }, cutout: '65%' }
    });
  }

  // Revenue Bar
  const ctxRev = document.getElementById('chartRevenue');
  if (ctxRev) {
    new Chart(ctxRev, {
      type: 'bar',
      data: {
        labels: ['Jul','Aug','Sep','Oct','Nov','Dec'],
        datasets: [{
          label: 'Revenue (KES 000)',
          data: [1800, 2100, 1950, 2400, 2200, 2800],
          backgroundColor: 'rgba(8,145,178,.85)', borderRadius: 6, borderSkipped: false,
        }]
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: { y: { beginAtZero: true, grid: { color: '#f1f5f9' } }, x: { grid: { display: false } } }
      }
    });
  }

  // Bill Status Pie
  const ctxBillStatus = document.getElementById('chartBillStatus');
  if (ctxBillStatus) {
    new Chart(ctxBillStatus, {
      type: 'pie',
      data: {
        labels: ['Paid','Pending','Overdue'],
        datasets: [{ data: [68, 24, 8], backgroundColor: ['#16a34a','#d97706','#dc2626'], borderWidth: 0 }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 14, padding: 14 } } } }
    });
  }

  // Lab Types
  const ctxLabTypes = document.getElementById('chartLabTypes');
  if (ctxLabTypes) {
    new Chart(ctxLabTypes, {
      type: 'bar',
      data: {
        labels: ['Blood Tests','Imaging','Urinalysis','Spirometry','Cultures','Other'],
        datasets: [{ label: 'Count', data: [38, 22, 14, 10, 6, 4], backgroundColor: ['#0891b2','#9333ea','#16a34a','#d97706','#2563eb','#dc2626'], borderRadius: 5 }]
      },
      options: {
        responsive: true, maintainAspectRatio: false, indexAxis: 'y',
        plugins: { legend: { display: false } },
        scales: { x: { beginAtZero: true, grid: { color: '#f1f5f9' } }, y: { grid: { display: false } } }
      }
    });
  }
}
