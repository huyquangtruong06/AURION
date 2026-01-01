'use client'

import { useState } from 'react'

export default function ConfirmModal({ isOpen, onClose, onConfirm, title, message }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/80 z-[999] flex items-center justify-center backdrop-blur-sm p-4">
      <div className="bg-[#202123] border border-gray-600 rounded-2xl shadow-2xl p-6 max-w-md w-full animate-fade-in">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center">
            <i className="fas fa-exclamation-triangle text-red-500 text-xl"></i>
          </div>
          <h3 className="text-xl font-bold text-white">{title || 'Confirm Action'}</h3>
        </div>

        <p className="text-gray-300 mb-6">{message || 'Are you sure you want to proceed?'}</p>

        <div className="flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onConfirm()
              onClose()
            }}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  )
}
