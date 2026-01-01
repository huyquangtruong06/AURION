'use client'

export function showToast(message, type = 'success') {
  if (typeof window === 'undefined') return
  
  const container = document.getElementById('toast-container')
  if (!container) return

  const config = {
    success: { icon: 'fa-check-circle', color: 'text-green-400', border: 'border-green-500/50' },
    error: { icon: 'fa-times-circle', color: 'text-red-400', border: 'border-red-500/50' },
    info: { icon: 'fa-info-circle', color: 'text-blue-400', border:  'border-blue-500/50' },
    warning: { icon: 'fa-exclamation-triangle', color: 'text-yellow-400', border: 'border-yellow-500/50' }
  }

  const style = config[type] || config.success
  const toast = document.createElement('div')
  toast.className = `toast-enter pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl border ${style.border} bg-[#202123] shadow-2xl min-w-[300px] z-[999999]`
  toast.innerHTML = `
    <i class="fas ${style.icon} ${style.color} text-xl"></i>
    <p class="text-sm text-gray-200 font-medium">${message}</p>
  `

  container.appendChild(toast)

  setTimeout(() => {
    toast.classList.remove('toast-enter')
    toast.classList.add('toast-exit')
    setTimeout(() => toast.remove(), 300)
  }, 3000)
}

export default function Toast() {
  return null
}