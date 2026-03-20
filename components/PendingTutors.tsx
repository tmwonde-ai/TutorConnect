'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import Loader from './Loader'
import { useAuth } from '@/lib/auth-context'

interface User {
  id: number
  full_name: string
  email: string
}

interface Tutor {
  id: number
  subjects: string[]
  user: User
}

const PendingTutors: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  // ✅ Use token from auth-context
  const { token, isLoading: authLoading } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const loadTutors = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/pending-tutors`, {
        headers: { Authorization: `Bearer ${token}` }, // ✅ use context token
      })
      const data = res.data.tutors as Tutor[]
      setTutors(data || [])
    } catch (err) {
      console.error('Failed to fetch tutors:', err)
      alert(err.response?.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to fetch pending tutors')
    } finally {
      setLoading(false)
    }
  }

  const handleApprove = async (userId: number) => {
    if (!token) return
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    try {
      await axios.post(`${API_URL}/api/admin/verify-tutor/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTutors(prev => prev.filter(t => t.user.id !== userId))
      alert('Tutor approved successfully')
    } catch (err) {
      console.error('Error approving tutor:', err)
      alert('Failed to approve tutor')
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleReject = async (userId: number) => {
    if (!token) return
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    try {
      await axios.post(`${API_URL}/api/admin/reject-tutor/${userId}`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTutors(prev => prev.filter(t => t.user.id !== userId))
      alert('Tutor rejected')
    } catch (err) {
      console.error('Error rejecting tutor:', err)
      alert('Failed to reject tutor')
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  // ✅ Wait for token from auth context before fetching
  useEffect(() => {
    if (token) loadTutors()
  }, [token])

  if (loading || authLoading) return <Loader />

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted p-6">
      <h1 className="text-2xl font-bold mb-4">Pending Tutors</h1>

      {tutors.length === 0 ? (
        <p>No pending tutors.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thStyle}>Name</th>
              <th className={thStyle}>Email</th>
              <th className={thStyle}>Subjects</th>
              <th className={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(tutor => (
              <tr key={tutor.user.id} style={trStyle}>
                <td className={tdStyle}>{tutor.user.full_name}</td>
                <td className={tdStyle}>{tutor.user.email}</td>
                <td className={tdStyle}>{(tutor.subjects || []).join(', ')}</td>
                <td className={`${tdStyle} space-x-2`}>
                  <Button
                    disabled={actionLoading[tutor.user.id]}
                    onClick={() => handleApprove(tutor.user.id)}
                    className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                  >
                    Approve
                  </Button>
                  <Button
                    disabled={actionLoading[tutor.user.id]}
                    onClick={() => handleReject(tutor.user.id)}
                    className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                  >
                    Reject
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const thStyle = 'border-b border-gray-300 p-3 text-left'
const tdStyle = 'border-b border-gray-200 p-3'
const trStyle = { background: '#fafafa' }

export default PendingTutors