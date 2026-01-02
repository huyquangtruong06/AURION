'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import ConfirmModal from '@/components/shared/ConfirmModal'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function KnowledgeBasePage() {
  const router = useRouter()
  const [files, setFiles] = useState([])
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [selectedBotId, setSelectedBotId] = useState('')
  const [confirmModal, setConfirmModal] = useState({ show: false, fileId: null })
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchFiles()
    fetchBots()
  }, [])

  const fetchFiles = async () => {
    try {
      const res = await api.get('/knowledge')
      if (res.data.status === 'success') {
        setFiles(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load files', 'error')
    } finally {
      setLoading(false)
    }
  }

  const fetchBots = async () => {
    try {
      const res = await api.get('/bots')
      if (res.data.status === 'success') {
        setBots(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load bots', err)
    }
  }

  const handleFileUpload = async (e) => {
    e.preventDefault()
    if (!selectedFile) {
      showToast('Please select a file', 'error')
      return
    }

    const maxSize = 10 * 1024 * 1024 // 10MB
    if (selectedFile.size > maxSize) {
      showToast('File size must be less than 10MB', 'error')
      return
    }

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      if (selectedBotId) {
        formData.append('bot_id', selectedBotId)
      }

      const res = await api.post('/knowledge/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast('Upload successful!', 'success')
        setShowUploadModal(false)
        setSelectedFile(null)
        setSelectedBotId('')
        fetchFiles()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to upload file', 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleDeleteFile = async (fileId) => {
    try {
      const res = await api.delete(`/knowledge/${fileId}`)
      if (res.data.status === 'success') {
        showToast('File deleted successfully', 'success')
        fetchFiles()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to delete file', 'error')
    }
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        {/* Upload Modal */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#202123] rounded-xl w-full max-w-2xl shadow-2xl border border-gray-600">
              <div className="flex items-center justify-between p-6 border-b border-gray-600">
                <h2 className="text-xl font-bold text-white">Upload Knowledge</h2>
                <button onClick={() => setShowUploadModal(false)} className="text-gray-400 hover:text-white">
                  <i className="fas fa-times text-xl"></i>
                </button>
              </div>
              <div className="p-6 space-y-6">
                {/* Drag and Drop Zone */}
                {!selectedFile ? (
                  <div
                    className="border-2 border-dashed border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 hover:bg-gray-700/20 transition cursor-pointer"
                    onClick={() => document.getElementById('fileInput').click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      if (e.dataTransfer.files.length > 0) {
                        setSelectedFile(e.dataTransfer.files[0]);
                      }
                    }}
                  >
                    <i className="fas fa-cloud-upload-alt text-5xl text-gray-500 mb-4"></i>
                    <p className="text-gray-400 mb-2">Click to upload or drag and drop</p>
                    <p className="text-gray-500 text-sm">PDF, DOC, DOCX, TXT (max. 10MB)</p>
                    <input
                      id="fileInput"
                      type="file"
                      className="hidden"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={(e) => setSelectedFile(e.target.files[0])}
                    />
                  </div>
                ) : (
                  <div className="border border-gray-600 rounded-lg p-4 bg-[#40414f]">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-600/20 rounded-lg flex items-center justify-center">
                          <i className="fas fa-check text-green-500"></i>
                        </div>
                        <div>
                          <p className="text-white font-medium">{selectedFile.name}</p>
                          <p className="text-gray-400 text-sm">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                        </div>
                      </div>
                      <button onClick={() => setSelectedFile(null)} className="text-gray-400 hover:text-white">
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                  </div>
                )}

                {/* Bot Selection */}
                <div>
                  <label className="block text-gray-400 text-sm font-bold mb-2">
                    Assign to Bot
                  </label>
                  <div className="relative">
                    <select
                      value={selectedBotId}
                      onChange={(e) => setSelectedBotId(e.target.value)}
                      className="w-full px-4 py-3 bg-[#40414f] text-white border border-gray-600 rounded-lg focus:outline-none focus:border-blue-500 appearance-none"
                    >
                      <option value="">-- General (All Bots) --</option>
                      {bots.map((bot) => (
                        <option key={bot.id} value={bot.id}>{bot.name}</option>
                      ))}
                    </select>
                    <i className="fas fa-chevron-down absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"></i>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    onClick={() => {
                      setShowUploadModal(false);
                      setSelectedFile(null);
                    }}
                    className="px-6 py-2.5 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleFileUpload}
                    disabled={!selectedFile || uploading}
                    className="px-6 py-2.5 bg-[#10a37f] text-white rounded-lg hover:bg-[#0d8c6d] disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-green-500/20 hover:-translate-y-0.5 transition"
                  >
                    {uploading ? 'Uploading...' : 'Start Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 flex flex-col h-full relative overflow-hidden pt-14 md:pt-0 bg-[#343541]">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">Knowledge Base</h1>

              <div className="flex flex-col md:flex-row gap-4 mb-8">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-[#40414f] text-white border border-gray-600 text-base md:text-sm rounded-xl block pl-11 p-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
                    placeholder="Search knowledge base..."
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowUploadModal(true)}
                  className="w-full md:w-auto text-white bg-[#3b82f6] hover:bg-blue-600 font-medium rounded-xl text-sm px-6 py-3.5 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition whitespace-nowrap hover:-translate-y-0.5"
                >
                  <i className="fas fa-cloud-upload-alt"></i> Upload Knowledge
                </button>
              </div>

              {/* Files Table */}
              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <i className="fas fa-spinner fa-spin text-4xl text-gray-500"></i>
                </div>
              ) : files.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-20">
                  <div className="relative mb-6 animate-float">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
                    <i className="fas fa-folder-open text-7xl text-gray-600 relative z-10"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No files found</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">Upload documents to train your bots and enhance their knowledge.</p>
                </div>
              ) : (
                <div className="bg-[#202123] border border-gray-600 rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-gray-400 min-w-[600px]">
                      <thead className="text-xs text-gray-300 uppercase bg-[#40414f]/50 border-b border-gray-600">
                        <tr>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider">File Name</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider">Size</th>
                          <th scope="col" className="px-6 py-4 font-bold tracking-wider">Uploaded Date</th>
                          <th scope="col" className="px-6 py-4 text-right font-bold tracking-wider">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {files.map((file) => (
                          <tr key={file.id} className="border-b border-gray-700 hover:bg-gray-700/50">
                            <td className="px-6 py-4 text-white flex flex-col gap-1">
                              <div className="flex items-center gap-2">
                                <i className="fas fa-file"></i> {file.filename}
                              </div>
                              {file.bot_id ? (
                                <span className="text-[10px] text-blue-400 border border-blue-500/30 rounded px-1 w-fit bg-blue-900/20">
                                  Bot Specific
                                </span>
                              ) : (
                                <span className="text-[10px] text-gray-500 border border-gray-600 rounded px-1 w-fit">
                                  General
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 text-gray-400">{file.file_size}</td>
                            <td className="px-6 py-4 text-gray-500">{new Date(file.created_at).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setConfirmModal({ show: true, fileId: file.id })}
                                className="text-gray-500 hover:text-red-500"
                              >
                                <i className="fas fa-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false, fileId: null })}
        onConfirm={() => handleDeleteFile(confirmModal.fileId)}
        title="Delete File?"
        message="Are you sure you want to delete this file? This action cannot be undone."
      />
    </>
  )
}
