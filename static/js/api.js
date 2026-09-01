// API Client helper
const API = {
  async get(endpoint, params = {}) {
    const url = new URL(endpoint, window.location.origin);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        url.searchParams.append(key, params[key]);
      }
    });
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API GET error on ${endpoint}:`, error);
      showToast(error.message, 'error');
      throw error;
    }
  },

  async post(endpoint, body = {}) {
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API POST error on ${endpoint}:`, error);
      showToast(error.message, 'error');
      throw error;
    }
  },

  async put(endpoint, body = {}) {
    try {
      const response = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API PUT error on ${endpoint}:`, error);
      showToast(error.message, 'error');
      throw error;
    }
  },

  async delete(endpoint) {
    try {
      const response = await fetch(endpoint, { method: 'DELETE' });
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Request failed with status ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`API DELETE error on ${endpoint}:`, error);
      showToast(error.message, 'error');
      throw error;
    }
  }
};

// Toast notification helper
function showToast(message, type = 'success') {
  const container = document.getElementById('toast-container');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'success' ? 'bg-emerald-600 text-white' : type === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-800 text-white';
  const iconName = type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info';

  toast.className = `flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg text-sm font-medium ${bgClass} transition-all duration-300 transform translate-y-2 opacity-0 fade-in`;
  toast.innerHTML = `
    <i data-lucide="${iconName}" class="w-5 h-5 flex-shrink-0"></i>
    <span class="flex-1">${message}</span>
    <button class="text-white/80 hover:text-white" onclick="this.parentElement.remove()">
      <i data-lucide="x" class="w-4 h-4"></i>
    </button>
  `;

  container.appendChild(toast);
  lucide.createIcons({ root: toast });

  setTimeout(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  }, 10);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}
