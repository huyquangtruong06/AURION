'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Sidebar from '@/components/layout/Sidebar'
import ToastContainer from '@/components/shared/ToastContainer'
import ConfirmModal from '@/components/shared/ConfirmModal'
import api from '@/lib/api'
import { showToast } from '@/lib/toast'
import { isAuthenticated } from '@/lib/auth'

export default function GroupsPage() {
  const router = useRouter()
  const [groups, setGroups] = useState([])
  const [bots, setBots] = useState([])
  const [loading, setLoading] = useState(true)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [selectedGroup, setSelectedGroup] = useState(null)
  const [confirmModal, setConfirmModal] = useState({ show: false, action: null, groupId: null })
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    bot_id: ''
  })
  const [memberEmail, setMemberEmail] = useState('')

  useEffect(() => {
    if (!isAuthenticated()) {
      router.push('/')
      return
    }
    fetchGroups()
    fetchBots()
  }, [])

  const fetchGroups = async () => {
    try {
      const res = await api.get('/groups')
      if (res.data.status === 'success') {
        setGroups(res.data.data)
      }
    } catch (err) {
      showToast('Failed to load groups', 'error')
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

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    
    if (!formData.name || !formData.bot_id) {
      showToast('Please fill in all required fields', 'error')
      return
    }

    try {
      const form = new FormData()
      form.append('name', formData.name)
      form.append('description', formData.description || '')
      form.append('bot_id', formData.bot_id)

      const res = await api.post('/groups/create', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        setShowCreateModal(false)
        setFormData({ name: '', description: '', bot_id: '' })
        fetchGroups()
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to create group', 'error')
    }
  }

  const handleAddMember = async () => {
    if (!memberEmail || !selectedGroup) return

    try {
      const form = new FormData()
      form.append('group_id', selectedGroup.id)
      form.append('email', memberEmail)

      const res = await api.post('/groups/add-member', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        setMemberEmail('')
        loadGroupDetails(selectedGroup.id)
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to add member', 'error')
    }
  }

  const handleRemoveMember = async (email) => {
    if (!selectedGroup) return

    try {
      const form = new FormData()
      form.append('group_id', selectedGroup.id)
      form.append('email', email)

      const res = await api.post('/groups/remove-member', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        loadGroupDetails(selectedGroup.id)
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to remove member', 'error')
    }
  }

  const handleLeaveGroup = async (groupId) => {
    try {
      const res = await api.put(`/groups/leave/${groupId}`)
      if (res.data.status === 'success') {
        showToast(res.data.message, 'success')
        fetchGroups()
        setShowDetailsModal(false)
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to leave group', 'error')
    }
  }

  const handleDeleteGroup = async (groupId) => {
    try {
      const res = await api.delete(`/groups/${groupId}`)
      if (res.data.status === 'success') {
        showToast('Group deleted successfully', 'success')
        fetchGroups()
        setShowDetailsModal(false)
      } else {
        showToast(res.data.message, 'error')
      }
    } catch (err) {
      showToast('Failed to delete group', 'error')
    }
  }

  const loadGroupDetails = async (groupId) => {
    try {
      const res = await api.get(`/groups/${groupId}/details`)
      if (res.data.status === 'success') {
        const group = groups.find(g => g.id === groupId)
        setSelectedGroup({
          ...group,
          members: res.data.data.members,
          bots: res.data.data.bots
        })
      }
    } catch (err) {
      showToast('Failed to load group details', 'error')
    }
  }

  const openGroupDetails = async (group) => {
    await loadGroupDetails(group.id)
    setShowDetailsModal(true)
  }

  return (
    <>
      <ToastContainer />
      
      <div className="flex h-screen overflow-hidden bg-[#202123] text-gray-100">
        <Sidebar />

        <main className="flex-1 flex flex-col h-full relative overflow-hidden bg-[#343541]">
          <div className="flex-1 overflow-y-auto p-4 md:p-10 custom-scrollbar">
            <div className="max-w-6xl mx-auto w-full">
              <h1 className="text-2xl md:text-3xl font-bold text-white mb-6 md:mb-8">My Groups</h1>
              
              <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
                <div className="relative w-full md:w-96">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <i className="fas fa-search text-gray-400"></i>
                  </div>
                  <input
                    type="text"
                    placeholder="Search your groups..."
                    className="w-full bg-[#40414f] text-white border border-gray-600 text-base md:text-sm rounded-xl block pl-11 p-3.5 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition shadow-sm"
                  />
                </div>
                
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="w-full md:w-auto text-white bg-blue-500 hover:bg-blue-600 font-medium rounded-xl text-sm px-6 py-3.5 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-2 transition hover:-translate-y-0.5 whitespace-nowrap"
                >
                  <i className="fas fa-plus"></i> Create Group
                </button>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <i className="fas fa-spinner fa-spin text-4xl text-gray-500"></i>
                </div>
              ) : groups.length === 0 ? (
                <div className="flex flex-col items-center justify-center text-center mt-20">
                  <div className="relative mb-6 animate-float">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
                    <i className="fas fa-users text-7xl text-gray-600 relative z-10"></i>
                  </div>
                  <h3 className="text-xl font-semibold text-white mb-2">No groups found</h3>
                  <p className="text-gray-400 max-w-md mx-auto mb-6">Create a group to share your AI bots with others and collaborate.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pb-10">
                  {groups.map((group) => (
                    <div
                      key={group.id}
                      className="bg-[#40414f] border border-gray-600 rounded-2xl p-6 hover:border-blue-500 transition relative group flex flex-col h-full hover:shadow-blue-500/10 hover:-translate-y-1"
                    >
                      {group.is_owner ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ show: true, action: 'delete', groupId: group.id });
                          }}
                          className="absolute top-4 right-4 text-gray-500 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition p-2 bg-[#40414f]/80 rounded-lg backdrop-blur-sm shadow-sm"
                          title="Delete Group"
                        >
                          <i className="fas fa-trash"></i>
                        </button>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmModal({ show: true, action: 'leave', groupId: group.id });
                          }}
                          className="absolute top-4 right-4 text-gray-400 hover:text-red-400 opacity-100 md:opacity-0 group-hover:opacity-100 transition p-2 bg-[#40414f]/80 rounded-lg backdrop-blur-sm shadow-sm"
                          title="Leave Group"
                        >
                          <i className="fas fa-sign-out-alt"></i>
                        </button>
                      )}
                      
                      <div className="mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-md shrink-0">
                            {group.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-lg text-white truncate pr-8">{group.name}</h3>
                            {group.is_owner ? (
                              <span className="text-[10px] bg-blue-500/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded-full font-medium">OWNER</span>
                            ) : (
                              <span className="text-[10px] bg-gray-600/50 text-gray-300 border border-gray-500/30 px-2 py-0.5 rounded-full font-medium">MEMBER</span>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-gray-400 line-clamp-2 h-10 leading-relaxed">
                          {group.description || 'No description provided.'}
                        </p>
                      </div>
                      
                      <div className="bg-[#202123]/50 rounded-xl p-3 mb-5 border border-gray-600/50">
                        <div className="flex items-center gap-2 text-sm text-yellow-500 mb-1">
                          <i className="fas fa-robot"></i>
                          <span className="font-medium truncate">{group.bot_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <i className="fas fa-users"></i> {group.member_count} Members
                        </div>
                      </div>
                      
                      <div className="mt-auto flex gap-3">
                        <button
                          onClick={() => openGroupDetails(group)}
                          className="flex-1 bg-gray-700 hover:bg-gray-600 py-2.5 rounded-xl text-sm text-white font-medium transition shadow-md"
                        >
                          Manage
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            // Navigate to chat with bot_id
                            window.location.href = `/chat?bot_id=${group.bot_id}`;
                          }}
                          className="flex-1 bg-blue-500 hover:bg-blue-600 py-2.5 rounded-xl text-sm text-white font-medium transition shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                        >
                          <i className="fas fa-comment-alt"></i> Chat
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
          <div className="bg-[#202123] border border-gray-600 w-full md:max-w-lg rounded-2xl shadow-2xl p-6 relative animate-fade-in">
            <button
              onClick={() => setShowCreateModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white transition"
            >
              <i className="fas fa-times text-lg"></i>
            </button>

            <h2 className="text-xl md:text-2xl font-bold text-white mb-6 flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center text-blue-500">
                <i className="fas fa-users"></i>
              </div>
              Create New Group
            </h2>

            <form onSubmit={handleCreateGroup} className="space-y-5">
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Group Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full bg-[#40414f] text-white border border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition text-base md:text-sm"
                  placeholder="e.g. Marketing Team"
                  required
                />
              </div>
              
              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">
                  Select Bot to Share <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.bot_id}
                    onChange={(e) => setFormData({ ...formData, bot_id: e.target.value })}
                    className="w-full bg-[#40414f] text-white border border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition appearance-none cursor-pointer text-base md:text-sm"
                    required
                  >
                    <option value="">-- Select your bot --</option>
                    {bots.map((bot) => (
                      <option key={bot.id} value={bot.id}>{bot.name}</option>
                    ))}
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-400">
                    <i className="fas fa-chevron-down text-xs"></i>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-gray-300 text-sm font-bold mb-2">Description</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full bg-[#40414f] text-white border border-gray-600 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-blue-500 transition text-base md:text-sm"
                  placeholder="What is this group for?"
                />
              </div>
              
              <div className="flex justify-end gap-3 mt-8">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-5 py-2.5 rounded-xl text-gray-300 hover:bg-[#40414f] transition font-medium text-sm md:text-base"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-blue-500 hover:bg-blue-600 text-white font-medium rounded-xl shadow-lg transition transform hover:-translate-y-0.5 text-sm md:text-base"
                >
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Group Details Modal */}
      {showDetailsModal && selectedGroup && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-center justify-center backdrop-blur-sm p-2 md:p-4">
          <div className="bg-[#202123] border border-gray-600 w-full max-w-2xl rounded-2xl shadow-2xl p-4 md:p-6 relative h-[90vh] md:h-[85vh] flex flex-col animate-fade-in">
            <button
              onClick={() => setShowDetailsModal(false)}
              className="absolute top-3 right-3 text-gray-400 hover:text-white transition z-10"
            >
              <i className="fas fa-times text-xl"></i>
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4 border-b border-gray-700 pb-4 mt-2 md:mt-0">
              <div className="pr-8 md:pr-0">
                <h2 className="text-xl md:text-2xl font-bold text-white truncate">{selectedGroup.name}</h2>
                <p className="text-xs text-blue-400 mt-1 bg-blue-900/20 px-2 py-1 rounded w-fit border border-blue-500/30 font-mono">
                  Bot: {selectedGroup.bot_name}
                </p>
              </div>
              
              <div className="flex bg-[#40414f] rounded-lg p-1 w-full md:w-auto border border-gray-600">
                <button
                  onClick={() => setSelectedGroup({ ...selectedGroup, activeTab: 'members' })}
                  className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-md text-sm font-medium transition text-center ${
                    (!selectedGroup.activeTab || selectedGroup.activeTab === 'members')
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Members
                </button>
                <button
                  onClick={() => setSelectedGroup({ ...selectedGroup, activeTab: 'knowledge' })}
                  className={`flex-1 md:flex-none px-4 py-2 md:py-1.5 rounded-md text-sm font-medium transition text-center ${
                    selectedGroup.activeTab === 'knowledge'
                      ? 'bg-gray-600 text-white shadow-sm'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Knowledge
                </button>
              </div>
            </div>

            {/* Members Tab */}
            {(!selectedGroup.activeTab || selectedGroup.activeTab === 'members') && (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6">
                {selectedGroup.is_owner && (
                  <div className="bg-[#40414f]/30 p-3 md:p-4 rounded-xl border border-gray-600">
                    <h3 className="font-bold text-green-400 mb-2 text-sm flex items-center gap-2">
                      <i className="fas fa-user-plus"></i> Add Member Direct
                    </h3>
                    <div className="flex flex-col md:flex-row gap-2">
                      <input
                        type="email"
                        value={memberEmail}
                        onChange={(e) => setMemberEmail(e.target.value)}
                        placeholder="User email address..."
                        className="w-full bg-[#202123] border border-gray-600 rounded-lg px-4 py-2.5 text-base md:text-sm text-white focus:ring-1 focus:ring-green-500 outline-none transition placeholder-gray-500"
                      />
                      <button
                        onClick={handleAddMember}
                        className="bg-[#10a37f] hover:bg-green-600 px-5 py-2.5 rounded-lg text-white text-sm font-medium transition shadow-lg w-full md:w-auto"
                      >
                        Add
                      </button>
                    </div>
                  </div>
                )}
                
                <div>
                  <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider pl-1">Member List</h3>
                  <div className="space-y-3">
                    {selectedGroup.members?.map((member, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-[#40414f]/50 border border-gray-600 rounded-lg hover:bg-gray-700/50 transition">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <div className="w-9 h-9 rounded-full bg-gradient-to-r from-gray-600 to-gray-500 flex items-center justify-center text-sm text-white font-bold uppercase shadow-sm shrink-0">
                            {member.full_name ? member.full_name[0] : 'U'}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-white text-sm truncate pr-2">{member.full_name || 'Unknown'}</p>
                            <p className="text-xs text-gray-400 truncate">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          {member.role === 'OWNER' ? (
                            <span className="text-xs bg-yellow-500/20 text-yellow-500 border border-yellow-500/30 px-2 py-0.5 rounded font-medium">Owner</span>
                          ) : (
                            <>
                              <span className="text-xs bg-gray-600 text-gray-300 px-2 py-0.5 rounded">Member</span>
                              {selectedGroup.is_owner && (
                                <button
                                  onClick={() => handleRemoveMember(member.email)}
                                  className="text-gray-500 hover:text-red-500 ml-2 transition p-1 rounded hover:bg-red-500/10"
                                  title="Remove Member"
                                >
                                  <i className="fas fa-times"></i>
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Knowledge Tab */}
            {selectedGroup.activeTab === 'knowledge' && (
              <div className="flex-1 overflow-y-auto custom-scrollbar space-y-4 md:space-y-6">
                <div className="bg-[#40414f]/30 p-4 md:p-6 rounded-xl border-2 border-dashed border-gray-600 text-center hover:bg-gray-700/20 transition group">
                  <div className="mb-3">
                    <i className="fas fa-cloud-upload-alt text-3xl md:text-4xl text-gray-500 group-hover:text-blue-400 transition"></i>
                  </div>
                  <p className="text-xs md:text-sm text-gray-300 mb-4 px-2">Upload documents (PDF, TXT, DOCX) to train this group's bot.</p>
                  <button className="bg-blue-500 hover:bg-blue-600 px-5 py-2 rounded-lg text-white text-sm font-medium transition shadow-lg hover:-translate-y-0.5 w-full md:w-auto">
                    Choose File
                  </button>
                </div>
                <div>
                  <h3 className="font-bold text-gray-400 mb-3 text-xs uppercase tracking-wider pl-1">Shared Files</h3>
                  <p className="text-center text-gray-500 py-6 text-sm italic">No documents uploaded.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.show}
        onClose={() => setConfirmModal({ show: false, action: null, groupId: null })}
        onConfirm={() => {
          if (confirmModal.action === 'delete') {
            handleDeleteGroup(confirmModal.groupId)
          } else if (confirmModal.action === 'leave') {
            handleLeaveGroup(confirmModal.groupId)
          }
        }}
        title={confirmModal.action === 'delete' ? 'Delete Group?' : 'Leave Group?'}
        message={confirmModal.action === 'delete' 
          ? 'Are you sure you want to delete this group? All members will be removed and shared data will be deleted.'
          : 'Are you sure you want to leave this group? Your uploaded files will be removed.'}
      />
    </>
  )
}
