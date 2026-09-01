// Projects View Component
const ProjectsView = {
  statusFilter: 'all',
  projectsList: [],

  async render(container) {
    container.innerHTML = `
      <div class="space-y-6 fade-in">
        <!-- Action & Filter Bar -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
          <div class="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
            <button id="proj-tab-all" onclick="ProjectsView.setStatusFilter('all')" class="px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm">
              All Projects
            </button>
            <button id="proj-tab-active" onclick="ProjectsView.setStatusFilter('active')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Active
            </button>
            <button id="proj-tab-planning" onclick="ProjectsView.setStatusFilter('planning')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Planning
            </button>
            <button id="proj-tab-completed" onclick="ProjectsView.setStatusFilter('completed')" class="px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900">
              Completed
            </button>
          </div>

          <button onclick="ProjectsView.openCreateProjectModal()" class="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-4 py-2 rounded-xl transition flex items-center gap-2 shadow-sm">
            <i data-lucide="folder-plus" class="w-4 h-4"></i>
            <span>Create Project</span>
          </button>
        </div>

        <!-- Projects Grid Container -->
        <div id="projects-grid-container" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          <div class="text-center py-12 text-slate-400 col-span-full">Loading projects...</div>
        </div>
      </div>
    `;

    lucide.createIcons({ root: container });
    await this.loadProjects();
  },

  setStatusFilter(status) {
    this.statusFilter = status;
    ['all', 'active', 'planning', 'completed'].forEach(s => {
      const btn = document.getElementById(`proj-tab-${s}`);
      if (btn) {
        if (s === status) {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition bg-white text-blue-600 shadow-sm';
        } else {
          btn.className = 'px-4 py-2 text-xs font-bold rounded-lg transition text-slate-600 hover:text-slate-900';
        }
      }
    });
    this.loadProjects();
  },

  async loadProjects() {
    const container = document.getElementById('projects-grid-container');
    if (!container) return;

    try {
      const projects = await API.get('/api/projects', { status: this.statusFilter });
      this.projectsList = projects;

      if (projects.length === 0) {
        container.innerHTML = `
          <div class="col-span-full text-center py-12 text-slate-400">
            <i data-lucide="folder" class="w-10 h-10 mx-auto mb-2 opacity-50"></i>
            <p class="text-xs font-semibold">No projects found in this category.</p>
          </div>
        `;
        lucide.createIcons({ root: container });
        return;
      }

      container.innerHTML = projects.map(p => {
        const burn = p.burn_percentage || 0;
        let burnBarClass = 'bg-blue-600';
        if (burn > 90) burnBarClass = 'bg-rose-500';
        else if (burn > 70) burnBarClass = 'bg-amber-500';

        let statusBadge = 'bg-slate-100 text-slate-700';
        if (p.status === 'active') statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        else if (p.status === 'planning') statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';

        return `
          <div class="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm card-hover flex flex-col justify-between">
            <div>
              <!-- Header -->
              <div class="flex items-start justify-between gap-3 mb-3">
                <div class="flex items-center gap-3">
                  <div class="w-4 h-10 rounded-full" style="background-color: ${p.color || '#3B82F6'}"></div>
                  <div>
                    <div class="flex items-center gap-2">
                      <h4 class="font-bold text-slate-900 text-base leading-tight">${p.name}</h4>
                    </div>
                    <p class="text-xs text-slate-400 mt-0.5">${p.client_name || 'Internal'} • <span class="font-semibold text-slate-600">${p.code}</span></p>
                  </div>
                </div>
                <span class="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${statusBadge}">
                  ${p.status}
                </span>
              </div>

              <p class="text-xs text-slate-600 mb-4 line-clamp-2 leading-relaxed">
                ${p.description || 'No project description provided.'}
              </p>

              <!-- Progress & Hours Burn -->
              <div class="bg-slate-50 p-3.5 rounded-xl mb-4 space-y-2">
                <div class="flex justify-between text-xs font-semibold">
                  <span class="text-slate-500">Hour Budget:</span>
                  <span class="text-slate-800">${p.logged_hours}h / ${p.budget_hours}h (${burn}%)</span>
                </div>
                <div class="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                  <div class="${burnBarClass} h-2 rounded-full transition-all duration-500" style="width: ${Math.min(burn, 100)}%"></div>
                </div>

                <div class="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>Billing: <strong class="text-slate-700 capitalize">${p.billing_type}</strong></span>
                  <span>Rate: <strong class="text-slate-700">$${p.hourly_rate}/h</strong></span>
                </div>
              </div>
            </div>

            <!-- Footer & Actions -->
            <div class="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div class="flex items-center gap-1.5 text-xs text-slate-500">
                <i data-lucide="users" class="w-3.5 h-3.5 text-slate-400"></i>
                <span>${p.allocated_members_count || 0} Staffed</span>
              </div>

              <div class="flex items-center gap-2">
                <button onclick="ProjectsView.openTasksModal(${p.id}, '${p.name.replace(/'/g, "\\'")}')" class="text-xs font-bold text-slate-600 hover:text-slate-900 px-2 py-1 rounded-lg hover:bg-slate-100">
                  Tasks
                </button>
                <button onclick="App.openAllocationModal(null, ${p.id})" class="text-xs font-bold text-blue-600 hover:text-blue-700 px-2 py-1 rounded-lg hover:bg-blue-50">
                  + Allocate
                </button>
              </div>
            </div>
          </div>
        `;
      }).join('');

      lucide.createIcons({ root: container });
    } catch (e) {
      console.error(e);
    }
  },

  async openCreateProjectModal() {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');
    
    let clients = [];
    try {
      clients = await API.get('/api/clients');
    } catch (e) {}

    const todayStr = new Date().toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">Create New Project</h4>
            <p class="text-xs text-slate-500">Define project parameters, budgets, and client association</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="create-project-form" onsubmit="ProjectsView.submitNewProject(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Name *</label>
              <input type="text" name="name" required placeholder="e.g. NextGen Web Portal" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Project Code * (Unique)</label>
              <input type="text" name="code" required placeholder="e.g. NGP-2026" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Client Association</label>
            <select name="client_id" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
              <option value="">None (Internal Company Project)</option>
              ${clients.map(c => `
                <option value="${c.id}">${c.name} (${c.company || ''})</option>
              `).join('')}
            </select>
          </div>

          <div>
            <label class="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea name="description" rows="2" placeholder="Brief objectives and milestone scope..." class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"></textarea>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Budget (Hours) *</label>
              <input type="number" name="budget_hours" step="10" value="500" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Billing Type</label>
              <select name="billing_type" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="hourly">Time & Materials (Hourly)</option>
                <option value="fixed">Fixed Price</option>
                <option value="non_billable">Non-Billable / Internal</option>
              </select>
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Billable Rate ($/hr)</label>
              <input type="number" name="hourly_rate" step="5" value="95" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value="${todayStr}" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Target End Date</label>
              <input type="date" name="end_date" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Theme Color</label>
              <select name="color" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                <option value="#3B82F6">Blue (#3B82F6)</option>
                <option value="#10B981">Green (#10B981)</option>
                <option value="#8B5CF6">Purple (#8B5CF6)</option>
                <option value="#F59E0B">Amber (#F59E0B)</option>
                <option value="#EC4899">Pink (#EC4899)</option>
              </select>
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Create Project</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitNewProject(e) {
    e.preventDefault();
    const form = e.target;
    const clientVal = form.client_id.value;

    const payload = {
      name: form.name.value,
      code: form.code.value.toUpperCase().trim(),
      client_id: clientVal ? parseInt(clientVal) : null,
      description: form.description.value.trim(),
      budget_hours: parseFloat(form.budget_hours.value) || 0,
      billing_type: form.billing_type.value,
      hourly_rate: parseFloat(form.hourly_rate.value) || 0,
      start_date: form.start_date.value,
      end_date: form.end_date.value || null,
      color: form.color.value,
      status: 'active'
    };

    try {
      await API.post('/api/projects', payload);
      showToast('Project created successfully!');
      App.closeModal();
      this.loadProjects();
    } catch (err) {}
  },

  async openTasksModal(projectId, projectName) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    let tasks = [];
    try {
      tasks = await API.get(`/api/projects/${projectId}/tasks`);
    } catch (e) {}

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">${projectName}</h4>
            <p class="text-xs text-slate-500">Configured Tasks & Work Breakdown</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <div class="mb-5 space-y-2 max-h-60 overflow-y-auto">
          ${tasks.length === 0 ? `
            <p class="text-xs text-slate-400 text-center py-4">No specific tasks defined yet.</p>
          ` : tasks.map(t => `
            <div class="p-3 rounded-xl border border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span class="text-xs font-bold text-slate-800">${t.name}</span>
                <span class="text-[11px] text-slate-500 block">${t.description || 'Standard task'}</span>
              </div>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded ${t.billable ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}">
                ${t.billable ? 'Billable' : 'Non-Billable'}
              </span>
            </div>
          `).join('')}
        </div>

        <!-- Add Task Form -->
        <form onsubmit="ProjectsView.submitNewTask(event, ${projectId}, '${projectName.replace(/'/g, "\\'")}')" class="bg-slate-50 p-4 rounded-xl space-y-3">
          <h5 class="text-xs font-bold text-slate-700">Add New Task</h5>
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input type="text" name="task_name" required placeholder="Task title (e.g. API Integration)" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none">
            <div class="flex items-center gap-3">
              <label class="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                <input type="checkbox" name="is_billable" checked class="rounded text-blue-600">
                <span>Billable</span>
              </label>
              <button type="submit" class="flex-1 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold py-2 px-3 rounded-lg transition">
                Add Task
              </button>
            </div>
          </div>
        </form>

        <div class="flex justify-end pt-4 mt-2">
          <button onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Done</button>
        </div>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitNewTask(e, projectId, projectName) {
    e.preventDefault();
    const form = e.target;
    const name = form.task_name.value.trim();
    const isBillable = form.is_billable.checked ? 1 : 0;

    try {
      await API.post(`/api/projects/${projectId}/tasks`, {
        project_id: projectId,
        name: name,
        billable: isBillable,
        is_default: 0
      });
      showToast('Task added to project!');
      this.openTasksModal(projectId, projectName);
    } catch (e) {}
  }
};
