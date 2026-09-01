// Global State Store
const Store = {
  currentUser: null,
  usersList: [],
  currentWeekStart: null, // YYYY-MM-DD
  activeTab: 'dashboard',
  timer: {
    isRunning: false,
    startTime: null,
    elapsedSeconds: 0,
    intervalId: null,
    projectId: null,
    taskId: null,
    notes: ''
  },

  init() {
    this.currentWeekStart = this.getMonday(new Date());
    this.loadTimerFromStorage();
  },

  getMonday(d) {
    const dateObj = new Date(d);
    const day = dateObj.getDay();
    const diff = dateObj.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(dateObj.setDate(diff));
    return monday.toISOString().split('T')[0];
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  },

  formatWeekRange(mondayStr) {
    const d = new Date(mondayStr + 'T00:00:00');
    const sunday = new Date(d);
    sunday.setDate(d.getDate() + 6);
    
    const startStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endStr = sunday.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${startStr} – ${endStr}`;
  },

  // Timer storage helpers
  loadTimerFromStorage() {
    try {
      const saved = localStorage.getItem('resource_hub_timer');
      if (saved) {
        const data = JSON.parse(saved);
        if (data.isRunning && data.startTime) {
          const now = Date.now();
          data.elapsedSeconds += Math.floor((now - data.startTime) / 1000);
          data.startTime = now;
        }
        this.timer = { ...this.timer, ...data };
        if (this.timer.isRunning) {
          this.startTimerTicker();
        }
      }
    } catch (e) {
      console.warn('Could not restore timer state', e);
    }
  },

  saveTimerToStorage() {
    localStorage.setItem('resource_hub_timer', JSON.stringify({
      isRunning: this.timer.isRunning,
      startTime: this.timer.startTime,
      elapsedSeconds: this.timer.elapsedSeconds,
      projectId: this.timer.projectId,
      taskId: this.timer.taskId,
      notes: this.timer.notes
    }));
  },

  startTimerTicker() {
    if (this.timer.intervalId) clearInterval(this.timer.intervalId);
    this.timer.intervalId = setInterval(() => {
      this.timer.elapsedSeconds++;
      this.updateTimerDisplay();
    }, 1000);
  },

  updateTimerDisplay() {
    const el = document.getElementById('global-timer-display');
    const dot = document.getElementById('global-timer-dot');
    if (el) {
      const hrs = String(Math.floor(this.timer.elapsedSeconds / 3600)).padStart(2, '0');
      const mins = String(Math.floor((this.timer.elapsedSeconds % 3600) / 60)).padStart(2, '0');
      const secs = String(this.timer.elapsedSeconds % 60).padStart(2, '0');
      el.textContent = `${hrs}:${mins}:${secs}`;
    }
    if (dot) {
      if (this.timer.isRunning) {
        dot.classList.remove('hidden');
      } else {
        dot.classList.add('hidden');
      }
    }
  }
};

Store.init();
