// Approvals View Component (Manager & Admin Workflow)
const ApprovalsView = {
  statusFilter: 'submitted',
  departmentFilter: 'all',
  selectedTimesheetIds: new Set(),
  currentApprovalsList: [],

  async render(container) {
    this.selectedTimesheetIds.clear();

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Filter Toolbar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <!-- Status Tabs -->
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button id="appr-tab-submitted" onclick="ApprovalsView.setStatusFilter('submitted')" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm">
              Pending Review
            </button>
            <button id="appr-tab-approved" onclick="ApprovalsView.setStatusFilter('approved')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Approved
            </button>
            <button id="appr-tab-rejected" onclick="ApprovalsView.setStatusFilter('rejected')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Rejected
            </button>
            <button id="appr-tab-all" onclick="ApprovalsView.setStatusFilter('all')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              All History
            </button>
          </div>

          <!-- Actions & Dept Filter -->
          <div class="flex flex-wrap items-center gap-3">
            <select id="appr-dept-filter" onchange="ApprovalsView.onDeptChange()" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Infrastructure">Infrastructure</option>
            </select>

            <button id="bulk-approve-btn" onclick="ApprovalsView.bulkApprove()" class="hidden bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
              <i data-lucide="check-check" class="w-4 h-4"></i>
              <span>Approve Selected (<span id="selected-count">0</span>)</span>
            </button>
          </div>
        </div>

        <!-- Approvals Table Container -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3.5 px-4 w-12 text-center">
                    <input type="checkbox" id="select-all-checkbox" onchange="ApprovalsView.toggleSelectAll(this.checked)" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
                  </th>
                  <th class="py-3.5 px-4">Employee</th>
                  <th class="py-3.5 px-3">Week Period</th>
                  <th class="py-3.5 px-3 text-center">Total Hours</th>
                  <th class="py-3.5 px-3 text-center">Billable %</th>
                  <th class="py-3.5 px-3 text-center">Status</th>
                  <th class="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody id="approvals-table-body" class="divide-y divide-slate-100 text-sm">
                <tr><td colspan="7" class="text-center py-12 text-slate-400">Loading approvals queue...</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadApprovals();
  },

  setStatusFilter(status) {
    this.statusFilter = status;
    ['submitted', 'approved', 'rejected', 'all'].forEach(s => {
      const btn = document.getElementById(`appr-tab-${s}`);
      if (btn) {
        if (s === status) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm';
        } else {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900';
        }
      }
    });
    this.selectedTimesheetIds.clear();
    this.updateBulkButton();
    this.loadApprovals();
  },

  onDeptChange() {
    this.departmentFilter = document.getElementById('appr-dept-filter').value;
    this.loadApprovals();
  },

  async loadApprovals() {
    const tbody = document.getElementById('approvals-table-body');
    if (!tbody) return;

    try {
      const data = await API.get('/api/approvals', {
        status: this.statusFilter,
        department: this.departmentFilter
      });
      this.currentApprovalsList = data;

      if (data.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="7" class="text-center py-12">
              <div class="max-w-xs mx-auto text-slate-400">
                <i data-lucide="inbox" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
                <p class="text-xs font-semibold">No timesheets found for this filter.</p>
              </div>
            </td>
          </tr>
        `;
        lucide.createIcons({ root: tbody });
        return;
      }

      tbody.innerHTML = data.map(item => {
        const isSelected = this.selectedTimesheetIds.has(item.id);
        const billablePercent = item.total_hours > 0 ? Math.round((item.billable_hours / item.total_hours) * 100) : 0;
        
        let statusBadge = '';
        if (item.status === 'submitted') statusBadge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-submitted">Pending Review</span>';
        else if (item.status === 'approved') statusBadge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-approved">Approved</span>';
        else if (item.status === 'rejected') statusBadge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-rejected">Rejected</span>';

        return `
          <tr class="hover:bg-slate-50/50 transition ${isSelected ? 'bg-blue-50/40' : ''}">
            <!-- Checkbox -->
            <td class="py-3.5 px-4 text-center align-middle">
              ${item.status === 'submitted' ? `
                <input type="checkbox" ${isSelected ? 'checked' : ''} onchange="ApprovalsView.toggleSelectItem(${item.id}, this.checked)" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
              ` : ''}
            </td>

            <!-- Employee Info -->
            <td class="py-3.5 px-4">
              <div class="flex items-center gap-3">
                <img src="${item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" alt="">
                <div>
                  <h5 class="font-bold text-slate-800 text-sm">${item.user_name}</h5>
                  <p class="text-xs text-slate-500">${item.job_title} • <span class="text-slate-600 font-medium">${item.department}</span></p>
                </div>
              </div>
            </td>

            <!-- Period -->
            <td class="py-3.5 px-3">
              <span class="text-xs font-bold text-slate-800 block">${Store.formatWeekRange(item.week_start_date)}</span>
              <span class="text-[11px] text-slate-400">Submitted ${item.submitted_at ? Store.formatDate(item.submitted_at.split('T')[0]) : 'Recently'}</span>
            </td>

            <!-- Hours -->
            <td class="py-3.5 px-3 text-center">
              <span class="text-sm font-bold text-slate-800">${item.total_hours}h</span>
              <span class="text-[11px] text-slate-400 block">${item.billable_hours}h billable</span>
            </td>

            <!-- Billable % -->
            <td class="py-3.5 px-3 text-center">
              <span class="inline-block px-2 py-0.5 rounded-full text-xs font-bold ${billablePercent >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-700'}">
                ${billablePercent}%
              </span>
            </td>

            <!-- Status -->
            <td class="py-3.5 px-3 text-center align-middle">
              ${statusBadge}
            </td>

            <!-- Actions -->
            <td class="py-3.5 px-4 text-right">
              <div class="flex items-center justify-end gap-2">
                <button onclick='ApprovalsView.inspectTimesheet(${JSON.stringify(item).replace(/'/g, "&apos;")})' class="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 transition">
                  Inspect
                </button>

                ${item.status === 'submitted' ? `
                  <button onclick="ApprovalsView.approveSingle(${item.id})" class="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition" title="Approve">
                    <i data-lucide="check" class="w-4 h-4"></i>
                  </button>
                  <button onclick="ApprovalsView.openRejectModal(${item.id})" class="p-1.5 rounded-lg text-rose-600 hover:bg-rose-50 transition" title="Reject">
                    <i data-lucide="x" class="w-4 h-4"></i>
                  </button>
                ` : ''}
              </div>
            </td>
          </tr>
        `;
      }).join('');

      lucide.createIcons({ root: tbody });
    } catch (e) {
      console.error(e);
    }
  },

  toggleSelectItem(id, checked) {
    if (checked) this.selectedTimesheetIds.add(id);
    else this.selectedTimesheetIds.delete(id);
    this.updateBulkButton();
  },

  toggleSelectAll(checked) {
    if (checked) {
      this.currentApprovalsList.filter(i => i.status === 'submitted').forEach(i => this.selectedTimesheetIds.add(i.id));
    } else {
      this.selectedTimesheetIds.clear();
    }
    this.updateBulkButton();
    this.loadApprovals();
  },

  updateBulkButton() {
    const btn = document.getElementById('bulk-approve-btn');
    const countSpan = document.getElementById('selected-count');
    if (!btn || !countSpan) return;

    countSpan.textContent = this.selectedTimesheetIds.size;
    if (this.selectedTimesheetIds.size > 0) {
      btn.classList.remove('hidden');
    } else {
      btn.classList.add('hidden');
    }
  },

  async approveSingle(timesheetId) {
    try {
      await API.post(`/api/approvals/${timesheetId}/approve`, {
        reviewer_id: Store.currentUser.id
      });
      showToast('Timesheet approved! 🎉');
      App.closeModal();
      this.loadApprovals();
    } catch (e) {}
  },

  openRejectModal(timesheetId) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div class="flex items-center gap-2 text-rose-600">
            <i data-lucide="alert-circle" class="w-5 h-5"></i>
            <h4 class="font-bold text-slate-900 text-lg">Reject Timesheet & Request Revision</h4>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-4">
          <p class="text-xs text-slate-600">
            Please provide actionable feedback explaining why this timesheet requires revision so the employee can correct their entries.
          </p>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Feedback / Rejection Reason *</label>
            <textarea id="rejection-reason-input" rows="4" required placeholder="e.g. Please clarify hours on Project X, or reduce overtime on Thursday." class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-rose-500 focus:outline-none"></textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onclick="ApprovalsView.submitRejection(${timesheetId})" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700">Confirm Rejection</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitRejection(timesheetId) {
    const reason = document.getElementById('rejection-reason-input').value.trim();
    if (!reason) {
      showToast('Please provide a rejection reason.', 'error');
      return;
    }

    try {
      await API.post(`/api/approvals/${timesheetId}/reject`, {
        reviewer_id: Store.currentUser.id,
        rejection_reason: reason
      });
      showToast('Timesheet returned to employee for revision.');
      App.closeModal();
      this.loadApprovals();
    } catch (e) {}
  },

  async bulkApprove() {
    const ids = Array.from(this.selectedTimesheetIds);
    if (ids.length === 0) return;

    if (!confirm(`Are you sure you want to bulk approve ${ids.length} timesheet(s)?`)) return;

    try {
      const res = await API.post('/api/approvals/bulk-approve', {
        reviewer_id: Store.currentUser.id,
        timesheet_ids: ids
      });
      showToast(res.message || 'Timesheets approved!');
      this.selectedTimesheetIds.clear();
      this.updateBulkButton();
      this.loadApprovals();
    } catch (e) {}
  },

  inspectTimesheet(item) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    modalContent.innerHTML = `
      <div class="p-6">
        <!-- Header -->
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div class="flex items-center gap-3">
            <img src="${item.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-12 h-12 rounded-full object-cover border border-slate-200" alt="">
            <div>
              <h4 class="font-bold text-slate-900 text-lg">${item.user_name}</h4>
              <p class="text-xs text-slate-500">${item.job_title} • Week of ${Store.formatWeekRange(item.week_start_date)}</p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <!-- Summary KPIs -->
        <div class="grid grid-cols-3 gap-3 bg-slate-50 p-4 rounded-xl mb-4 text-center">
          <div>
            <p class="text-[10px] text-slate-400 uppercase font-semibold">Total Logged</p>
            <p class="text-base font-black text-slate-800 mt-0.5">${item.total_hours}h</p>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 uppercase font-semibold">Billable Hours</p>
            <p class="text-base font-black text-blue-600 mt-0.5">${item.billable_hours}h</p>
          </div>
          <div>
            <p class="text-[10px] text-slate-400 uppercase font-semibold">Weekly Target</p>
            <p class="text-base font-black text-slate-800 mt-0.5">${item.weekly_capacity}h</p>
          </div>
        </div>

        <!-- Project Breakdown -->
        <div class="mb-5">
          <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Project Breakdown</h5>
          <div class="space-y-2">
            ${(item.project_breakdown || []).map(pb => `
              <div class="p-3 rounded-xl border border-slate-100 flex items-center justify-between">
                <div>
                  <span class="text-xs font-bold text-slate-800">${pb.project_name}</span>
                  <span class="text-[10px] text-slate-500 block">${pb.task_name || 'General Task'}</span>
                </div>
                <div class="text-right">
                  <span class="text-xs font-black text-slate-800">${pb.total_project_hours}h</span>
                  <span class="text-[10px] text-blue-600 block">${pb.billable_project_hours}h billable</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Footer Actions -->
        <div class="flex items-center justify-between pt-4 border-t border-slate-100">
          <span class="text-xs text-slate-400">Status: <strong class="text-slate-700 capitalize">${item.status}</strong></span>

          <div class="flex items-center gap-2">
            <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
            ${item.status === 'submitted' ? `
              <button onclick="ApprovalsView.openRejectModal(${item.id})" class="px-4 py-2 rounded-xl text-xs font-semibold bg-rose-50 text-rose-700 hover:bg-rose-100">Reject</button>
              <button onclick="ApprovalsView.approveSingle(${item.id})" class="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700">Approve Timesheet</button>
            ` : ''}
          </div>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  }
};
