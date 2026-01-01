'use client'

import { showToast } from '@/lib/toast'

export default function Toast() {
  return (
    <div 
      id="toast-container" 
      className="fixed top-24 right-5 z-[999999] flex flex-col gap-2 pointer-events-none"
    />
  )
}
