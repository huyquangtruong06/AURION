// Smooth page transition helper (từ legacy script.js)

export const initSmoothTransitions = () => {
  if (typeof window === 'undefined') return

  // Fade in page khi load
  setTimeout(() => {
    document.body.classList.add('page-loaded')
  }, 50)
}

export const smoothNavigate = (url) => {
  if (typeof window === 'undefined') return
  
  // Fade out trước khi chuyển trang
  document.body.classList.remove('page-loaded')
  
  setTimeout(() => {
    window.location.href = url
  }, 300)
}
