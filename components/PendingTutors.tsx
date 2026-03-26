'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Loader from './Loader'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle, XCircle } from 'lucide-react'

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

  const { token, isLoading: authLoading } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const loadTutors = async () => {
    if (!token) return
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/pending-tutors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTutors(res.data.tutors || [])
    } catch (err: any) {
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
      await axios.post(`${API_URL}/admin/verify-tutor/${userId}`, {}, {
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
      await axios.post(`${API_URL}/admin/reject-tutor/${userId}`, {}, {
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

  useEffect(() => {
    if (token) loadTutors()
  }, [token])

  if (loading || authLoading) return <Loader />

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>Pending Tutor Applications ({tutors.length})</CardTitle>
      </CardHeader>
      <CardContent>
        {tutors.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No pending tutor applications.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Subjects</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tutors.map(tutor => (
                  <tr key={tutor.user.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium">{tutor.user.full_name}</td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">{tutor.user.email}</td>
                    <td className="px-4 py-3 text-sm">{(tutor.subjects || []).join(', ')}</td>
                    <td className="px-4 py-3 text-sm space-x-2">
                      <Button
                        disabled={actionLoading[tutor.user.id]}
                        onClick={() => handleApprove(tutor.user.id)}
                        size="sm"
                        className="bg-green-600 hover:bg-green-700 text-white"
                      >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Approve
                      </Button>
                      <Button
                        disabled={actionLoading[tutor.user.id]}
                        onClick={() => handleReject(tutor.user.id)}
                        size="sm"
                        variant="destructive"
                      >
                        <XCircle className="w-3 h-3 mr-1" />
                        Reject
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default PendingTutors