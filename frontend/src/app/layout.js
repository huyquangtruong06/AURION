'use client'
import { Inter } from 'next/font/google'
import { useEffect } from 'react'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({ children }) {
  // Smooth page load effect từ legacy script.js
  useEffect(() => {
    const timer = setTimeout(() => {
      document.body.classList.add('page-loaded')
    }, 50)
    return () => clearTimeout(timer)
  }, [])

  useEffect(() => {
    // Manually set favicon
    const link = document.querySelector("link[rel*='icon']") || document.createElement('link')
    link.type = 'image/x-icon'
    link.rel = 'shortcut icon'
    link.href = '/img/aurion.jpg'
    document.getElementsByTagName('head')[0].appendChild(link)
  }, [])

  return (
    <html lang="en" style={{ backgroundColor: '#343541' }}>
      <head>
        <title>AI-CaaS</title>
        <link 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" 
          rel="stylesheet" 
        />
      </head>
      <body className={`${inter.className} text-gray-100 bg-[#343541] antialiased`}>
        {children}
        
        {/* Global Toast Container */}
        <div 
          id="toast-container" 
          className="fixed top-24 right-5 z-[999999] flex flex-col gap-2 pointer-events-none"
        />
      </body>
    </html>
  )
}