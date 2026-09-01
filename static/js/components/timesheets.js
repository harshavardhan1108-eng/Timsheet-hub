// Weekly Timesheet View Component
const TimesheetsView = {
  activeWeekStart: null, // YYYY-MM-DD
  timesheetData: null,
  allProjects: [],
  activeRows: [], // Array of row objects: { id, project_id, task_id, is_billable, days: [0..6: {hours, description}] }

  async render(container) {
    if (!this.activeWeekStart) {
      this.activeWeekStart = Store.currentWeekStart;
    }

    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Week Navigator & Action Toolbar -->
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <!-- Week Navigation -->
          <div class="flex items-center gap-3">
            <div class="flex items-center bg-slate-100 p-1 rounded-xl">
              <button onclick="TimesheetsView.prevWeek()" class="p-1.5 hover:bg-white rounded-lg text-slate-600 transition" title="Previous Week">
                <i data-lucide="chevron-left" class="w-4 h-4"></i>
              </button>
              <button onclick="TimesheetsView.currentWeek()" class="px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-white rounded-lg transition">
                This Week
              </button>
              <button onclick="TimesheetsView.nextWeek()" class="p-1.5 hover:bg-white rounded-lg text-slate-600 transition" title="Next Week">
                <i data-lucide="chevron-right" class="w-4 h-4"></i>
              </button>
            </div>

            <div>
              <h3 id="ts-week-label" class="text-base font-bold text-slate-800">Week of ...</h3>
              <p id="ts-status-indicator" class="text-xs font-medium text-slate-500 flex items-center gap-1.5 mt-0.5">
                <span class="w-2 h-2 rounded-full bg-slate-300"></span>
                <span>Checking status...</span>
              </p>
            </div>
          </div>

          <!-- Timesheet Action Buttons -->
          <div class="flex flex-wrap items-center gap-2.5">
            <button onclick="TimesheetsView.autoFillStandardHours()" id="ts-autofill-btn" class="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5">
              <i data-lucide="wand-2" class="w-3.5 h-3.5 text-indigo-600"></i>
              <span>Fill 8h Days</span>
            </button>

            <button onclick="TimesheetsView.copyLastWeek()" id="ts-copy-btn" class="px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1.5">
              <i data-lucide="copy" class="w-3.5 h-3.5 text-slate-600"></i>
              <span>Copy Last Week</span>
            </button>

            <button onclick="TimesheetsView.saveDraft()" id="ts-save-draft-btn" class="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 text-white hover:bg-slate-900 transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="save" class="w-3.5 h-3.5"></i>
              <span>Save Draft</span>
            </button>

            <button onclick="TimesheetsView.submitForApproval()" id="ts-submit-btn" class="px-4 py-2 text-xs font-semibold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="send" class="w-3.5 h-3.5"></i>
              <span>Submit Timesheet</span>
            </button>
          </div>
        </div>

        <!-- Timesheet Status Banner (for Submitted, Rejected, or Approved) -->
        <div id="ts-status-banner" class="hidden"></div>

        <!-- Live Stopwatch / Timer Collapsible Widget -->
        <div class="bg-gradient-to-r from-slate-900 to-indigo-950 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center text-blue-400">
              <i data-lucide="timer" class="w-5 h-5"></i>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <span class="text-xs font-bold uppercase tracking-wider text-blue-300">Live Task Stopwatch</span>
                <span id="ts-timer-pulse" class="w-2 h-2 rounded-full bg-emerald-400 timer-pulse-dot ${Store.timer.isRunning ? '' : 'hidden'}"></span>
              </div>
              <p class="text-xs text-slate-300">Track live work and log directly into today's timesheet.</p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span id="ts-timer-big-display" class="font-mono text-2xl font-black text-white px-3 py-1 bg-black/40 rounded-xl border border-white/10">00:00:00</span>
            
            <button onclick="TimesheetsView.toggleStopwatch()" id="ts-timer-toggle-btn" class="px-4 py-2 rounded-xl text-xs font-bold ${Store.timer.isRunning ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-900'} transition flex items-center gap-1.5">
              <i data-lucide="${Store.timer.isRunning ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i>
              <span>${Store.timer.isRunning ? 'Pause' : 'Start Timer'}</span>
            </button>

            <button onclick="TimesheetsView.logTimerToSheet()" class="px-3 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition flex items-center gap-1.5">
              <i data-lucide="plus-circle" class="w-3.5 h-3.5 text-blue-300"></i>
              <span>Log to Today</span>
            </button>

            <button onclick="TimesheetsView.resetTimer()" class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition" title="Reset Timer">
              <i data-lucide="rotate-ccw" class="w-4 h-4"></i>
            </button>
          </div>
        </div>

        <!-- Weekly Timesheet Matrix Table -->
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[950px]" id="timesheet-grid-table">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3.5 px-4 w-60">Project & Task</th>
                  <th class="py-3.5 px-2 text-center w-16">Billable</th>
                  <th class="py-3.5 px-2 text-center w-20" id="th-day-0">Mon<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20" id="th-day-1">Tue<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20" id="th-day-2">Wed<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20" id="th-day-3">Thu<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20" id="th-day-4">Fri<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20 text-slate-400" id="th-day-5">Sat<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-2 text-center w-20 text-slate-400" id="th-day-6">Sun<br><span class="text-[10px] text-slate-400"></span></th>
                  <th class="py-3.5 px-3 text-center w-20">Total</th>
                  <th class="py-3.5 px-2 text-center w-12"></th>
                </tr>
              </thead>
              <tbody id="timesheet-grid-body" class="divide-y divide-slate-100 text-sm">
                <!-- Dynamic Rows Rendered Here -->
              </tbody>
              <!-- Summary Footer -->
              <tfoot class="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-700">
                <tr>
                  <td colspan="2" class="py-3.5 px-4 text-right">Daily Totals:</td>
                  <td class="py-3.5 px-2 text-center" id="col-total-0">0.0h</td>
                  <td class="py-3.5 px-2 text-center" id="col-total-1">0.0h</td>
                  <td class="py-3.5 px-2 text-center" id="col-total-2">0.0h</td>
                  <td class="py-3.5 px-2 text-center" id="col-total-3">0.0h</td>
                  <td class="py-3.5 px-2 text-center" id="col-total-4">0.0h</td>
                  <td class="py-3.5 px-2 text-center text-slate-400" id="col-total-5">0.0h</td>
                  <td class="py-3.5 px-2 text-center text-slate-400" id="col-total-6">0.0h</td>
                  <td class="py-3.5 px-3 text-center text-blue-600 font-black text-sm" id="grand-total-hours">0.0h</td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>

          <!-- Bottom Add Row & Info Bar -->
          <div class="p-4 bg-slate-50/70 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <button onclick="TimesheetsView.addRow()" id="ts-add-row-btn" class="px-4 py-2 rounded-xl text-xs font-bold bg-white text-blue-600 border border-slate-200 hover:bg-blue-50 transition flex items-center gap-1.5 shadow-sm">
              <i data-lucide="plus" class="w-4 h-4"></i>
              <span>Add Project Row</span>
            </button>

            <div class="flex items-center gap-6 text-xs text-slate-500">
              <div>Billable: <span id="summary-billable-hours" class="font-bold text-slate-800">0.0h</span></div>
              <div>Non-Billable: <span id="summary-nonbillable-hours" class="font-bold text-slate-800">0.0h</span></div>
              <div>Target: <span class="font-bold text-slate-800">${Store.currentUser?.weekly_capacity || 40}h</span></div>
            </div>
          </div>
        </div>

        <!-- Timesheet History Table -->
        <div class="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
          <div class="flex items-center justify-between mb-4">
            <div>
              <h4 class="text-base font-bold text-slate-800">My Timesheet History</h4>
              <p class="text-xs text-slate-500">Past weeks, approval records, and manager feedback</p>
            </div>
          </div>
          <div id="timesheet-history-list" class="divide-y divide-slate-100">
            <div class="text-center py-6 text-slate-400 text-sm">Loading history...</div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadTimesheetData();
    this.updateTimerTickerUI();
  },

  prevWeek() {
    const d = new Date(this.activeWeekStart + 'T00:00:00');
    d.setDate(d.getDate() - 7);
    this.activeWeekStart = d.toISOString().split('T')[0];
    this.loadTimesheetData();
  },

  nextWeek() {
    const d = new Date(this.activeWeekStart + 'T00:00:00');
    d.setDate(d.getDate() + 7);
    this.activeWeekStart = d.toISOString().split('T')[0];
    this.loadTimesheetData();
  },

  currentWeek() {
    this.activeWeekStart = Store.currentWeekStart;
    this.loadTimesheetData();
  },

  async loadTimesheetData() {
    if (!Store.currentUser) return;
    
    // Update Header labels
    document.getElementById('ts-week-label').textContent = `Week of ${Store.formatWeekRange(this.activeWeekStart)}`;
    
    try {
      const [tsRes, projectsRes] = await Promise.all([
        API.get('/api/timesheets', { user_id: Store.currentUser.id, week_start_date: this.activeWeekStart }),
        API.get('/api/projects')
      ]);

      this.timesheetData = tsRes;
      this.allProjects = projectsRes;

      // Update Column Day Headers with date numbers
      tsRes.week_days.forEach((dayStr, idx) => {
        const d = new Date(dayStr + 'T00:00:00');
        const th = document.getElementById(`th-day-${idx}`);
        if (th) {
          const dayName = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][idx];
          th.innerHTML = `${dayName}<br><span class="text-[10px] font-normal text-slate-400">${d.getDate()} ${d.toLocaleDateString('en-US', { month: 'short' })}</span>`;
        }
      });

      // Parse existing entries into grouped rows
      this.parseEntriesToRows(tsRes.entries, tsRes.week_days);
      
      // Update Status and Banner
      this.renderStatusBanner(tsRes.timesheet);

      // Render the Grid
      this.renderGridRows();
      this.calculateTotals();

      // Load User History
      this.loadHistory();

    } catch (e) {
      console.error('Failed to load timesheet', e);
    }
  },

  parseEntriesToRows(entries, weekDays) {
    this.activeRows = [];
    // Group entries by (project_id + '_' + (task_id || 0))
    const grouped = {};

    entries.forEach(e => {
      const key = `${e.project_id}_${e.task_id || 0}`;
      if (!grouped[key]) {
        grouped[key] = {
          project_id: e.project_id,
          task_id: e.task_id,
          is_billable: e.is_billable,
          days: [
            { hours: 0, description: '' },
            { hours: 0, description: '' },
            { hours: 0, description: '' },
            { hours: 0, description: '' },
            { hours: 0, description: '' },
            { hours: 0, description: '' },
            { hours: 0, description: '' }
          ]
        };
      }
      
      const dayIndex = weekDays.indexOf(e.entry_date);
      if (dayIndex >= 0) {
        grouped[key].days[dayIndex] = {
          hours: e.hours || 0,
          description: e.description || ''
        };
      }
    });

    // Convert to array
    Object.values(grouped).forEach(row => {
      this.activeRows.push(row);
    });

    // If no rows, initialize with 1 default assigned project row or first project
    if (this.activeRows.length === 0) {
      const defaultProj = (this.timesheetData.assigned_projects && this.timesheetData.assigned_projects[0]) || this.allProjects[0];
      if (defaultProj) {
        this.activeRows.push({
          project_id: defaultProj.id,
          task_id: null,
          is_billable: 1,
          days: Array.from({ length: 7 }, () => ({ hours: 0, description: '' }))
        });
      }
    }
  },

  renderStatusBanner(ts) {
    const banner = document.getElementById('ts-status-banner');
    const indicator = document.getElementById('ts-status-indicator');
    const isLocked = ts.status === 'submitted' || ts.status === 'approved';

    // Toggle button states
    const saveBtn = document.getElementById('ts-save-draft-btn');
    const submitBtn = document.getElementById('ts-submit-btn');
    const autofillBtn = document.getElementById('ts-autofill-btn');
    const copyBtn = document.getElementById('ts-copy-btn');
    const addRowBtn = document.getElementById('ts-add-row-btn');

    if (isLocked) {
      saveBtn?.classList.add('hidden');
      submitBtn?.classList.add('hidden');
      autofillBtn?.classList.add('hidden');
      copyBtn?.classList.add('hidden');
      addRowBtn?.classList.add('hidden');
    } else {
      saveBtn?.classList.remove('hidden');
      submitBtn?.classList.remove('hidden');
      autofillBtn?.classList.remove('hidden');
      copyBtn?.classList.remove('hidden');
      addRowBtn?.classList.remove('hidden');
    }

    if (ts.status === 'submitted') {
      indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-amber-400"></span><span class="text-amber-700 font-bold">Submitted for Review</span>`;
      banner.className = 'p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 flex items-start gap-3 fade-in';
      banner.innerHTML = `
        <i data-lucide="clock" class="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <h5 class="text-xs font-bold text-amber-800 uppercase tracking-wider">Timesheet Submitted</h5>
          <p class="text-xs text-amber-700 mt-0.5">This timesheet is submitted and awaiting manager review. Edits are locked until reviewed.</p>
        </div>
      `;
    } else if (ts.status === 'approved') {
      indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500"></span><span class="text-emerald-700 font-bold">Approved</span>`;
      banner.className = 'p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-start gap-3 fade-in';
      banner.innerHTML = `
        <i data-lucide="check-circle" class="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <h5 class="text-xs font-bold text-emerald-800 uppercase tracking-wider">Timesheet Approved</h5>
          <p class="text-xs text-emerald-700 mt-0.5">Approved by ${ts.approver_name || 'Manager'}. Hours are finalized for client billing and payroll.</p>
        </div>
      `;
    } else if (ts.status === 'rejected') {
      indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-500"></span><span class="text-rose-700 font-bold">Revision Requested</span>`;
      banner.className = 'p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 fade-in';
      banner.innerHTML = `
        <i data-lucide="alert-triangle" class="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5"></i>
        <div>
          <h5 class="text-xs font-bold text-rose-800 uppercase tracking-wider">Revision Requested by Reviewer</h5>
          <p class="text-xs text-rose-700 mt-0.5"><strong>Reason:</strong> ${ts.rejection_reason || 'Please adjust your logged hours.'}</p>
          <p class="text-xs text-rose-600 mt-1">Make changes in the table below and click <strong>Submit Timesheet</strong> again.</p>
        </div>
      `;
    } else {
      indicator.innerHTML = `<span class="w-2 h-2 rounded-full bg-slate-400"></span><span class="text-slate-600 font-bold">Draft / In Progress</span>`;
      banner.className = 'hidden';
    }

    lucide.createIcons({ root: banner });
  },

  renderGridRows() {
    const tbody = document.getElementById('timesheet-grid-body');
    const isLocked = this.timesheetData.timesheet.status === 'submitted' || this.timesheetData.timesheet.status === 'approved';

    tbody.innerHTML = this.activeRows.map((row, rIdx) => {
      const proj = this.allProjects.find(p => p.id === row.project_id) || this.allProjects[0] || {};
      const rowTotal = row.days.reduce((acc, d) => acc + (parseFloat(d.hours) || 0), 0);

      return `
        <tr class="hover:bg-slate-50/50 transition" data-row-index="${rIdx}">
          <!-- Project & Task Selector -->
          <td class="py-3 px-4">
            <div class="space-y-1.5">
              <select onchange="TimesheetsView.onProjectChange(${rIdx}, this.value)" ${isLocked ? 'disabled' : ''} class="w-full text-xs font-bold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500">
                ${this.allProjects.map(p => `
                  <option value="${p.id}" ${p.id === row.project_id ? 'selected' : ''}>${p.name} (${p.code})</option>
                `).join('')}
              </select>

              <div class="flex items-center gap-2">
                <input type="text" placeholder="Task name / detail" value="${row.task_name || ''}" onchange="TimesheetsView.onTaskNameChange(${rIdx}, this.value)" ${isLocked ? 'disabled' : ''} class="w-full text-[11px] text-slate-600 bg-slate-50 border border-slate-200 rounded-md px-2 py-1 focus:outline-none">
              </div>
            </div>
          </td>

          <!-- Billable Toggle -->
          <td class="py-3 px-2 text-center align-middle">
            <input type="checkbox" ${row.is_billable === 1 ? 'checked' : ''} ${isLocked ? 'disabled' : ''} onchange="TimesheetsView.onBillableChange(${rIdx}, this.checked)" class="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer">
          </td>

          <!-- Mon - Sun Inputs -->
          ${row.days.map((day, dIdx) => {
            const hasNote = Boolean(day.description);
            const val = day.hours > 0 ? day.hours : '';

            return `
              <td class="py-3 px-1.5 text-center align-middle">
                <div class="relative inline-block w-full">
                  <input type="number" step="0.25" min="0" max="24" value="${val}" placeholder="0" 
                    ${isLocked ? 'disabled' : ''}
                    onchange="TimesheetsView.onHourChange(${rIdx}, ${dIdx}, this.value)"
                    class="ts-hour-input w-full text-center text-xs font-bold text-slate-800 bg-slate-50/70 border border-slate-200 rounded-lg py-2 focus:outline-none focus:bg-white focus:border-blue-500">
                  
                  <button type="button" onclick="TimesheetsView.openDayNoteModal(${rIdx}, ${dIdx})" title="${hasNote ? day.description : 'Add note'}" class="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] ${hasNote ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-300 hover:text-slate-600'}">
                    <i data-lucide="${hasNote ? 'file-text' : 'message-square'}" class="w-2.5 h-2.5"></i>
                  </button>
                </div>
              </td>
            `;
          }).join('')}

          <!-- Row Total -->
          <td class="py-3 px-3 text-center align-middle font-bold text-xs text-slate-800" id="row-total-${rIdx}">
            ${rowTotal.toFixed(1)}h
          </td>

          <!-- Delete Row -->
          <td class="py-3 px-2 text-center align-middle">
            ${!isLocked ? `
              <button onclick="TimesheetsView.deleteRow(${rIdx})" class="text-slate-300 hover:text-rose-600 transition p-1" title="Delete Row">
                <i data-lucide="trash-2" class="w-4 h-4"></i>
              </button>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');

    lucide.createIcons({ root: tbody });
  },

  onProjectChange(rIdx, projId) {
    this.activeRows[rIdx].project_id = parseInt(projId);
  },

  onTaskNameChange(rIdx, taskName) {
    this.activeRows[rIdx].task_name = taskName;
  },

  onBillableChange(rIdx, isChecked) {
    this.activeRows[rIdx].is_billable = isChecked ? 1 : 0;
    this.calculateTotals();
  },

  onHourChange(rIdx, dIdx, val) {
    const num = parseFloat(val) || 0;
    this.activeRows[rIdx].days[dIdx].hours = num;
    
    // Update row total
    const rowTotal = this.activeRows[rIdx].days.reduce((acc, d) => acc + (parseFloat(d.hours) || 0), 0);
    const rowTotalEl = document.getElementById(`row-total-${rIdx}`);
    if (rowTotalEl) rowTotalEl.textContent = `${rowTotal.toFixed(1)}h`;

    this.calculateTotals();
  },

  addRow() {
    const defaultProj = (this.timesheetData.assigned_projects && this.timesheetData.assigned_projects[0]) || this.allProjects[0];
    this.activeRows.push({
      project_id: defaultProj ? defaultProj.id : 1,
      task_id: null,
      is_billable: 1,
      days: Array.from({ length: 7 }, () => ({ hours: 0, description: '' }))
    });
    this.renderGridRows();
  },

  deleteRow(rIdx) {
    if (this.activeRows.length <= 1) {
      showToast('Timesheet must have at least one row', 'info');
      return;
    }
    this.activeRows.splice(rIdx, 1);
    this.renderGridRows();
    this.calculateTotals();
  },

  autoFillStandardHours() {
    if (this.activeRows.length === 0) this.addRow();
    // Fill first row Mon-Fri with 8h
    for (let d = 0; d < 5; d++) {
      this.activeRows[0].days[d].hours = 8.0;
    }
    this.renderGridRows();
    this.calculateTotals();
    showToast('Auto-filled 8 hours for Monday to Friday');
  },

  async copyLastWeek() {
    try {
      const d = new Date(this.activeWeekStart + 'T00:00:00');
      d.setDate(d.getDate() - 7);
      const lastWeekStr = d.toISOString().split('T')[0];

      const prevTs = await API.get('/api/timesheets', {
        user_id: Store.currentUser.id,
        week_start_date: lastWeekStr
      });

      if (!prevTs.entries || prevTs.entries.length === 0) {
        showToast('No entries found in previous week', 'info');
        return;
      }

      this.parseEntriesToRows(prevTs.entries, prevTs.week_days);
      this.renderGridRows();
      this.calculateTotals();
      showToast('Copied rows and hours from previous week!');
    } catch (e) {
      console.error(e);
    }
  },

  calculateTotals() {
    let grandTotal = 0;
    let billableTotal = 0;
    let nonBillableTotal = 0;
    const colTotals = [0, 0, 0, 0, 0, 0, 0];

    this.activeRows.forEach(row => {
      row.days.forEach((day, dIdx) => {
        const hrs = parseFloat(day.hours) || 0;
        colTotals[dIdx] += hrs;
        grandTotal += hrs;
        if (row.is_billable === 1) {
          billableTotal += hrs;
        } else {
          nonBillableTotal += hrs;
        }
      });
    });

    // Update Day Column footers
    colTotals.forEach((tot, idx) => {
      const el = document.getElementById(`col-total-${idx}`);
      if (el) el.textContent = `${tot.toFixed(1)}h`;
    });

    const grandEl = document.getElementById('grand-total-hours');
    if (grandEl) grandEl.textContent = `${grandTotal.toFixed(1)}h`;

    const billEl = document.getElementById('summary-billable-hours');
    if (billEl) billEl.textContent = `${billableTotal.toFixed(1)}h`;

    const nonBillEl = document.getElementById('summary-nonbillable-hours');
    if (nonBillEl) nonBillEl.textContent = `${nonBillableTotal.toFixed(1)}h`;
  },

  openDayNoteModal(rIdx, dIdx) {
    const day = this.activeRows[rIdx].days[dIdx];
    const proj = this.allProjects.find(p => p.id === this.activeRows[rIdx].project_id);
    const dayName = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][dIdx];
    const dayDate = this.timesheetData.week_days[dIdx];

    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-base">Entry Description</h4>
            <p class="text-xs text-slate-500">${dayName} (${Store.formatDate(dayDate)}) • ${proj?.name || 'Project'}</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Hours Logged</label>
            <input type="number" id="modal-day-hours" step="0.25" value="${day.hours || 0}" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Task Details & Notes</label>
            <textarea id="modal-day-desc" rows="4" placeholder="What specific achievements or features did you work on?" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">${day.description || ''}</textarea>
          </div>
        </div>

        <div class="flex justify-end gap-3 pt-4 border-t border-slate-100 mt-4">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
          <button onclick="TimesheetsView.saveDayNote(${rIdx}, ${dIdx})" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Save Note</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  saveDayNote(rIdx, dIdx) {
    const hrs = parseFloat(document.getElementById('modal-day-hours').value) || 0;
    const desc = document.getElementById('modal-day-desc').value.trim();

    this.activeRows[rIdx].days[dIdx].hours = hrs;
    this.activeRows[rIdx].days[dIdx].description = desc;

    App.closeModal();
    this.renderGridRows();
    this.calculateTotals();
  },

  getEntriesPayload() {
    const entries = [];
    this.activeRows.forEach(row => {
      row.days.forEach((day, dIdx) => {
        const hrs = parseFloat(day.hours) || 0;
        if (hrs > 0 || day.description) {
          entries.push({
            project_id: row.project_id,
            task_id: row.task_id || null,
            entry_date: this.timesheetData.week_days[dIdx],
            hours: hrs,
            description: day.description || row.task_name || '',
            is_billable: row.is_billable
          });
        }
      });
    });
    return entries;
  },

  async saveDraft() {
    const entries = this.getEntriesPayload();
    try {
      await API.post('/api/timesheets/save', {
        user_id: Store.currentUser.id,
        week_start_date: this.activeWeekStart,
        entries: entries
      });
      showToast('Timesheet draft saved successfully!');
      await this.loadTimesheetData();
    } catch (e) {}
  },

  async submitForApproval() {
    const entries = this.getEntriesPayload();
    const totalHours = entries.reduce((acc, e) => acc + e.hours, 0);

    if (totalHours === 0) {
      showToast('Cannot submit an empty timesheet. Please log your hours first.', 'error');
      return;
    }

    if (!confirm(`Are you sure you want to submit your timesheet (${totalHours.toFixed(1)} hours) for manager review?`)) {
      return;
    }

    try {
      await API.post('/api/timesheets/submit', {
        user_id: Store.currentUser.id,
        week_start_date: this.activeWeekStart,
        entries: entries
      });
      showToast('Timesheet submitted for manager approval! 🎉');
      await this.loadTimesheetData();
    } catch (e) {}
  },

  async loadHistory() {
    const container = document.getElementById('timesheet-history-list');
    try {
      const history = await API.get('/api/timesheets/history', { user_id: Store.currentUser.id });
      if (history.length === 0) {
        container.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No previous timesheets recorded.</p>`;
        return;
      }

      container.innerHTML = history.map(h => {
        let badge = '';
        if (h.status === 'submitted') badge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-submitted">Pending Approval</span>';
        else if (h.status === 'approved') badge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-approved">Approved</span>';
        else if (h.status === 'rejected') badge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-rejected">Rejected</span>';
        else badge = '<span class="px-2.5 py-1 text-xs font-semibold rounded-full badge-draft">Draft</span>';

        return `
          <div class="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition">
            <div class="flex items-center gap-3">
              <div class="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600">
                <i data-lucide="calendar" class="w-4 h-4"></i>
              </div>
              <div>
                <h5 class="text-xs font-bold text-slate-800">Week of ${Store.formatWeekRange(h.week_start_date)}</h5>
                <p class="text-[11px] text-slate-400 mt-0.5">
                  ${h.billable_hours}h billable • ${h.total_hours}h total
                  ${h.approver_name ? ` • Approved by ${h.approver_name}` : ''}
                </p>
              </div>
            </div>

            <div class="flex items-center gap-3">
              ${badge}
              <button onclick="TimesheetsView.viewPastWeek('${h.week_start_date}')" class="text-xs font-bold text-blue-600 hover:text-blue-700">Open</button>
            </div>
          </div>
        `;
      }).join('');
      lucide.createIcons({ root: container });
    } catch (e) {}
  },

  viewPastWeek(weekStartStr) {
    this.activeWeekStart = weekStartStr;
    this.loadTimesheetData();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  },

  // Stopwatch Methods
  toggleStopwatch() {
    Store.timer.isRunning = !Store.timer.isRunning;
    if (Store.timer.isRunning) {
      Store.timer.startTime = Date.now();
      Store.startTimerTicker();
    } else {
      clearInterval(Store.timer.intervalId);
    }
    Store.saveTimerToStorage();
    this.updateTimerTickerUI();
  },

  resetTimer() {
    Store.timer.isRunning = false;
    Store.timer.elapsedSeconds = 0;
    clearInterval(Store.timer.intervalId);
    Store.saveTimerToStorage();
    this.updateTimerTickerUI();
    Store.updateTimerDisplay();
  },

  updateTimerTickerUI() {
    const el = document.getElementById('ts-timer-big-display');
    const pulse = document.getElementById('ts-timer-pulse');
    const btn = document.getElementById('ts-timer-toggle-btn');
    if (el) {
      const hrs = String(Math.floor(Store.timer.elapsedSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((Store.timer.elapsedSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(Store.timer.elapsedSeconds % 60).padStart(2, '0');
      el.textContent = `${hrs}:${mins}:${secs}`;
    }
    if (pulse) {
      if (Store.timer.isRunning) pulse.classList.remove('hidden');
      else pulse.classList.add('hidden');
    }
    if (btn) {
      btn.className = `px-4 py-2 rounded-xl text-xs font-bold ${Store.timer.isRunning ? 'bg-amber-500 hover:bg-amber-600 text-slate-900' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-900'} transition flex items-center gap-1.5`;
      btn.innerHTML = `<i data-lucide="${Store.timer.isRunning ? 'pause' : 'play'}" class="w-3.5 h-3.5"></i><span>${Store.timer.isRunning ? 'Pause' : 'Start Timer'}</span>`;
      lucide.createIcons({ root: btn });
    }
    Store.updateTimerDisplay();
  },

  logTimerToSheet() {
    if (Store.timer.elapsedSeconds < 60) {
      showToast('Timer must run for at least 1 minute before logging', 'info');
      return;
    }

    const hoursToAdd = parseFloat((Store.timer.elapsedSeconds / 3600).toFixed(2));
    const today = new Date();
    let dayIndex = today.getDay() - 1; // Mon is 0, Sun is 6
    if (dayIndex < 0) dayIndex = 6;

    if (this.activeRows.length === 0) this.addRow();

    const currentHours = parseFloat(this.activeRows[0].days[dayIndex].hours) || 0;
    this.activeRows[0].days[dayIndex].hours = parseFloat((currentHours + hoursToAdd).toFixed(2));

    this.renderGridRows();
    this.calculateTotals();
    showToast(`Logged ${hoursToAdd} hours to today's entry!`);
    this.resetTimer();
  }
};
