// Reports & Analytics View Component
const ReportsView = {
  currentTab: 'utilization', // 'utilization', 'profitability', 'audit'
  chartInstance: null,

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Reports Navigation & Export Action -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button id="rep-tab-utilization" onclick="ReportsView.switchTab('utilization')" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm flex items-center gap-1.5">
              <i data-lucide="bar-chart-2" class="w-4 h-4"></i>
              <span>Resource Utilization</span>
            </button>
            <button id="rep-tab-profitability" onclick="ReportsView.switchTab('profitability')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <i data-lucide="dollar-sign" class="w-4 h-4"></i>
              <span>Project Profitability</span>
            </button>
            <button id="rep-tab-audit" onclick="ReportsView.switchTab('audit')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-1.5">
              <i data-lucide="list" class="w-4 h-4"></i>
              <span>Time Audit Log</span>
            </button>
          </div>

          <button onclick="ReportsView.downloadCSV()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
            <i data-lucide="download" class="w-4 h-4"></i>
            <span>Export CSV</span>
          </button>
        </div>

        <!-- Dynamic Report Container -->
        <div id="reports-dynamic-container">
          <div class="text-center py-12 text-slate-400">Loading reports...</div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadActiveTab();
  },

  switchTab(tab) {
    this.currentTab = tab;
    ['utilization', 'profitability', 'audit'].forEach(t => {
      const btn = document.getElementById(`rep-tab-${t}`);
      if (btn) {
        if (t === tab) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm flex items-center gap-1.5';
        } else {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-1.5';
        }
      }
    });
    this.loadActiveTab();
  },

  async loadActiveTab() {
    const container = document.getElementById('reports-dynamic-container');
    if (!container) return;

    if (this.currentTab === 'utilization') {
      await this.renderUtilization(container);
    } else if (this.currentTab === 'profitability') {
      await this.renderProfitability(container);
    } else {
      await this.renderAuditLog(container);
    }
  },

  // 1. Resource Utilization View
  async renderUtilization(container) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Loading utilization metrics...</div>`;
    try {
      const data = await API.get('/api/reports/utilization');

      container.innerHTML = `
        <div class="space-y-6 fade-in">
          <!-- Department Aggregations Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            ${data.departments.map(d => `
              <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                <div class="flex justify-between items-start">
                  <div>
                    <h5 class="font-bold text-slate-800 text-sm">${d.department}</h5>
                    <p class="text-xs text-slate-400">${d.team_size} members</p>
                  </div>
                  <span class="text-xs font-black px-2 py-1 rounded-full bg-blue-50 text-blue-700">${d.billable_rate}% Billable</span>
                </div>
                <div class="mt-4 flex items-baseline justify-between">
                  <span class="text-xl font-bold text-slate-800">${d.total_logged_hours}h</span>
                  <span class="text-xs text-slate-400">${d.billable_hours}h billable</span>
                </div>
              </div>
            `).join('')}
          </div>

          <!-- Individual Utilization Table -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-100">
              <h4 class="font-bold text-slate-800 text-sm">Resource Utilization Breakdown (Last 30 Days)</h4>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th class="py-3 px-4">Resource</th>
                    <th class="py-3 px-3">Department</th>
                    <th class="py-3 px-3 text-center">Total Logged</th>
                    <th class="py-3 px-3 text-center">Billable Hours</th>
                    <th class="py-3 px-3 text-center">Non-Billable</th>
                    <th class="py-3 px-4 text-center">Billable %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  ${data.resources.map(r => `
                    <tr class="hover:bg-slate-50/50 transition">
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <img src="${r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-8 h-8 rounded-full object-cover border border-slate-200" alt="">
                          <div>
                            <span class="font-bold text-slate-800 text-xs">${r.name}</span>
                            <p class="text-[11px] text-slate-400">${r.job_title}</p>
                          </div>
                        </div>
                      </td>
                      <td class="py-3.5 px-3 text-xs text-slate-600">${r.department}</td>
                      <td class="py-3.5 px-3 text-center font-bold text-slate-800 text-xs">${r.total_logged_hours}h</td>
                      <td class="py-3.5 px-3 text-center text-xs font-semibold text-blue-600">${r.billable_hours}h</td>
                      <td class="py-3.5 px-3 text-center text-xs text-slate-400">${r.non_billable_hours}h</td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold ${r.billable_percentage >= 80 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-700'}">
                          ${r.billable_percentage}%
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
    }
  },

  // 2. Project Profitability View
  async renderProfitability(container) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Loading profitability metrics...</div>`;
    try {
      const projects = await API.get('/api/reports/profitability');

      const totalRevenue = projects.reduce((acc, p) => acc + (p.total_revenue || 0), 0);
      const totalCost = projects.reduce((acc, p) => acc + (p.total_internal_cost || 0), 0);
      const totalProfit = totalRevenue - totalCost;
      const overallMargin = totalRevenue > 0 ? Math.round((totalProfit / totalRevenue) * 100) : 0;

      container.innerHTML = `
        <div class="space-y-6 fade-in">
          <!-- KPI Row -->
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p class="text-xs font-semibold text-slate-500 uppercase">Gross Billable Value</p>
              <h3 class="text-2xl font-black text-slate-800 mt-1">$${totalRevenue.toLocaleString()}</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p class="text-xs font-semibold text-slate-500 uppercase">Total Resource Cost</p>
              <h3 class="text-2xl font-black text-slate-800 mt-1">$${totalCost.toLocaleString()}</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p class="text-xs font-semibold text-slate-500 uppercase">Estimated Gross Profit</p>
              <h3 class="text-2xl font-black text-emerald-600 mt-1">$${totalProfit.toLocaleString()}</h3>
            </div>
            <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <p class="text-xs font-semibold text-slate-500 uppercase">Avg Profit Margin</p>
              <h3 class="text-2xl font-black text-blue-600 mt-1">${overallMargin}%</h3>
            </div>
          </div>

          <!-- Profitability Breakdown Table -->
          <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div class="p-4 bg-slate-50 border-b border-slate-100">
              <h4 class="font-bold text-slate-800 text-sm">Project Profitability & Margins</h4>
            </div>
            <div class="overflow-x-auto">
              <table class="w-full text-left border-collapse min-w-[850px]">
                <thead>
                  <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    <th class="py-3 px-4">Project</th>
                    <th class="py-3 px-3">Client</th>
                    <th class="py-3 px-3 text-center">Logged / Budget</th>
                    <th class="py-3 px-3 text-right">Revenue</th>
                    <th class="py-3 px-3 text-right">Internal Cost</th>
                    <th class="py-3 px-3 text-right">Gross Profit</th>
                    <th class="py-3 px-4 text-center">Margin %</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 text-sm">
                  ${projects.map(p => `
                    <tr class="hover:bg-slate-50/50 transition">
                      <td class="py-3.5 px-4 font-bold text-slate-800 text-xs">
                        ${p.name}
                        <span class="text-[10px] text-slate-400 block font-normal">${p.code} • ${p.status}</span>
                      </td>
                      <td class="py-3.5 px-3 text-xs text-slate-600">${p.client_name || 'Internal'}</td>
                      <td class="py-3.5 px-3 text-center text-xs font-semibold text-slate-700">
                        ${p.logged_hours}h / ${p.budget_hours}h (${p.budget_consumed_percentage}%)
                      </td>
                      <td class="py-3.5 px-3 text-right text-xs font-bold text-slate-800">$${(p.total_revenue || 0).toLocaleString()}</td>
                      <td class="py-3.5 px-3 text-right text-xs text-slate-500">$${(p.total_internal_cost || 0).toLocaleString()}</td>
                      <td class="py-3.5 px-3 text-right text-xs font-black ${p.gross_profit >= 0 ? 'text-emerald-600' : 'text-rose-600'}">
                        $${(p.gross_profit || 0).toLocaleString()}
                      </td>
                      <td class="py-3.5 px-4 text-center">
                        <span class="inline-block px-2.5 py-1 rounded-full text-xs font-bold ${p.margin_percentage >= 30 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}">
                          ${p.margin_percentage}%
                        </span>
                      </td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      `;
      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
    }
  },

  // 3. Time Audit Log
  async renderAuditLog(container) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Loading audit log...</div>`;
    try {
      const logs = await API.get('/api/reports/audit-log');

      container.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden fade-in">
          <div class="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
            <h4 class="font-bold text-slate-800 text-sm">Comprehensive Time Entry Audit Log (${logs.length} entries)</h4>
          </div>
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[850px]">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3 px-4">Date</th>
                  <th class="py-3 px-4">Team Member</th>
                  <th class="py-3 px-3">Project & Task</th>
                  <th class="py-3 px-2 text-center">Hours</th>
                  <th class="py-3 px-2 text-center">Billable</th>
                  <th class="py-3 px-4">Notes / Work Summary</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-xs">
                ${logs.map(l => `
                  <tr class="hover:bg-slate-50/50 transition">
                    <td class="py-3 px-4 font-semibold text-slate-700 whitespace-nowrap">${Store.formatDate(l.entry_date)}</td>
                    <td class="py-3 px-4 font-bold text-slate-800 whitespace-nowrap">${l.user_name}</td>
                    <td class="py-3 px-3">
                      <span class="font-bold text-slate-800 block">${l.project_name}</span>
                      <span class="text-[10px] text-slate-400">${l.task_name || 'Standard'}</span>
                    </td>
                    <td class="py-3 px-2 text-center font-bold text-slate-800">${l.hours}h</td>
                    <td class="py-3 px-2 text-center">
                      <span class="px-1.5 py-0.5 rounded text-[10px] font-semibold ${l.is_billable ? 'bg-blue-50 text-blue-700' : 'bg-slate-100 text-slate-600'}">
                        ${l.is_billable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td class="py-3 px-4 text-slate-600 max-w-xs truncate">${l.description || '—'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
    }
  },

  downloadCSV() {
    window.location.href = '/api/reports/export-csv';
    showToast('Exporting timesheets to CSV... 📥');
  }
};
