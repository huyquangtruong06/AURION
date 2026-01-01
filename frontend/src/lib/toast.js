/**
 * Toast Notification Utility
 * Ported from legacy script.js
 */

export const showToast = (message, type = 'success') => {
  if (typeof window === 'undefined') return;

  const container = document.getElementById('toast-container');
  if (!container) {
    console.error('Toast container not found');
    alert(message);
    return;
  }

  const config = {
    success: { 
      icon: '<i class="fas fa-check-circle text-green-400"></i>', 
      border: 'border-green-500/50' 
    },
    error: { 
      icon: '<i class="fas fa-times-circle text-red-400"></i>', 
      border: 'border-red-500/50' 
    },
    info: { 
      icon: '<i class="fas fa-info-circle text-blue-400"></i>', 
      border: 'border-blue-500/50' 
    },
    warning: { 
      icon: '<i class="fas fa-exclamation-triangle text-yellow-400"></i>', 
      border: 'border-yellow-500/50' 
    }
  };

  const style = config[type] || config.success;
  const toast = document.createElement('div');
  toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${style.border} bg-[#202123] shadow-2xl min-w-[300px] z-[999999]`;
  toast.innerHTML = `
    <div class="text-xl">${style.icon}</div>
    <p class="text-sm text-gray-200 font-medium">${message}</p>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.remove('toast-enter');
    toast.classList.add('toast-exit');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
};
