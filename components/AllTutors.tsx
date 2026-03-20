'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Loader from '@/components/Loader'
import { Button } from '@/components/ui/button'

interface User { id: number; full_name: string; email: string; role: string }
interface Tutor { id: number; subjects: string[]; user: User; is_verified: boolean }

const AllTutors: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const loadTutors = async () => {
    if (!token) return alert('No token found. Please login again.')
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/api/admin/all-tutors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTutors(res.data.tutors || [])
    } catch (err: any) {
      console.error('Failed to fetch tutors:', err)
      alert(err.response?.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to fetch tutors')
    } finally { setLoading(false) }
  }

  const handleToggleVerify = async (userId: number, verify: boolean) => {
    setActionLoading(prev => ({ ...prev, [userId]: true }))
    try {
      const endpoint = verify
        ? `${API_URL}/api/admin/verify-tutor/${userId}`
        : `${API_URL}/api/admin/reject-tutor/${userId}`
      await axios.post(endpoint, {}, { headers: { Authorization: `Bearer ${token}` } })
      setTutors(prev => prev.map(t => t.user.id === userId ? { ...t, is_verified: verify } : t))
      alert(`Tutor ${verify ? 'approved' : 'rejected'} successfully`)
    } catch (err) {
      console.error('Error updating tutor:', err)
      alert(`Failed to ${verify ? 'approve' : 'reject'} tutor`)
    } finally { setActionLoading(prev => ({ ...prev, [userId]: false })) }
  }

  useEffect(() => { loadTutors() }, [])

  if (loading) return <Loader />

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">All Tutors</h2>
      {tutors.length === 0 ? (
        <p>No tutors found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thStyle}>Name</th>
              <th className={thStyle}>Email</th>
              <th className={thStyle}>Subjects</th>
              <th className={thStyle}>Verified</th>
              <th className={thStyle}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {tutors.map(tutor => (
              <tr key={tutor.user.id} style={trStyle}>
                <td className={tdStyle}>{tutor.user.full_name}</td>
                <td className={tdStyle}>{tutor.user.email}</td>
                <td className={tdStyle}>{(tutor.subjects || []).join(', ')}</td>
                <td className={tdStyle}>{tutor.is_verified ? 'Yes' : 'No'}</td>
                <td className={`${tdStyle} space-x-2`}>
                  {!tutor.is_verified && (
                    <>
                      <Button
                        disabled={actionLoading[tutor.user.id]}
                        onClick={() => handleToggleVerify(tutor.user.id, true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
                      >Approve</Button>
                      <Button
                        disabled={actionLoading[tutor.user.id]}
                        onClick={() => handleToggleVerify(tutor.user.id, false)}
                        className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded"
                      >Reject</Button>
                    </>
                  )}
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

export default AllTutors