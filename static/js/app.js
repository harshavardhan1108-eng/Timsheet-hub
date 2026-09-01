// Main Application Router & Orchestrator
const App = {
  async init() {
    console.log("Initializing Resource & Timesheet Hub...");
    await this.loadUsers();
    this.setupEventListeners();
    this.handleRoute();
  },

  async loadUsers() {
    try {
      const users = await API.get('/api/auth/users');
      Store.usersList = users;

      // Set default user if not already set
      if (!Store.currentUser && users.length > 0) {
        // Find Elena Rostova or first employee
        const defaultUser = users.find(u => u.name.includes('Elena')) || users[0];
        Store.currentUser = defaultUser;
      }

      this.renderUserSwitcher();
    } catch (e) {
      console.error('Failed to load users for switcher', e);
    }
  },

  renderUserSwitcher() {
    const userSelect = document.getElementById('user-switcher-select');
    const userAvatar = document.getElementById('current-user-avatar');
    const userName = document.getElementById('current-user-name');
    const userRole = document.getElementById('current-user-role');

    if (!userSelect || !Store.currentUser) return;

    userAvatar.src = Store.currentUser.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';
    userName.textContent = Store.currentUser.name;
    userRole.textContent = `${Store.currentUser.job_title} (${Store.currentUser.role.toUpperCase()})`;

    userSelect.innerHTML = Store.usersList.map(u => `
      <option value="${u.id}" ${u.id === Store.currentUser.id ? 'selected' : ''}>
        ${u.name} — ${u.job_title} [${u.role.toUpperCase()}]
      </option>
    `).join('');
  },

  onUserSwitched(userId) {
    const selected = Store.usersList.find(u => u.id === parseInt(userId));
    if (selected) {
      Store.currentUser = selected;
      this.renderUserSwitcher();
      showToast(`Switched active user to ${selected.name} (${selected.role})`);
      this.handleRoute(); // re-render current view with new user
    }
  },

  setupEventListeners() {
    window.addEventListener('hashchange', () => this.handleRoute());

    // Close modal on escape or background click
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') this.closeModal();
    });

    const modal = document.getElementById('global-modal');
    if (modal) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) this.closeModal();
      });
    }
  },

  navigate(tabName) {
    window.location.hash = `#${tabName}`;
  },

  async handleRoute() {
    const hash = window.location.hash.replace('#', '') || 'dashboard';
    Store.activeTab = hash;

    // Update Sidebar Active state
    document.querySelectorAll('.nav-link').forEach(link => {
      const linkTab = link.getAttribute('data-tab');
      if (linkTab === hash) {
        link.className = 'nav-link flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-bold bg-blue-600 text-white shadow-sm transition';
      } else {
        link.className = 'nav-link flex items-center gap-3 px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition';
      }
    });

    // Update Page Header Title
    const headerTitle = document.getElementById('page-header-title');
    const headerSub = document.getElementById('page-header-sub');
    const titles = {
      dashboard: { title: 'Executive Overview', sub: 'Team capacity, active projects, and workflow metrics' },
      resources: { title: 'Resource Management & Workload', sub: 'Staffing directory, skill matrix, and multi-week capacity heatmap' },
      timesheets: { title: 'Weekly Timesheet & Timer', sub: 'Interactive time matrix, daily notes, and submission workflow' },
      approvals: { title: 'Timesheet Approvals Queue', sub: 'Review, inspect, and approve team timesheet submissions' },
      projects: { title: 'Projects & Tasks', sub: 'Project budgets, burn rates, hourly rates, and deliverables' },
      reports: { title: 'Analytics & Financial Reports', sub: 'Resource utilization rates, project margins, and audit exports' }
    };

    if (headerTitle && titles[hash]) {
      headerTitle.textContent = titles[hash].title;
      headerSub.textContent = titles[hash].sub;
    }

    const container = document.getElementById('main-content-view');
    if (!container) return;

    if (hash === 'dashboard') {
      await DashboardView.render(container);
    } else if (hash === 'resources') {
      await ResourcesView.render(container);
    } else if (hash === 'timesheets') {
      await TimesheetsView.render(container);
    } else if (hash === 'approvals') {
      await ApprovalsView.render(container);
    } else if (hash === 'projects') {
      await ProjectsView.render(container);
    } else if (hash === 'reports') {
      await ReportsView.render(container);
    } else {
      await DashboardView.render(container);
    }
  },

  async openAllocationModal(userId = null, projectId = null) {
    const modal = document.getElementById('global-modal');
    const modalContent = document.getElementById('global-modal-content');

    let projects = [];
    try {
      projects = await API.get('/api/projects');
    } catch (e) {}

    const todayStr = new Date().toISOString().split('T')[0];
    const nextMonth = new Date();
    nextMonth.setDate(nextMonth.getDate() + 30);
    const endStr = nextMonth.toISOString().split('T')[0];

    modalContent.innerHTML = `
      <div class="p-6">
        <div class="flex items-center justify-between border-b border-slate-100 pb-4 mb-4">
          <div>
            <h4 class="font-bold text-slate-900 text-lg">Assign Project Allocation</h4>
            <p class="text-xs text-slate-500">Staff a team member to a project with weekly hours</p>
          </div>
          <button onclick="App.closeModal()" class="text-slate-400 hover:text-slate-600">
            <i data-lucide="x" class="w-5 h-5"></i>
          </button>
        </div>

        <form id="create-allocation-form" onsubmit="App.submitAllocation(event)" class="space-y-4">
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Select Team Resource *</label>
              <select name="user_id" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                ${Store.usersList.map(u => `
                  <option value="${u.id}" ${userId === u.id ? 'selected' : ''}>${u.name} (${u.job_title})</option>
                `).join('')}
              </select>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Select Project *</label>
              <select name="project_id" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
                ${projects.map(p => `
                  <option value="${p.id}" ${projectId === p.id ? 'selected' : ''}>${p.name} (${p.code})</option>
                `).join('')}
              </select>
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Role on Project</label>
              <input type="text" name="role" placeholder="e.g. Lead Frontend Engineer" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Hours / Week *</label>
              <input type="number" name="hours_per_week" step="1" value="20" min="1" max="60" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Notes / Phase</label>
              <input type="text" name="notes" placeholder="e.g. Sprint 1-4 Architecture" class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
              <input type="date" name="start_date" value="${todayStr}" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
            <div>
              <label class="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
              <input type="date" name="end_date" value="${endStr}" required class="w-full px-3 py-2 text-xs border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none">
            </div>
          </div>

          <div class="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button type="button" onclick="App.closeModal()" class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100">Cancel</button>
            <button type="submit" class="px-4 py-2 rounded-xl text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700">Assign Allocation</button>
          </div>
        </form>
      </div>
    `;

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    lucide.createIcons({ root: modalContent });
  },

  async submitAllocation(e) {
    e.preventDefault();
    const form = e.target;
    const payload = {
      user_id: parseInt(form.user_id.value),
      project_id: parseInt(form.project_id.value),
      role: form.role.value.trim() || 'Contributor',
      hours_per_week: parseFloat(form.hours_per_week.value) || 20,
      start_date: form.start_date.value,
      end_date: form.end_date.value,
      notes: form.notes.value.trim()
    };

    try {
      await API.post('/api/allocations', payload);
      showToast('Project allocation assigned successfully! 🎯');
      this.closeModal();
      this.handleRoute(); // refresh current view
    } catch (err) {}
  },

  closeModal() {
    const modal = document.getElementById('global-modal');
    if (modal) {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    }
  }
};

// Start application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
