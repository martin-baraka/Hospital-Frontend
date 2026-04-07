/* MediCore HMS — backend-connected UI */
(function () {
  const S = { me: null, products: [], services: [], patients: [], visitDetail: null };

  function toast(msg, type) {
    const c = document.getElementById('toastContainer');
    if (!c) return;
    const el = document.createElement('div');
    el.className = 'toast toast-' + (type || 'info');
    el.textContent = msg;
    c.appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  async function api(path, opts) {
    const r = await fetch(path, Object.assign({ credentials: 'same-origin', headers: { 'Content-Type': 'application/json' } }, opts || {}));
    if (r.status === 403) {
      toast('Access denied for your role', 'error');
      throw new Error('403');
    }
    if (r.status === 401) {
      window.location.href = '/login';
      throw new Error('401');
    }
    if (!r.ok) {
      const t = await r.text();
      throw new Error(t || r.status);
    }
    if (r.status === 204) return null;
    const ct = r.headers.get('content-type');
    if (ct && ct.includes('application/json')) return r.json();
    return r.text();
  }

  function role() {
    return S.me && S.me.role;
  }

  function canSeeMoney() {
    return role() === 'ADMIN' || role() === 'CASHIER';
  }

  function isAdmin() {
    return role() === 'ADMIN';
  }

  function isCashier() {
    return role() === 'CASHIER';
  }

  function isClinician() {
    return role() === 'CLINICIAN';
  }

  function isLab() {
    return role() === 'LAB_TECHNICIAN';
  }

  function navigate(page) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.toggle('active', n.dataset.page === page));
    const titles = {
      dashboard: 'Dashboard',
      visits: 'Visits',
      bills: 'Bills',
      patients: 'Patients',
      inventory: 'Inventory',
      accounting: 'Accounting',
      settings: 'System settings',
      reports: 'Reports',
      lab: 'Lab'
    };
    document.getElementById('headerTitle').textContent = titles[page] || page;
    if (page === 'dashboard') renderDashboard();
    if (page === 'visits') renderVisitsPage();
    if (page === 'bills') renderBillsPage();
    if (page === 'patients') renderPatientsPage();
    if (page === 'inventory') renderInventoryPage();
    if (page === 'accounting') renderAccountingPage();
    if (page === 'settings') renderSettingsPage();
    if (page === 'reports') renderReportsPage();
    if (page === 'lab') renderLabPage();
  }

  function buildNav() {
    console.log('buildNav called, isAdmin:', isAdmin(), 'role:', role());
    const nav = document.getElementById('sidebarNav');
    const items = [];
    if (role() === 'LAB_TECHNICIAN') {
      items.push(['lab', 'fa-flask', 'Lab']);
      items.push(['patients', 'fa-users', 'Patients']);
    } else {
      if (isAdmin()) items.push(['dashboard', 'fa-gauge-high', 'Dashboard']);
      items.push(['visits', 'fa-calendar-check', 'Visits']);
      if (isAdmin() || isCashier()) items.push(['bills', 'fa-file-invoice-dollar', 'Bills']);
      items.push(['patients', 'fa-users', 'Patients']);
      if (isAdmin()) items.push(['inventory', 'fa-boxes-stacked', 'Inventory']);
      if (isAdmin() || isCashier()) items.push(['accounting', 'fa-coins', 'Accounting']);
      if (isAdmin()) {
        items.push(['settings', 'fa-gear', 'System settings']);
        items.push(['reports', 'fa-chart-bar', 'Reports']);
      }
    }
    console.log('nav items:', items);
    nav.innerHTML = items.map(([page, icon, label]) =>
      `<div class="nav-item" data-page="${page}" data-nav><span class="nav-icon"><i class="fas ${icon}"></i></span><span class="nav-label">${label}</span></div>`
    ).join('');
    nav.querySelectorAll('[data-nav]').forEach(el => {
      el.addEventListener('click', () => {
        console.log('nav clicked:', el.dataset.page);
        navigate(el.dataset.page);
      });
    });
    const start = items[0][0];
    navigate(start);
  }

  async function renderDashboard() {
    const el = document.getElementById('page-dashboard');
    if (!isAdmin()) {
      el.innerHTML = '<div class="card card-body">Dashboard analytics are available to administrators only.</div>';
      return;
    }
    try {
      const d = await api('/api/dashboard/summary');
      el.innerHTML = `
        <div class="stats-grid">
          <div class="stat-card teal"><div class="stat-value">${d.patientsServed}</div><div class="stat-label">Patients served (range)</div></div>
          <div class="stat-card green"><div class="stat-value">${d.newRegistrations}</div><div class="stat-label">New registrations</div></div>
          <div class="stat-card amber"><div class="stat-value">${d.averageItemsPerCompletedVisit?.toFixed?.(2) ?? d.averageItemsPerCompletedVisit}</div><div class="stat-label">Avg items / completed visit</div></div>
          <div class="stat-card purple"><div class="stat-value">${d.totalRevenue}</div><div class="stat-label">Total income (bills)</div></div>
          <div class="stat-card red"><div class="stat-value">${d.totalExpenses}</div><div class="stat-label">Total expenses</div></div>
          <div class="stat-card teal"><div class="stat-value">${d.profitLoss}</div><div class="stat-label">Profit / loss</div></div>
          <div class="stat-card amber"><div class="stat-value">${d.unpaidAmount}</div><div class="stat-label">Unpaid (bills)</div></div>
          <div class="stat-card green"><div class="stat-value">${d.inventoryValue}</div><div class="stat-label">Inventory value</div></div>
        </div>`;
    } catch (e) {
      el.innerHTML = '<div class="card card-body">Could not load dashboard.</div>';
    }
  }

  async function renderVisitsPage() {
    const el = document.getElementById('page-visits');
    el.innerHTML = `<div class="section-header"><div><div class="section-title">Visits</div></div>
      <button type="button" class="btn btn-primary" id="btnNewVisit"><i class="fas fa-plus"></i> New visit</button></div>
      <div class="filters-row">
        <select class="filter-select" id="visitStatusFilter"><option value="">All</option><option value="DRAFTED">Drafted</option><option value="COMPLETED">Completed</option></select>
        <select class="filter-select" id="visitSort"><option value="date">Sort by date</option><option value="name">Sort by patient name</option></select>
      </div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Date</th><th>Patient</th><th>Status</th><th>Queue</th><th></th></tr></thead><tbody id="visitsBody"></tbody></table></div></div>`;

    document.getElementById('btnNewVisit').onclick = () => openNewVisitForm();
    document.getElementById('visitStatusFilter').onchange = () => loadVisitsTable();
    document.getElementById('visitSort').onchange = () => loadVisitsTable();
    await loadVisitsTable();
  }

  async function loadVisitsTable() {
    const st = document.getElementById('visitStatusFilter')?.value || '';
    const sort = document.getElementById('visitSort')?.value || 'date';
    const q = st ? '?status=' + encodeURIComponent(st) + '&sort=' + sort : '?sort=' + sort;
    const rows = await api('/api/visits' + q);
    const tb = document.getElementById('visitsBody');
    if (!tb) return;
    tb.innerHTML = rows.map(v => `<tr>
      <td>${v.visitDate || ''}</td>
      <td>${escapeHtml(v.patientName)}</td>
      <td><span class="badge badge-teal">${v.status}</span></td>
      <td>${v.currentQueue}</td>
      <td><button type="button" class="btn btn-sm btn-secondary" data-open-visit="${v.id}">Open</button></td>
    </tr>`).join('') || '<tr><td colspan="5">No visits</td></tr>';
    tb.querySelectorAll('[data-open-visit]').forEach(b => {
      b.onclick = () => openVisitDetail(+b.dataset.openVisit);
    });
  }

  function escapeHtml(s) {
    if (!s) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  async function openNewVisitForm() {
    if (!S.patients.length) S.patients = await api('/api/patients');
    const opts = S.patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
    showModal(`
      <p class="field-label">Existing patient</p>
      <select class="field-select" id="nvPatient"><option value="">— New patient —</option>${opts}</select>
      <div id="nvNewBlock" style="margin-top:12px">
        <div class="form-row form-row-2">
          <div><label class="field-label">Name *</label><input class="field-input" id="nvName"></div>
          <div><label class="field-label">Gender</label><select class="field-select" id="nvGender"><option>Male</option><option>Female</option><option>Other</option></select></div>
        </div>
        <div class="form-row form-row-2">
          <div><label class="field-label">Phone</label><input class="field-input" id="nvPhone"></div>
          <div><label class="field-label">DOB</label><input class="field-input" type="date" id="nvDob"></div>
        </div>
      </div>
      <div class="modal-footer" style="margin-top:16px;padding:0;border:0">
        <button type="button" class="btn btn-secondary" id="nvCancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="nvSave">Create visit</button>
      </div>`);
    const sel = document.getElementById('nvPatient');
    const blk = document.getElementById('nvNewBlock');
    sel.onchange = () => { blk.style.display = sel.value ? 'none' : 'block'; };
    sel.onchange();
    document.getElementById('nvCancel').onclick = closeModal;
    document.getElementById('nvSave').onclick = async () => {
      const pid = sel.value ? +sel.value : null;
      let body;
      if (pid) body = { existingPatientId: pid, newPatient: null };
      else body = {
        existingPatientId: null,
        newPatient: {
          name: document.getElementById('nvName').value.trim(),
          gender: document.getElementById('nvGender').value,
          phone: document.getElementById('nvPhone').value.trim(),
          dob: document.getElementById('nvDob').value || null
        }
      };
      if (!pid && !body.newPatient.name) {
        toast('Name required for new patient', 'error');
        return;
      }
      await api('/api/visits', { method: 'POST', body: JSON.stringify(body) });
      closeModal();
      toast('Visit created', 'info');
      await loadVisitsTable();
    };
  }

  async function openVisitDetail(id) {
    S.visitDetail = await api('/api/visits/' + id);
    const v = S.visitDetail.visit;
    const p = S.visitDetail.patient;
    const money = canSeeMoney();
    let billItemsHtml = (S.visitDetail.billItems || []).map(bi => {
      const amt = bi.amount !== undefined ? `<td>${bi.amount}</td>` : '';
      return `<tr><td>${escapeHtml(bi.description)}</td><td>${bi.itemType}</td><td>${bi.quantity}</td>${money ? amt : ''}
        ${money ? `<td><button type="button" class="btn btn-danger btn-sm" data-del-item="${bi.id}">Remove</button></td>` : ''}</tr>`;
    }).join('');
    const pay = S.visitDetail.bill || {};
    let payForm = '';
    if (money && v.status !== 'COMPLETED') {
      payForm = `<h4 style="margin:12px 0 8px">Payment (cashier)</h4>
        <div class="form-row form-row-2">
          <div><label class="field-label">Mobile money</label><input class="field-input" type="number" id="payMobile" value="${pay.paidMobile ?? 0}"></div>
          <div><label class="field-label">Cash</label><input class="field-input" type="number" id="payCash" value="${pay.paidCash ?? 0}"></div>
        </div>
        <div class="form-row form-row-2">
          <div><label class="field-label">Card</label><input class="field-input" type="number" id="payCard" value="${pay.paidCard ?? 0}"></div>
          <div><label class="field-label">Cheque</label><input class="field-input" type="number" id="payCheque" value="${pay.paidCheque ?? 0}"></div>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="btnPay">Apply payment</button>`;
    }
    let addLine = '';
    if (money && v.status === 'DRAFTED') {
      if (!S.products.length) try { S.products = await api('/api/products'); } catch (_) {}
      if (!S.services.length) try { S.services = await api('/api/services'); } catch (_) {}
      const pOpts = S.products.map(x => `<option value="${x.id}">${escapeHtml(x.name)} — ${x.unitSellingPrice ?? x.price ?? 0}</option>`).join('');
      const sOpts = S.services.map(x => `<option value="${x.id}">${escapeHtml(x.name)} — ${x.price}</option>`).join('');
      addLine = `<h4 style="margin:12px 0 8px">Add bill line</h4>
        <div class="form-row form-row-2">
          <div><label class="field-label">Type</label><select class="field-select" id="blType"><option value="PRODUCT">Product</option><option value="SERVICE">Service</option></select></div>
          <div><label class="field-label">Item</label><select class="field-select" id="blItem"></select></div>
        </div>
        <div class="form-row form-row-3">
          <div><label class="field-label">Qty</label><input class="field-input" type="number" id="blQty" value="1"></div>
          <div><label class="field-label">Line total</label><input class="field-input" type="number" id="blTotal" value="0"></div>
          <div style="align-self:flex-end"><button type="button" class="btn btn-secondary btn-sm" id="blAdd">Add</button></div>
        </div>`;
    }

    let clin = '';
    if ((isClinician() || isAdmin()) && v.currentQueue === 'CLINICIAN') {
      const labRowsForDoctor = (S.visitDetail.labTests || []).map(t => `<tr>
        <td>${escapeHtml(t.testName)}</td>
        <td>${escapeHtml(t.result || '')}</td>
        <td>${escapeHtml(t.referenceRange || '')}</td>
        <td>${escapeHtml(t.notes || '')}</td>
        <td>${t.status}</td>
      </tr>`).join('') || '<tr><td colspan="5">No lab tests</td></tr>';
      clin = `
        <h4 style="margin:12px 0 8px">Doctor workspace</h4>
        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button type="button" class="btn btn-sm btn-secondary" data-doc-tab="diagnosis">Diagnosis</button>
          <button type="button" class="btn btn-sm" data-doc-tab="lab">Lab results</button>
        </div>
        <div id="docTabDiagnosis">
          <label class="field-label">Vitals</label><textarea class="field-textarea" id="clVitals">${escapeHtml(v.vitals || '')}</textarea>
          <label class="field-label">Diagnosis</label><textarea class="field-textarea" id="clDx">${escapeHtml(v.diagnosis || '')}</textarea>
          <label class="field-label">Notes</label><textarea class="field-textarea" id="clNotes">${escapeHtml(v.notes || '')}</textarea>
          <button type="button" class="btn btn-primary btn-sm" id="btnClSave">Save diagnosis</button>
        </div>
        <div id="docTabLab" style="display:none">
          <table class="table-wrap"><thead><tr><th>Test</th><th>Result</th><th>Ref</th><th>Notes</th><th>Status</th></tr></thead><tbody>${labRowsForDoctor}</tbody></table>
        </div>`;
    }

    let cashierNotes = '';
    if ((isCashier() || isAdmin()) && v.currentQueue === 'CASHIER') {
      cashierNotes = `<label class="field-label">Visit / cashier notes</label><textarea class="field-textarea" id="csNotes">${escapeHtml(v.notes || '')}</textarea>
        <button type="button" class="btn btn-primary btn-sm" id="btnCsNotes">Save notes</button>`;
    }

    let lab = '';
    if (isLab() || isAdmin() || isClinician()) {
      const rows = (S.visitDetail.labTests || []).map(t => `<tr>
        <td>${escapeHtml(t.testName)}</td><td>${escapeHtml(t.result || '')}</td><td>${escapeHtml(t.referenceRange || '')}</td><td>${escapeHtml(t.notes || '')}</td>
        <td>${isLab() || isAdmin() ? `<button type="button" class="btn btn-sm" data-edit-lab="${t.id}">Edit</button> <button type="button" class="btn btn-danger btn-sm" data-del-lab="${t.id}">Del</button>` : ''}</td>
      </tr>`).join('');
      lab = `<h4 style="margin:12px 0 8px">Lab tests</h4>
        <table class="table-wrap"><thead><tr><th>Test</th><th>Result</th><th>Ref</th><th>Notes</th><th></th></tr></thead><tbody>${rows}</tbody></table>
        <input class="field-input" id="labNewName" placeholder="New test name"><button type="button" class="btn btn-sm btn-secondary" id="labAdd">Order test</button>`;
    }

    showModal(`<h3>Visit #${v.id} — ${escapeHtml(p.name)}</h3>
      <p><strong>Status:</strong> ${v.status} · <strong>Queue:</strong> ${v.currentQueue}</p>
      ${cashierNotes}
      ${clin}
      <h4 style="margin:12px 0 8px">Billed items</h4>
      <table class="table-wrap"><thead><tr><th>Desc</th><th>Type</th><th>Qty</th>${money ? '<th>Amt</th><th></th>' : ''}</tr></thead><tbody>${billItemsHtml}</tbody></table>
      ${addLine}
      ${money ? `<p><strong>Total:</strong> ${pay.totalAmount ?? 0} · <strong>Paid:</strong> ${pay.totalPaid ?? 0} · <strong>Open:</strong> ${pay.openBalance ?? 0}</p>` : ''}
      ${payForm}
      ${lab}
      <div style="margin-top:16px;display:flex;flex-wrap:wrap;gap:8px">
        <button type="button" class="btn btn-secondary btn-sm" data-fw="CASHIER">Send to cashier (billing)</button>
        <button type="button" class="btn btn-secondary btn-sm" data-fw="CLINICIAN">Send to doctor</button>
        <button type="button" class="btn btn-secondary btn-sm" data-fw="LAB">Send to lab</button>
        <button type="button" class="btn btn-success btn-sm" id="btnCompleteVisit">Complete visit</button>
        <button type="button" class="btn btn-outline btn-sm" id="btnCloseVisit">Close</button>
      </div>`);

    function refillLineItems() {
      const ty = document.getElementById('blType').value;
      const sel = document.getElementById('blItem');
      const list = ty === 'PRODUCT' ? S.products : S.services;
      sel.innerHTML = list.map(x => `<option value="${x.id}">${escapeHtml(x.name)}</option>`).join('');
    }
    const blType = document.getElementById('blType');
    if (blType) {
      blType.onchange = refillLineItems;
      refillLineItems();
      document.getElementById('blAdd').onclick = async () => {
        const ty = document.getElementById('blType').value;
        const ref = +document.getElementById('blItem').value;
        const qty = +document.getElementById('blQty').value || 1;
        const total = +document.getElementById('blTotal').value || 0;
        const item = (ty === 'PRODUCT' ? S.products : S.services).find(x => x.id === ref);
        await api(`/api/visits/${id}/bill-items`, {
          method: 'POST',
          body: JSON.stringify({ itemType: ty, itemRefId: ref, description: item ? item.name : '', lineTotal: total, quantity: qty })
        });
        closeModal();
        openVisitDetail(id);
        toast('Line added', 'info');
      };
    }

    document.querySelectorAll('[data-del-item]').forEach(b => {
      b.onclick = async () => {
        await api('/api/visits/bill-items/' + b.dataset.delItem, { method: 'DELETE' });
        openVisitDetail(id);
      };
    });
    const btnPay = document.getElementById('btnPay');
    if (btnPay) {
      btnPay.onclick = async () => {
        await api(`/api/visits/${id}/payment`, {
          method: 'POST',
          body: JSON.stringify({
            paidMobile: +document.getElementById('payMobile').value,
            paidCash: +document.getElementById('payCash').value,
            paidCard: +document.getElementById('payCard').value,
            paidCheque: +document.getElementById('payCheque').value
          })
        });
        openVisitDetail(id);
        toast('Payment saved', 'info');
      };
    }
    const btnCl = document.getElementById('btnClSave');
    if (btnCl) {
      btnCl.onclick = async () => {
        await api(`/api/visits/${id}/clinical`, {
          method: 'PATCH',
          body: JSON.stringify({
            vitals: document.getElementById('clVitals').value,
            diagnosis: document.getElementById('clDx').value,
            notes: document.getElementById('clNotes').value
          })
        });
        toast('Clinical data saved', 'info');
      };
    }
    document.querySelectorAll('[data-doc-tab]').forEach(b => {
      b.onclick = () => {
        const isDiagnosis = b.dataset.docTab === 'diagnosis';
        const diag = document.getElementById('docTabDiagnosis');
        const labTab = document.getElementById('docTabLab');
        if (diag && labTab) {
          diag.style.display = isDiagnosis ? 'block' : 'none';
          labTab.style.display = isDiagnosis ? 'none' : 'block';
        }
      };
    });
    const btnCs = document.getElementById('btnCsNotes');
    if (btnCs) {
      btnCs.onclick = async () => {
        await api(`/api/visits/${id}/cashier-notes`, { method: 'PATCH', body: JSON.stringify({ notes: document.getElementById('csNotes').value }) });
        toast('Notes saved', 'info');
      };
    }
    document.querySelectorAll('[data-fw]').forEach(b => {
      b.onclick = async () => {
        await api(`/api/visits/${id}/forward`, { method: 'POST', body: JSON.stringify({ queue: b.dataset.fw }) });
        closeModal();
        await loadVisitsTable();
        toast('Forwarded', 'info');
      };
    });
    document.getElementById('btnCompleteVisit').onclick = async () => {
      await api(`/api/visits/${id}/complete`, { method: 'POST' });
      closeModal();
      await loadVisitsTable();
      toast('Visit completed', 'info');
    };
    document.getElementById('btnCloseVisit').onclick = closeModal;

    const labAdd = document.getElementById('labAdd');
    if (labAdd) {
      labAdd.onclick = async () => {
        const nm = document.getElementById('labNewName').value.trim();
        if (!nm) return;
        await api(`/api/visits/${id}/lab-tests`, { method: 'POST', body: JSON.stringify({ testName: nm }) });
        openVisitDetail(id);
      };
    }
    document.querySelectorAll('[data-del-lab]').forEach(b => {
      b.onclick = async () => {
        await api('/api/visits/lab-tests/' + b.dataset.delLab, { method: 'DELETE' });
        openVisitDetail(id);
      };
    });
    document.querySelectorAll('[data-edit-lab]').forEach(b => {
      b.onclick = async () => {
        const tid = +b.dataset.editLab;
        const result = prompt('Result');
        const ref = prompt('Reference range');
        const notes = prompt('Notes');
        if (result == null) return;
        await api('/api/visits/lab-tests/' + tid, {
          method: 'PATCH',
          body: JSON.stringify({ result: result || '', referenceRange: ref || '', notes: notes || '' })
        });
        openVisitDetail(id);
      };
    });
  }

  function showModal(innerHtml) {
    document.getElementById('visitModalBody').innerHTML = innerHtml;
    const modal = document.getElementById('visitModal');
    modal.style.display = 'flex';
    modal.classList.add('open');
  }

  function closeModal() {
    const modal = document.getElementById('visitModal');
    modal.classList.remove('open');
    modal.style.display = 'none';
  }

  async function renderBillsPage() {
    const el = document.getElementById('page-bills');
    if (!canSeeMoney()) {
      el.innerHTML = '<div class="card card-body">Bills are visible to cashier and administrator only.</div>';
      return;
    }
    const rows = await api('/api/bills?sort=date');
    el.innerHTML = `<div class="card"><div class="table-wrap"><table><thead><tr><th>Patient</th><th>Total</th><th>Status</th><th>Date</th><th>Open</th></tr></thead><tbody>
      ${rows.map(r => `<tr><td>${escapeHtml(r.patientName)}</td><td>${r.billTotal}</td><td>${r.status}</td><td>${r.billDate}</td><td>${r.openBalance}</td></tr>`).join('')}
    </tbody></table></div></div>`;
  }

  async function renderPatientsPage() {
    const el = document.getElementById('page-patients');
    S.patients = await api('/api/patients');
    el.innerHTML = `<div class="section-header"><div class="section-title">Patients</div>
      ${canSeeMoney() || isAdmin() ? '<button type="button" class="btn btn-primary" id="btnRegPat">Register patient</button>' : ''}</div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Name</th><th>Gender</th><th>Phone</th><th>Age</th><th>Open bal</th><th>Last visit</th>
      ${(canSeeMoney() || isAdmin()) ? '<th>Actions</th>' : ''}</tr></thead><tbody id="pbody"></tbody></table></div></div>`;

    const tb = document.getElementById('pbody');
    tb.innerHTML = S.patients.map(p => {
      const age = p.dob ? Math.floor((Date.now() - new Date(p.dob)) / (365.25 * 24 * 3600 * 1000)) : '—';
      const act = (canSeeMoney() || isAdmin()) ? `<td>
        <button type="button" class="btn btn-sm" data-vp="${p.id}">New visit</button>
        <button type="button" class="btn btn-danger btn-sm" data-dp="${p.id}">Delete</button>
      </td>` : '';
      return `<tr><td>${escapeHtml(p.name)}</td><td>${p.gender || ''}</td><td>${p.phone || ''}</td><td>${age}</td><td>${p.openBalance ?? 0}</td><td>${p.lastVisit || '—'}</td>${act}</tr>`;
    }).join('');

    const reg = document.getElementById('btnRegPat');
    console.log('btnRegPat element:', reg, 'canSeeMoney:', canSeeMoney(), 'isAdmin:', isAdmin());
    if (reg) {
      console.log('setting onclick for register patient');
      reg.onclick = () => {
        showModal(`<h3>Register patient</h3>
          <div class="form-row form-row-2"><div><label class="field-label">Name</label><input class="field-input" id="rpName"></div>
          <div><label class="field-label">Gender</label><select class="field-select" id="rpG"><option>Male</option><option>Female</option></select></div></div>
          <div class="form-row form-row-2"><div><label class="field-label">Phone</label><input class="field-input" id="rpPhone"></div>
          <div><label class="field-label">DOB</label><input class="field-input" type="date" id="rpDob"></div></div>
          <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
            <button type="button" class="btn btn-secondary" id="rpX">Cancel</button>
            <button type="button" class="btn btn-primary" id="rpOk">Save</button>
          </div>`);
        document.getElementById('rpX').onclick = closeModal;
        document.getElementById('rpOk').onclick = async () => {
          console.log('registering patient');
          try {
            await api('/api/patients', {
              method: 'POST',
              body: JSON.stringify({
                name: document.getElementById('rpName').value,
                gender: document.getElementById('rpG').value,
                phone: document.getElementById('rpPhone').value,
                dob: document.getElementById('rpDob').value || null
              })
            });
            console.log('patient registered');
            closeModal();
            renderPatientsPage();
          } catch (e) {
            console.error('failed to register patient:', e);
            toast('Failed to register patient: ' + e.message, 'error');
          }
        };
      };
    }
    tb.querySelectorAll('[data-vp]').forEach(b => {
      b.onclick = async () => {
        const pid = +b.dataset.vp;
        await api('/api/visits', { method: 'POST', body: JSON.stringify({ existingPatientId: pid, newPatient: null }) });
        toast('Visit started', 'info');
        navigate('visits');
      };
    });
    tb.querySelectorAll('[data-dp]').forEach(b => {
      b.onclick = async () => {
        if (!confirm('Delete patient?')) return;
        await api('/api/patients/' + b.dataset.dp, { method: 'DELETE' });
        renderPatientsPage();
      };
    });
  }

  async function renderInventoryPage() {
    const el = document.getElementById('page-inventory');
    if (!isAdmin()) {
      el.innerHTML = '<div class="card card-body">Inventory is restricted to administrators.</div>';
      return;
    }
    const products = await api('/api/products');
    const services = await api('/api/services');
    const suppliers = await api('/api/suppliers');
    let receipts = [];
    try { receipts = await api('/api/stock-receipts'); } catch (_) {}
    el.innerHTML = `<ul class="filters-row" style="list-style:none;display:flex;gap:8px;flex-wrap:wrap">
      <li><button type="button" class="btn btn-sm btn-primary" data-tab="p">Products</button></li>
      <li><button type="button" class="btn btn-sm" data-tab="s">Services</button></li>
      <li><button type="button" class="btn btn-sm" data-tab="u">Suppliers</button></li>
      <li><button type="button" class="btn btn-sm" data-tab="r">Receive products</button></li>
    </ul>
    <div id="invPane"></div>`;

    function showProducts() {
      document.getElementById('invPane').innerHTML = `
        <button type="button" class="btn btn-sm btn-primary" id="addProd">Add product</button>
        <div class="card"><table><thead><tr><th>Name</th><th>Qty</th><th>Sell</th><th>Buy</th><th>Reorder</th><th></th></tr></thead><tbody>
        ${products.map(p => `<tr><td>${escapeHtml(p.name)}</td><td>${p.quantity}</td><td>${p.unitSellingPrice}</td><td>${p.lastBuyPrice}</td><td>${p.reorderLevel}</td>
          <td><button type="button" class="btn btn-sm" data-adj="${p.id}">Qty</button></td></tr>`).join('')}
        </tbody></table></div>`;
      document.getElementById('addProd').onclick = async () => {
        showModal(`<h3>Add product</h3>
          <div class="form-row form-row-2"><div><label class="field-label">Name *</label><input class="field-input" id="prodName"></div>
          <div><label class="field-label">Opening quantity</label><input type="number" class="field-input" id="prodQty" value="0"></div></div>
          <div class="form-row form-row-3"><div><label class="field-label">Selling price</label><input type="number" class="field-input" id="prodSell" value="0"></div>
          <div><label class="field-label">Buying price</label><input type="number" class="field-input" id="prodBuy" value="0"></div>
          <div><label class="field-label">Reorder level</label><input type="number" class="field-input" id="prodReorder" value="5"></div></div>
          <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
            <button type="button" class="btn btn-secondary" id="prodCancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="prodSave">Save product</button>
          </div>`);
        document.getElementById('prodCancel').onclick = closeModal;
        document.getElementById('prodSave').onclick = async () => {
          const name = document.getElementById('prodName').value.trim();
          if (!name) return toast('Product name is required', 'error');
          await api('/api/products', {
            method: 'POST',
            body: JSON.stringify({
              name,
              quantity: +document.getElementById('prodQty').value || 0,
              unitSellingPrice: +document.getElementById('prodSell').value || 0,
              lastBuyPrice: +document.getElementById('prodBuy').value || 0,
              reorderLevel: +document.getElementById('prodReorder').value || 5,
              inactive: false,
              expires: false
            })
          });
          closeModal();
          renderInventoryPage();
        };
      };
      document.querySelectorAll('[data-adj]').forEach(b => {
        b.onclick = async () => {
          const q = prompt('New quantity');
          const reason = prompt('Reason');
          if (q == null) return;
          await api('/api/inventory/products/' + b.dataset.adj + '/quantity', { method: 'PATCH', body: JSON.stringify({ newQuantity: +q, reason: reason || '' }) });
          renderInventoryPage();
        };
      });
    }
    function showServices() {
      document.getElementById('invPane').innerHTML = `
        <button type="button" class="btn btn-sm btn-primary" id="addSvc">Add service</button>
        <div class="card"><table><thead><tr><th>Name</th><th>Price</th><th>Inactive</th></tr></thead><tbody>
        ${services.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${s.price}</td><td>${s.inactive}</td></tr>`).join('')}
        </tbody></table></div>`;
      document.getElementById('addSvc').onclick = async () => {
        showModal(`<h3>Add service</h3>
          <div class="form-row form-row-2"><div><label class="field-label">Service name *</label><input class="field-input" id="svcName"></div>
          <div><label class="field-label">Price</label><input type="number" class="field-input" id="svcPrice" value="0"></div></div>
          <div class="form-row"><div><label class="field-label">Category</label><input class="field-input" id="svcCat" value="General"></div></div>
          <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
            <button type="button" class="btn btn-secondary" id="svcCancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="svcSave">Save service</button>
          </div>`);
        document.getElementById('svcCancel').onclick = closeModal;
        document.getElementById('svcSave').onclick = async () => {
          const name = document.getElementById('svcName').value.trim();
          if (!name) return toast('Service name is required', 'error');
          await api('/api/services', {
            method: 'POST',
            body: JSON.stringify({
              name,
              price: +document.getElementById('svcPrice').value || 0,
              inactive: false,
              category: document.getElementById('svcCat').value || 'General'
            })
          });
          closeModal();
          renderInventoryPage();
        };
      };
    }
    function showSuppliers() {
      document.getElementById('invPane').innerHTML = `
        <button type="button" class="btn btn-sm btn-primary" id="addSup">Add supplier</button>
        <div class="card"><table><thead><tr><th>Name</th><th>Phone</th><th>Email</th><th>Active</th></tr></thead><tbody>
        ${suppliers.map(s => `<tr><td>${escapeHtml(s.name)}</td><td>${s.phone || ''}</td><td>${s.email || ''}</td><td>${s.active}</td></tr>`).join('')}
        </tbody></table></div>`;
      document.getElementById('addSup').onclick = async () => {
        showModal(`<h3>Add supplier</h3>
          <div class="form-row"><div><label class="field-label">Supplier name *</label><input class="field-input" id="supName"></div></div>
          <div class="form-row form-row-2"><div><label class="field-label">Phone</label><input class="field-input" id="supPhone"></div>
          <div><label class="field-label">Email</label><input class="field-input" id="supEmail"></div></div>
          <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
            <button type="button" class="btn btn-secondary" id="supCancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="supSave">Save supplier</button>
          </div>`);
        document.getElementById('supCancel').onclick = closeModal;
        document.getElementById('supSave').onclick = async () => {
          const name = document.getElementById('supName').value.trim();
          if (!name) return toast('Supplier name is required', 'error');
          await api('/api/suppliers', {
            method: 'POST',
            body: JSON.stringify({
              name,
              phone: document.getElementById('supPhone').value || '',
              email: document.getElementById('supEmail').value || '',
              active: true
            })
          });
          closeModal();
          renderInventoryPage();
        };
      };
    }
    function showReceipts() {
      document.getElementById('invPane').innerHTML = `
        <p class="section-subtitle">Record stock from supplier; inventory quantities update on save.</p>
        <button type="button" class="btn btn-sm btn-primary" id="recvGo">New receipt (guided)</button>
        <div class="card"><table><thead><tr><th>Date</th><th>Supplier id</th><th>Bill total</th><th>Balance due</th></tr></thead><tbody>
        ${receipts.map(r => `<tr><td>${r.dateReceived || ''}</td><td>${r.supplier && r.supplier.id}</td><td>${r.billTotal}</td><td>${r.balanceDue}</td></tr>`).join('')}
        </tbody></table></div>`;
      document.getElementById('recvGo').onclick = async () => {
        const supplierOpts = suppliers.map(s => `<option value="${s.id}">${escapeHtml(s.name)}</option>`).join('');
        const productOpts = products.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
        showModal(`<h3>New receipt (guided)</h3>
          <div class="form-row form-row-2"><div><label class="field-label">Supplier</label><select class="field-select" id="rcvSupplier">${supplierOpts}</select></div>
          <div><label class="field-label">Date received</label><input type="date" class="field-input" id="rcvDate" value="${new Date().toISOString().slice(0, 10)}"></div></div>
          <div class="form-row form-row-3"><div><label class="field-label">Product</label><select class="field-select" id="rcvProduct">${productOpts}</select></div>
          <div><label class="field-label">Quantity</label><input type="number" class="field-input" id="rcvQty" value="1"></div>
          <div><label class="field-label">Line total</label><input type="number" class="field-input" id="rcvLineTotal" value="0"></div></div>
          <div class="form-row form-row-3"><div><label class="field-label">Payment method</label><select class="field-select" id="rcvPM"><option>CASH</option><option>MOBILE</option><option>CARD</option><option>CHEQUE</option></select></div>
          <div><label class="field-label">Total payment amount</label><input type="number" class="field-input" id="rcvTot" value="0"></div>
          <div><label class="field-label">Paid amount</label><input type="number" class="field-input" id="rcvPaid" value="0"></div></div>
          <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
            <button type="button" class="btn btn-secondary" id="rcvCancel">Cancel</button>
            <button type="button" class="btn btn-primary" id="rcvSave">Post receipt</button>
          </div>`);
        document.getElementById('rcvCancel').onclick = closeModal;
        document.getElementById('rcvSave').onclick = async () => {
          const sid = +document.getElementById('rcvSupplier').value;
          const pid = +document.getElementById('rcvProduct').value;
          const qty = +document.getElementById('rcvQty').value || 0;
          const lineTotal = +document.getElementById('rcvLineTotal').value || 0;
          if (!sid || !pid || qty <= 0) return toast('Supplier, product and quantity are required', 'error');
          const ub = qty > 0 ? lineTotal / qty : 0;
          const totPay = +document.getElementById('rcvTot').value || lineTotal;
          const paid = +document.getElementById('rcvPaid').value || 0;
          const body = {
            supplier: { id: sid },
            dateReceived: document.getElementById('rcvDate').value || new Date().toISOString().slice(0, 10),
            paymentMethod: document.getElementById('rcvPM').value || 'CASH',
            totalPaymentAmount: totPay,
            paidAmount: paid,
            balanceDue: totPay - paid,
            lines: [{ product: { id: pid }, quantityReceived: qty, totalProductPrice: lineTotal, unitBuyingPrice: ub }]
          };
          await api('/api/stock-receipts', { method: 'POST', body: JSON.stringify(body) });
          closeModal();
          toast('Receipt posted', 'info');
          renderInventoryPage();
        };
      };
    }
    el.querySelectorAll('[data-tab]').forEach(b => {
      b.onclick = () => {
        if (b.dataset.tab === 'p') showProducts();
        if (b.dataset.tab === 's') showServices();
        if (b.dataset.tab === 'u') showSuppliers();
        if (b.dataset.tab === 'r') showReceipts();
      };
    });
    showProducts();
  }

  async function renderAccountingPage() {
    const el = document.getElementById('page-accounting');
    if (!isAdmin() && !isCashier()) {
      el.innerHTML = '<div class="card card-body">Accounting is for administrator and cashier.</div>';
      return;
    }
    const exp = await api('/api/expenses');
    const don = await api('/api/donors-insurers');
    el.innerHTML = `<h3>Track expenses</h3>
      <button type="button" class="btn btn-sm btn-primary" id="addEx">Record expense</button>
      <div class="card"><table><thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Amount</th></tr></thead><tbody>
      ${exp.map(e => `<tr><td>${e.expenseDate || ''}</td><td>${escapeHtml(e.description || '')}</td><td>${escapeHtml(e.category || '')}</td><td>${e.amountPaid}</td></tr>`).join('')}
      </tbody></table></div>
      <h3 style="margin-top:20px">Donors & insurers</h3>
      <button type="button" class="btn btn-sm" id="addDon">Add</button>
      <div class="card"><table><thead><tr><th>Name</th><th>Type</th><th>Active</th></tr></thead><tbody>
      ${don.map(d => `<tr><td>${escapeHtml(d.name)}</td><td>${d.type}</td><td>${d.active}</td></tr>`).join('')}
      </tbody></table></div>`;

    document.getElementById('addEx').onclick = async () => {
      showModal(`<h3>Record expense</h3>
        <div class="form-row"><div><label class="field-label">Description *</label><input class="field-input" id="exDesc"></div></div>
        <div class="form-row form-row-3"><div><label class="field-label">Amount</label><input type="number" class="field-input" id="exAmt" value="0"></div>
        <div><label class="field-label">Category</label><input class="field-input" id="exCat" value="Other"></div>
        <div><label class="field-label">Payment method</label><select class="field-select" id="exPM"><option>CASH</option><option>MOBILE</option><option>CARD</option><option>CHEQUE</option></select></div></div>
        <div class="form-row form-row-2"><div><label class="field-label">Supplier name</label><input class="field-input" id="exSup" value="N/A"></div>
        <div><label class="field-label">Expense date</label><input type="date" class="field-input" id="exDate" value="${new Date().toISOString().slice(0, 10)}"></div></div>
        <div class="modal-footer" style="margin-top:12px;padding:0;border:0">
          <button type="button" class="btn btn-secondary" id="exCancel">Cancel</button>
          <button type="button" class="btn btn-primary" id="exSave">Save expense</button>
        </div>`);
      document.getElementById('exCancel').onclick = closeModal;
      document.getElementById('exSave').onclick = async () => {
        const description = document.getElementById('exDesc').value.trim();
        if (!description) return toast('Description is required', 'error');
        await api('/api/expenses', {
          method: 'POST',
          body: JSON.stringify({
            description,
            amountPaid: +document.getElementById('exAmt').value || 0,
            category: document.getElementById('exCat').value || 'Other',
            paymentMethod: document.getElementById('exPM').value || 'CASH',
            supplierName: document.getElementById('exSup').value || 'N/A',
            expenseDate: document.getElementById('exDate').value || new Date().toISOString().slice(0, 10)
          })
        });
        closeModal();
        renderAccountingPage();
      };
    };
    document.getElementById('addDon').onclick = async () => {
      const name = prompt('Name');
      const type = (prompt('Type DONOR or INSURER') || 'DONOR').toUpperCase();
      if (!name) return;
      await api('/api/donors-insurers', { method: 'POST', body: JSON.stringify({ name, type, active: true }) });
      renderAccountingPage();
    };
  }

  async function renderSettingsPage() {
    const el = document.getElementById('page-settings');
    if (!isAdmin()) {
      el.innerHTML = '<div class="card card-body">Settings are administrator only.</div>';
      return;
    }
    const fac = await api('/api/facility');
    const users = await api('/api/users');
    el.innerHTML = `<h3>Facility</h3>
      <div class="form-row form-row-2"><div><label class="field-label">Official name</label><input class="field-input" id="fName" value="${escapeHtml(fac.officialName || '')}"></div>
      <div><label class="field-label">Phone</label><input class="field-input" id="fPhone" value="${escapeHtml(fac.phone || '')}"></div></div>
      <div class="form-row form-row-2"><div><label class="field-label">County</label><input class="field-input" id="fCo" value="${escapeHtml(fac.county || '')}"></div>
      <div><label class="field-label">Subcounty</label><input class="field-input" id="fSub" value="${escapeHtml(fac.subcounty || '')}"></div></div>
      <button type="button" class="btn btn-primary btn-sm" id="saveFac">Save facility</button>
      <h3 style="margin-top:24px">Users</h3>
      <button type="button" class="btn btn-sm" id="addUser">Add user</button>
      <div class="card"><table><thead><tr><th>Username</th><th>Role</th><th>Status</th><th>Last login</th><th></th></tr></thead><tbody>
      ${users.map(u => `<tr><td>${escapeHtml(u.username)}</td><td>${u.role}</td><td>${u.status}</td><td>${u.lastLoginAt || '—'}</td>
        <td><button type="button" class="btn btn-sm" data-off="${u.id}">Deactivate</button>
        <button type="button" class="btn btn-sm" data-pw="${u.id}">Reset PW</button></td></tr>`).join('')}
      </tbody></table></div>`;

    document.getElementById('saveFac').onclick = async () => {
      await api('/api/facility', {
        method: 'PUT',
        body: JSON.stringify({
          officialName: document.getElementById('fName').value,
          phone: document.getElementById('fPhone').value,
          county: document.getElementById('fCo').value,
          subcounty: document.getElementById('fSub').value,
          logoUrl: fac.logoUrl || ''
        })
      });
      toast('Saved', 'info');
    };
    document.getElementById('addUser').onclick = async () => {
      const username = prompt('Username');
      const pass = prompt('One-time password');
      const r = (prompt('Role ADMIN/CASHIER/CLINICIAN/LAB_TECHNICIAN') || 'CASHIER').toUpperCase();
      if (!username || !pass) return;
      await api('/api/users', { method: 'POST', body: JSON.stringify({ username, oneTimePassword: pass, role: r, active: true }) });
      renderSettingsPage();
    };
    document.querySelectorAll('[data-off]').forEach(b => {
      b.onclick = async () => {
        await api('/api/users/' + b.dataset.off + '/deactivate', { method: 'POST' });
        renderSettingsPage();
      };
    });
    document.querySelectorAll('[data-pw]').forEach(b => {
      b.onclick = async () => {
        const p = prompt('New password');
        if (!p) return;
        await api('/api/users/' + b.dataset.pw + '/reset-password', { method: 'POST', body: JSON.stringify({ newPassword: p }) });
        toast('Password reset', 'info');
      };
    });
  }

  async function renderReportsPage() {
    const el = document.getElementById('page-reports');
    if (!isAdmin()) {
      el.innerHTML = '<div class="card card-body">Reports are for administrators.</div>';
      return;
    }
    const now = new Date();
    const end = now.toISOString().slice(0, 10);
    const start = new Date(now.getTime() - (30 * 24 * 3600 * 1000)).toISOString().slice(0, 10);
    const r = await api('/api/reports/summary?startDate=' + encodeURIComponent(start) + '&endDate=' + encodeURIComponent(end));
    const a = r.analytics || {};
    el.innerHTML = `<div class="section-header"><div><div class="section-title">Reports and analytics</div></div>
      <button type="button" class="btn btn-primary btn-sm" id="expCsv">Export CSV</button></div>
      <div class="stats-grid">
        <div class="stat-card teal"><div class="stat-value">${a.patientsServed ?? 0}</div><div class="stat-label">Patients served</div></div>
        <div class="stat-card green"><div class="stat-value">${a.newRegistrations ?? 0}</div><div class="stat-label">New registrations</div></div>
        <div class="stat-card purple"><div class="stat-value">${a.totalRevenue ?? 0}</div><div class="stat-label">Total revenue</div></div>
        <div class="stat-card red"><div class="stat-value">${a.totalExpenses ?? 0}</div><div class="stat-label">Total expenses</div></div>
        <div class="stat-card amber"><div class="stat-value">${a.profitLoss ?? 0}</div><div class="stat-label">Profit / loss</div></div>
        <div class="stat-card teal"><div class="stat-value">${a.averageItemsPerCompletedVisit ?? 0}</div><div class="stat-label">Avg billed items/visit</div></div>
      </div>`;
    document.getElementById('expCsv').onclick = () => {
      window.open('/api/reports/export/csv?startDate=' + encodeURIComponent(start) + '&endDate=' + encodeURIComponent(end), '_blank');
    };
  }

  async function renderLabPage() {
    const el = document.getElementById('page-lab');
    el.innerHTML = `<div class="section-header"><div><div class="section-title">Lab Tests</div></div>
      <button type="button" class="btn btn-primary" id="btnNewLabTest"><i class="fas fa-plus"></i> New Test</button></div>
      <div class="card"><div class="table-wrap"><table><thead><tr><th>Patient</th><th>Test Name</th><th>Status</th><th>Result</th><th>Technician</th><th></th></tr></thead><tbody id="labTestsBody"></tbody></table></div></div>`;

    document.getElementById('btnNewLabTest').onclick = () => openNewLabTestForm();
    await loadLabTests();
  }

  async function loadLabTests() {
    const tests = await api('/api/lab/tests');
    const tb = document.getElementById('labTestsBody');
    if (!tb) return;
    tb.innerHTML = tests.map(t => `<tr>
      <td>${escapeHtml(t.patientName)}</td>
      <td>${escapeHtml(t.testName)}</td>
      <td><span class="badge badge-${t.status === 'COMPLETED' ? 'green' : 'amber'}">${t.status}</span></td>
      <td>${escapeHtml(t.result || '')}</td>
      <td>${escapeHtml(t.labTechnician || 'Unassigned')}</td>
      <td><button type="button" class="btn btn-sm btn-secondary" data-edit-test="${t.id}">Edit</button></td>
    </tr>`).join('') || '<tr><td colspan="6">No lab tests</td></tr>';
    tb.querySelectorAll('[data-edit-test]').forEach(b => {
      b.onclick = () => openEditLabTestForm(+b.dataset.editTest);
    });
  }

  async function openNewLabTestForm() {
    if (!S.visits) S.visits = await api('/api/visits');
    const opts = S.visits.map(v => `<option value="${v.id}">${escapeHtml(v.patientName)} - ${v.visitDate}</option>`).join('');
    showModal(`
      <p class="field-label">Select Visit</p>
      <select class="field-select" id="labVisit"><option value="">— Select Visit —</option>${opts}</select>
      <div class="form-row">
        <div><label class="field-label">Test Name *</label><input class="field-input" id="labTestName"></div>
      </div>
      <div class="modal-footer" style="margin-top:16px;padding:0;border:0">
        <button type="button" class="btn btn-secondary" id="labCancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="labSave">Create Test</button>
      </div>`);
    document.getElementById('labCancel').onclick = closeModal;
    document.getElementById('labSave').onclick = async () => {
      const visitId = +document.getElementById('labVisit').value;
      const testName = document.getElementById('labTestName').value.trim();
      if (!visitId || !testName) return toast('Please fill all fields', 'error');
      try {
        const result = await api('/api/lab/tests', { method: 'POST', body: JSON.stringify({ visitId, testName }) });
        console.log('Lab test created:', result);
        closeModal();
        await loadLabTests();
        toast('Lab test created', 'success');
      } catch (e) {
        console.error('Error creating lab test:', e);
        const errMsg = e.message || 'Failed to create test';
        toast(errMsg, 'error');
      }
    };
  }

  async function openEditLabTestForm(id) {
    const tests = await api('/api/lab/tests');
    const test = tests.find(t => t.id === id);
    if (!test) return;
    showModal(`
      <p class="field-label">Test: ${escapeHtml(test.testName)}</p>
      <p class="field-label">Patient: ${escapeHtml(test.patientName)}</p>
      <div class="form-row">
        <div><label class="field-label">Result</label><textarea class="field-input" id="labResult">${escapeHtml(test.result || '')}</textarea></div>
      </div>
      <div class="form-row">
        <div><label class="field-label">Reference Range</label><input class="field-input" id="labRange" value="${escapeHtml(test.referenceRange || '')}"></div>
      </div>
      <div class="form-row">
        <div><label class="field-label">Notes</label><textarea class="field-input" id="labNotes">${escapeHtml(test.notes || '')}</textarea></div>
      </div>
      <div class="form-row">
        <div><label class="field-label">Status</label><select class="field-select" id="labStatus"><option value="PENDING" ${test.status === 'PENDING' ? 'selected' : ''}>Pending</option><option value="COMPLETED" ${test.status === 'COMPLETED' ? 'selected' : ''}>Completed</option></select></div>
      </div>
      <div class="modal-footer" style="margin-top:16px;padding:0;border:0">
        <button type="button" class="btn btn-secondary" id="labEditCancel">Cancel</button>
        <button type="button" class="btn btn-primary" id="labEditSave">Save</button>
      </div>`);
    document.getElementById('labEditCancel').onclick = closeModal;
    document.getElementById('labEditSave').onclick = async () => {
      const body = {
        result: document.getElementById('labResult').value,
        referenceRange: document.getElementById('labRange').value,
        notes: document.getElementById('labNotes').value,
        status: document.getElementById('labStatus').value
      };
      try {
        await api('/api/lab/tests/' + id, { method: 'PUT', body: JSON.stringify(body) });
        closeModal();
        await loadLabTests();
        toast('Lab test updated', 'success');
      } catch (e) {
        toast('Failed to update test', 'error');
      }
    };
  }

  async function init() {
    console.log('init started');
    try {
      S.me = await api('/api/auth/me');
      console.log('me:', S.me);
    } catch (_) {
      console.log('auth failed, redirecting to login');
      window.location.href = '/login';
      return;
    }
    console.log('role:', role());
    document.getElementById('userName').textContent = S.me.username;
    document.getElementById('userRoleName').textContent = S.me.role;
    document.getElementById('roleBadge').textContent = S.me.role;
    document.getElementById('sidebarRoleText').textContent = S.me.role;
    document.getElementById('userAvatar').textContent = (S.me.username || 'U').slice(0, 2).toUpperCase();
    document.getElementById('headerSub').textContent = 'Signed in as ' + S.me.username;
    document.getElementById('visitModalClose').onclick = closeModal;
    console.log('building nav');
    buildNav();
    setInterval(() => {
      document.getElementById('liveDate').textContent = new Date().toLocaleString();
    }, 1000);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
