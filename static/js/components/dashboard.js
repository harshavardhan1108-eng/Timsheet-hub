// Dashboard View Component
const DashboardView = {
  chartInstance: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Top Metrics Cards -->
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <!-- Metric 1: Total Team -->
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm card-hover flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Team</p>
              <h3 id="dash-total-resources" class="text-2xl font-bold text-slate-800 mt-1">--</h3>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span class="text-emerald-600 font-medium">100%</span> active capacity
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <i data-lucide="users" class="w-6 h-6"></i>
            </div>
          </div>

          <!-- Metric 2: Logged Hours This Week -->
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm card-hover flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Week Logged Hours</p>
              <h3 id="dash-week-hours" class="text-2xl font-bold text-slate-800 mt-1">-- h</h3>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span id="dash-billable-hours" class="text-blue-600 font-medium">-- h</span> billable
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <i data-lucide="clock" class="w-6 h-6"></i>
            </div>
          </div>

          <!-- Metric 3: Team Utilization -->
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm card-hover flex items-center justify-between">
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Team Utilization</p>
              <h3 id="dash-utilization" class="text-2xl font-bold text-slate-800 mt-1">--%</h3>
              <p class="text-xs text-slate-400 mt-1">Target: 80% - 90%</p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <i data-lucide="activity" class="w-6 h-6"></i>
            </div>
          </div>

          <!-- Metric 4: Pending Approvals -->
          <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm card-hover flex items-center justify-between cursor-pointer" onclick="App.navigate('approvals')">
            <div>
              <p class="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pending Approvals</p>
              <h3 id="dash-pending-approvals" class="text-2xl font-bold text-amber-600 mt-1">--</h3>
              <p class="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <span>Click to review queue</span>
                <i data-lucide="arrow-right" class="w-3 h-3 text-amber-600"></i>
              </p>
            </div>
            <div class="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <i data-lucide="file-check" class="w-6 h-6"></i>
            </div>
          </div>
        </div>

        <!-- Middle Section: Chart & Department Workload -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Department Workload Progress -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h4 class="text-base font-bold text-slate-800">Department Workload</h4>
                <p class="text-xs text-slate-500">Allocated demand vs total capacity</p>
              </div>
              <button onclick="App.navigate('resources')" class="text-xs font-semibold text-blue-600 hover:text-blue-700">View Roster</button>
            </div>
            <div id="dash-dept-list" class="space-y-4">
              <div class="text-center py-6 text-slate-400 text-sm">Loading workload...</div>
            </div>
          </div>

          <!-- Top Projects Burn Rate -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h4 class="text-base font-bold text-slate-800">Active Project Burn Rates</h4>
                <p class="text-xs text-slate-500">Budgeted hours vs actual time logged</p>
              </div>
              <button onclick="App.navigate('projects')" class="text-xs font-semibold text-blue-600 hover:text-blue-700">All Projects</button>
            </div>
            <div id="dash-projects-list" class="space-y-3">
              <div class="text-center py-6 text-slate-400 text-sm">Loading project burn rates...</div>
            </div>
          </div>
        </div>

        <!-- Bottom Section: Quick Actions & Recent Activity -->
        <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <!-- Quick Action Hub -->
          <div class="bg-gradient-to-br from-blue-600 to-indigo-700 p-6 rounded-2xl text-white shadow-sm flex flex-col justify-between">
            <div>
              <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-xs font-medium backdrop-blur-sm mb-3">
                <i data-lucide="zap" class="w-3.5 h-3.5 text-amber-300"></i>
                <span>Quick Actions</span>
              </div>
              <h3 class="text-xl font-bold text-white">Log Time & Staff Projects</h3>
              <p class="text-xs text-blue-100 mt-2 leading-relaxed">
                Log your weekly hours, manage resource allocations, or review pending approvals with one click.
              </p>
            </div>
            <div class="mt-6 space-y-2">
              <button onclick="App.navigate('timesheets')" class="w-full bg-white text-blue-700 hover:bg-blue-50 font-semibold text-sm py-2.5 px-4 rounded-xl shadow-sm transition flex items-center justify-center gap-2">
                <i data-lucide="calendar" class="w-4 h-4"></i>
                <span>Open My Timesheet</span>
              </button>
              <button onclick="App.openAllocationModal()" class="w-full bg-blue-500/30 hover:bg-blue-500/40 text-white font-semibold text-sm py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2 border border-white/20">
                <i data-lucide="user-plus" class="w-4 h-4"></i>
                <span>Assign Resource</span>
              </button>
            </div>
          </div>

          <!-- Recent Timesheet Activity -->
          <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
            <div class="flex items-center justify-between mb-4">
              <div>
                <h4 class="text-base font-bold text-slate-800">Recent Timesheet Submissions</h4>
                <p class="text-xs text-slate-500">Live workflow activity and approvals</p>
              </div>
              <button onclick="App.navigate('approvals')" class="text-xs font-semibold text-blue-600 hover:text-blue-700">Approvals Queue</button>
            </div>
            <div id="dash-recent-activity" class="divide-y divide-slate-100">
              <div class="text-center py-6 text-slate-400 text-sm">Loading activity...</div>
            </div>
          </div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadData();
  },

  async loadData() {
    try {
      const stats = await API.get('/api/dashboard/stats');

      // Fill Metrics
      document.getElementById('dash-total-resources').textContent = stats.total_resources;
      document.getElementById('dash-week-hours').textContent = `${stats.total_week_hours} h`;
      document.getElementById('dash-billable-hours').textContent = `${stats.billable_week_hours} h`;
      document.getElementById('dash-utilization').textContent = `${stats.utilization_rate}%`;
      document.getElementById('dash-pending-approvals').textContent = stats.pending_approvals;

      // Render Department Workload
      const deptContainer = document.getElementById('dash-dept-list');
      if (stats.department_workload.length === 0) {
        deptContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No active departments found.</p>`;
      } else {
        deptContainer.innerHTML = stats.department_workload.map(d => {
          const rate = d.allocation_rate;
          let barColor = 'bg-blue-500';
          let textColor = 'text-blue-600';
          if (rate > 100) {
            barColor = 'bg-rose-500';
            textColor = 'text-rose-600';
          } else if (rate >= 80) {
            barColor = 'bg-emerald-500';
            textColor = 'text-emerald-600';
          }

          return `
            <div>
              <div class="flex items-center justify-between text-xs mb-1.5">
                <span class="font-semibold text-slate-700">${d.department}</span>
                <span class="${textColor} font-bold">${rate}% (${d.allocated_hours}h / ${d.total_capacity}h)</span>
              </div>
              <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(rate, 100)}%"></div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Render Top Projects
      const projContainer = document.getElementById('dash-projects-list');
      if (stats.top_projects.length === 0) {
        projContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No projects active.</p>`;
      } else {
        projContainer.innerHTML = stats.top_projects.map(p => {
          const burn = p.burn_percentage;
          let badgeClass = burn > 90 ? 'bg-rose-50 text-rose-700 border-rose-200' : 'bg-blue-50 text-blue-700 border-blue-200';

          return `
            <div class="p-3.5 rounded-xl border border-slate-100 hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div class="flex items-center gap-3">
                <div class="w-3 h-10 rounded-full" style="background-color: ${p.color || '#3B82F6'}"></div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="font-bold text-slate-800 text-sm">${p.name}</span>
                    <span class="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">${p.code}</span>
                  </div>
                  <p class="text-xs text-slate-400 mt-0.5">${p.client_name || 'Internal Project'}</p>
                </div>
              </div>

              <div class="flex items-center gap-6 sm:w-1/2">
                <div class="flex-1">
                  <div class="flex justify-between text-xs mb-1">
                    <span class="text-slate-500">${p.logged_hours}h / ${p.budget_hours}h</span>
                    <span class="font-bold text-slate-700">${burn}%</span>
                  </div>
                  <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div class="h-2 rounded-full transition-all duration-500 ${burn > 90 ? 'bg-rose-500' : 'bg-blue-600'}" style="width: ${Math.min(burn, 100)}%"></div>
                  </div>
                </div>
                <div class="text-right whitespace-nowrap">
                  <span class="text-xs font-bold text-slate-700">$${(p.billable_value || 0).toLocaleString()}</span>
                  <p class="text-[10px] text-slate-400">revenue</p>
                </div>
              </div>
            </div>
          `;
        }).join('');
      }

      // Render Recent Activity
      const activityContainer = document.getElementById('dash-recent-activity');
      if (stats.recent_activity.length === 0) {
        activityContainer.innerHTML = `<p class="text-xs text-slate-400 text-center py-4">No recent timesheet activity.</p>`;
      } else {
        activityContainer.innerHTML = stats.recent_activity.map(a => {
          let statusBadge = '';
          if (a.status === 'submitted') {
            statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full badge-submitted">Pending Review</span>`;
          } else if (a.status === 'approved') {
            statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full badge-approved">Approved</span>`;
          } else if (a.status === 'rejected') {
            statusBadge = `<span class="px-2 py-0.5 text-xs font-semibold rounded-full badge-rejected">Rejected</span>`;
          }

          return `
            <div class="py-3 flex items-center justify-between gap-4">
              <div class="flex items-center gap-3">
                <img src="${a.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-9 h-9 rounded-full object-cover border border-slate-200" alt="">
                <div>
                  <h5 class="text-sm font-semibold text-slate-800">${a.user_name}</h5>
                  <p class="text-xs text-slate-400">${a.job_title} • Week of ${Store.formatDate(a.week_start_date)}</p>
                </div>
              </div>
              <div class="flex items-center gap-3">
                <span class="text-sm font-bold text-slate-700">${a.total_hours}h</span>
                ${statusBadge}
              </div>
            </div>
          `;
        }).join('');
      }

    } catch (e) {
      console.error('Failed to load dashboard data', e);
    }
  }
};
