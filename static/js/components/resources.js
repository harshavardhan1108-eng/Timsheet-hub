// Resources & Allocation Heatmap View
const ResourcesView = {
  currentSubTab: 'heatmap', // 'heatmap' or 'roster'
  departmentFilter: 'all',
  roleFilter: 'all',

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Sub-navigation & Actions -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <!-- View Toggle -->
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button id="subtab-heatmap-btn" onclick="ResourcesView.switchSubTab('heatmap')" class="px-4 py-2 text-xs font-bold rounded-lg transition ${this.currentSubTab === 'heatmap' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'} flex items-center gap-2">
              <i data-lucide="grid" class="w-4 h-4"></i>
              <span>Capacity Heatmap</span>
            </button>
            <button id="subtab-roster-btn" onclick="ResourcesView.switchSubTab('roster')" class="px-4 py-2 text-xs font-bold rounded-lg transition ${this.currentSubTab === 'roster' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'} flex items-center gap-2">
              <i data-lucide="users" class="w-4 h-4"></i>
              <span>Team Directory</span>
            </button>
          </div>

          <!-- Filters & Action Buttons -->
          <div class="flex flex-wrap items-center gap-3">
            <select id="res-dept-filter" onchange="ResourcesView.onFilterChange()" class="bg-slate-50 border border-slate-200 text-slate-700 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500">
              <option value="all">All Departments</option>
              <option value="Engineering">Engineering</option>
              <option value="Design">Design</option>
              <option value="Product">Product</option>
              <option value="Quality Assurance">Quality Assurance</option>
              <option value="Infrastructure">Infrastructure</option>
              <option value="Project Management">Project Management</option>
              <option value="Leadership">Leadership</option>
            </select>

            <button onclick="ResourcesView.openAddResourceModal()" class="bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
              <i data-lucide="user-plus" class="w-4 h-4"></i>
              <span>Add Resource</span>
            </button>

            <button onclick="App.openAllocationModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
              <i data-lucide="calendar-plus" class="w-4 h-4"></i>
              <span>Assign Project</span>
            </button>
          </div>
        </div>

        <!-- Dynamic Container for Heatmap or Directory -->
        <div id="resources-dynamic-content">
          <div class="text-center py-12 text-slate-400">Loading resources...</div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadCurrentView();
  },

  switchSubTab(tab) {
    this.currentSubTab = tab;
    const heatBtn = document.getElementById('subtab-heatmap-btn');
    const rosterBtn = document.getElementById('subtab-roster-btn');
    
    if (tab === 'heatmap') {
      heatBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm flex items-center gap-2';
      rosterBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-2';
    } else {
      rosterBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm flex items-center gap-2';
      heatBtn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900 flex items-center gap-2';
    }
    this.loadCurrentView();
  },

  onFilterChange() {
    this.departmentFilter = document.getElementById('res-dept-filter').value;
    this.loadCurrentView();
  },

  async loadCurrentView() {
    const container = document.getElementById('resources-dynamic-content');
    if (!container) return;

    if (this.currentSubTab === 'heatmap') {
      await this.renderHeatmap(container);
    } else {
      await this.renderRoster(container);
    }
  },

  // 1. Capacity & Allocation Heatmap Matrix
  async renderHeatmap(container) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Loading capacity heatmap...</div>`;
    try {
      const data = await API.get('/api/allocations/heatmap', { weeks_count: 6 });
      let filteredResources = data.resources;
      if (this.departmentFilter !== 'all') {
        filteredResources = filteredResources.filter(r => r.department === this.departmentFilter);
      }

      container.innerHTML = `
        <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden fade-in">
          <!-- Heatmap Legend & Summary -->
          <div class="p-4 bg-slate-50/70 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
            <div class="flex items-center gap-2">
              <span class="text-xs font-bold text-slate-700">Workload Capacity Heatmap (6-Week Horizon)</span>
              <span class="text-xs text-slate-400">(${filteredResources.length} team members)</span>
            </div>
            
            <div class="flex items-center gap-4 text-xs font-medium">
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>
                <span class="text-slate-600">Available (&lt;75%)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-emerald-100 border border-emerald-300"></span>
                <span class="text-slate-600">Optimal (75-100%)</span>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="w-3 h-3 rounded-full bg-rose-100 border border-rose-300"></span>
                <span class="text-rose-700 font-semibold">Overloaded (&gt;100%)</span>
              </div>
            </div>
          </div>

          <!-- Heatmap Matrix Table -->
          <div class="overflow-x-auto">
            <table class="w-full text-left border-collapse min-w-[800px]">
              <thead>
                <tr class="bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-200">
                  <th class="py-3.5 px-4 w-72">Team Member / Role</th>
                  <th class="py-3.5 px-3 text-center w-24">Weekly Cap</th>
                  ${data.weeks.map(w => `<th class="py-3.5 px-3 text-center">${w.label}</th>`).join('')}
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100 text-sm">
                ${filteredResources.map(r => {
                  return `
                    <tr class="hover:bg-slate-50/50 transition">
                      <!-- User Info -->
                      <td class="py-3.5 px-4">
                        <div class="flex items-center gap-3">
                          <img src="${r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-10 h-10 rounded-full object-cover border border-slate-200 flex-shrink-0" alt="">
                          <div class="truncate">
                            <h5 class="font-bold text-slate-800 text-sm truncate">${r.name}</h5>
                            <p class="text-xs text-slate-500 truncate">${r.job_title}</p>
                            <span class="inline-block text-[10px] font-medium px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 mt-0.5">${r.department}</span>
                          </div>
                        </div>
                      </td>

                      <!-- Weekly Capacity -->
                      <td class="py-3.5 px-3 text-center font-bold text-slate-600 text-xs">
                        ${r.weekly_capacity}h
                      </td>

                      <!-- Week Columns -->
                      ${r.weeks.map(w => {
                        let cellClass = 'heatmap-cell-optimal';
                        if (w.status === 'overloaded') cellClass = 'heatmap-cell-overloaded';
                        else if (w.status === 'available') cellClass = 'heatmap-cell-available';
                        else if (w.total_hours === 0) cellClass = 'heatmap-cell-empty';

                        return `
                          <td class="py-3 px-2 text-center align-middle">
                            <div class="mx-auto p-2 rounded-xl ${cellClass} transition cursor-pointer hover:shadow-md" onclick='ResourcesView.showWeekAllocationDetails(${JSON.stringify(r).replace(/'/g, "&apos;")}, ${JSON.stringify(w).replace(/'/g, "&apos;")})'>
                              <span class="text-xs font-bold">${w.total_hours}h</span>
                              <p class="text-[10px] opacity-80">${w.percentage}%</p>
                            </div>
                          </td>
                        `;
                      }).join('')}
                    </tr>
                  `;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="text-rose-600 py-8 text-center text-sm">Failed to load heatmap matrix.</div>`;
    }
  },

  // 2. Resource Directory / Roster
  async renderRoster(container) {
    container.innerHTML = `<div class="text-center py-12 text-slate-400 text-sm">Loading team roster...</div>`;
    try {
      const resources = await API.get('/api/resources', { department: this.departmentFilter });
      
      container.innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 fade-in">
          ${resources.map(r => {
            const util = r.utilization_percentage;
            let utilBadge = 'bg-blue-50 text-blue-700 border-blue-200';
            if (util > 100) utilBadge = 'bg-rose-50 text-rose-700 border-rose-200';
            else if (util >= 75) utilBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';

            return `
              <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm card-hover flex flex-col justify-between">
                <div>
                  <!-- Header -->
                  <div class="flex items-start justify-between gap-3 mb-4">
                    <div class="flex items-center gap-3">
                      <img src="${r.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-12 h-12 rounded-full object-cover border border-slate-200" alt="">
                      <div>
                        <h4 class="font-bold text-slate-900 text-base">${r.name}</h4>
                        <p class="text-xs text-slate-500">${r.job_title}</p>
                        <span class="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">${r.department}</span>
                      </div>
                    </div>
                    <span class="text-xs font-bold px-2.5 py-1 rounded-full border ${utilBadge}">
                      ${util}% Staffed
                    </span>
                  </div>

                  <!-- Financial Rates & Capacity -->
                  <div class="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-xl mb-4 text-center">
                    <div>
                      <p class="text-[10px] text-slate-400 uppercase font-semibold">Bill Rate</p>
                      <p class="text-xs font-bold text-slate-800 mt-0.5">$${r.hourly_rate}/h</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-slate-400 uppercase font-semibold">Cost Rate</p>
                      <p class="text-xs font-bold text-slate-800 mt-0.5">$${r.cost_rate}/h</p>
                    </div>
                    <div>
                      <p class="text-[10px] text-slate-400 uppercase font-semibold">Capacity</p>
                      <p class="text-xs font-bold text-slate-800 mt-0.5">${r.weekly_capacity}h/w</p>
                    </div>
                  </div>

                  <!-- Skills Tags -->
                  <div class="mb-4">
                    <p class="text-[11px] font-semibold text-slate-500 mb-1.5">Core Skills</p>
                    <div class="flex flex-wrap gap-1.5">
                      ${(r.skills || []).map(s => `
                        <span class="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-[11px] font-medium">${s}</span>
                      `).join('')}
                    </div>
                  </div>
                </div>

                <!-- Footer Actions -->
                <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
                  <div class="text-xs text-slate-500">
                    <span class="font-bold text-slate-700">${r.current_allocated_hours}h</span> assigned this week
                  </div>
                  <button onclick="App.openAllocationModal(${r.id})" class="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1">
                    <i data-lucide="plus-circle" class="w-3.5 h-3.5"></i>
                    <span>Assign</span>
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
      container.innerHTML = `<div class="text-rose-600 py-8 text-center text-sm">Failed to load team roster.</div>`;
    }
  },

  showWeekAllocationDetails(resource, weekData) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    
    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div class="flex items-center gap-3">
            <img src="${resource.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}" class="w-10 h-10 rounded-full object-cover" alt="">
            <div>
              <h4 class="font-bold text-slate-900 text-base">${resource.name}</h4>
              <p class="text-xs text-slate-500">${weekData.week_label} Allocations</p>
            </div>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="mb-4">
          <div class="flex justify-between items-center bg-slate-50 p-3 rounded-xl mb-3">
            <span class="text-xs text-slate-600">Total Assigned / Capacity:</span>
            <span class="text-sm font-bold text-slate-800">${weekData.total_hours}h / ${resource.weekly_capacity}h (${weekData.percentage}%)</span>
          </div>

          <h5 class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Assigned Projects</h5>
          ${weekData.allocations.length === 0 ? `
            <p class="text-xs text-slate-400 py-4 text-center">No projects assigned for this week.</p>
          ` : `
            <div class="space-y-2">
              ${weekData.allocations.map(a => `
                <div class="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between">
                  <div>
                    <span class="text-xs font-bold text-slate-800">${a.project_name}</span>
                    <span class="text-[10px] text-slate-500 block">${a.role || 'Contributor'} • ${a.notes || 'Scheduled'}</span>
                  </div>
                  <div class="text-right">
                    <span class="text-xs font-bold text-blue-600">${a.hours_per_week} hrs/wk</span>
                    <button onclick="ResourcesView.deleteAllocation(${a.id})" class="text-[10px] text-rose-500 hover:text-rose-700 block mt-0.5">Remove</button>
                  </div>
                </div>
              `).join('')}
            </div>
          `}
        </div>

        <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Close</button>
          <button onclick="App.closeModal(); App.openAllocationModal(${resource.id});" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Add Allocation</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async deleteAllocation(allocId) {
    if (!confirm('Are you sure you want to remove this project allocation?')) return;
    try {
      await API.delete(`/api/allocations/${allocId}`);
      showToast('Allocation removed successfully');
      App.closeModal();
      this.loadCurrentView();
    } catch (e) {}
  },

  openAddResourceModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">Add New Team Resource</h4>
            <p class="text-xs text-slate-500">Create employee or contractor profile</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="add-resource-form" onsubmit="ResourcesView.submitNewResource(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Full Name *</label>
              <input type="text" name="name" required placeholder="e.g. Jordan Hayes" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Email Address *</label>
              <input type="email" name="email" required placeholder="jordan.h@acme.corp" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Job Title *</label>
              <input type="text" name="job_title" required placeholder="Senior Backend Engineer" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Department *</label>
              <select name="department" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="Engineering">Engineering</option>
                <option value="Design">Design</option>
                <option value="Product">Product</option>
                <option value="Quality Assurance">Quality Assurance</option>
                <option value="Infrastructure">Infrastructure</option>
                <option value="Project Management">Project Management</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">System Role *</label>
              <select name="role" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="employee">Employee / Contributor</option>
                <option value="manager">Project Manager / Approver</option>
                <option value="admin">System Admin</option>
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Billable Rate ($/hr)</label>
              <input type="number" name="hourly_rate" step="0.5" value="85" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Internal Cost ($/hr)</label>
              <input type="number" name="cost_rate" step="0.5" value="55" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Weekly Capacity (hrs)</label>
              <input type="number" name="weekly_capacity" step="1" value="40" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Skills (comma separated)</label>
            <input type="text" name="skills_str" placeholder="Python, Django, AWS, GraphQL" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Save Resource</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitNewResource(e) {
    e.preventDefault();
    const form = e.target;
    const skills = (form.skills_str.value || '').split(',').map(s => s.trim()).filter(Boolean);

    const payload = {
      name: form.name.value,
      email: form.email.value,
      role: form.role.value,
      job_title: form.job_title.value,
      department: form.department.value,
      hourly_rate: parseFloat(form.hourly_rate.value) || 0,
      cost_rate: parseFloat(form.cost_rate.value) || 0,
      weekly_capacity: parseFloat(form.weekly_capacity.value) || 40,
      skills: skills,
      status: 'active'
    };

    try {
      await API.post('/api/resources', payload);
      showToast('Resource added successfully!');
      App.closeModal();
      await App.loadUsers();
      this.loadCurrentView();
    } catch (err) {}
  }
};
