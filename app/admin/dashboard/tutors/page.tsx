'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Loader from '@/components/Loader'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/lib/auth-context'
import { CheckCircle, XCircle, Users } from 'lucide-react'

interface User { id: number; full_name: string; email: string; role: string }
interface Tutor { id: number; subjects: string[]; user: User; is_verified: boolean }

const AllTutors: React.FC = () => {
  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<{ [key: number]: boolean }>({})

  const { token, isLoading: authLoading } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const loadTutors = async () => {
    if (!token) return alert('No token found. Please login again.')
    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/all-tutors`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      setTutors(res.data.tutors || [])
    } catch (err: any) {
      console.error('Failed to fetch tutors:', err)
      alert(err.response?.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to fetch tutors')
    } finally {
      setLoading(false)
    }
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
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: false }))
    }
  }

  useEffect(() => {
    if (token) loadTutors()
  }, [token])

  if (loading || authLoading) return <Loader />

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Users className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">All Tutors</h1>
          <p className="text-muted-foreground">Manage and verify tutors in the system</p>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Tutors ({tutors.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {tutors.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tutors found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Name</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Email</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Subjects</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tutors.map(tutor => (
                    <tr key={tutor.user.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{tutor.user.full_name}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{tutor.user.email}</td>
                      <td className="px-4 py-3 text-sm">{(tutor.subjects || []).join(', ')}</td>
                      <td className="px-4 py-3 text-sm">
                        {tutor.is_verified ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" /> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-yellow-100 text-yellow-700 text-xs font-medium">
                            <XCircle className="w-3 h-3" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm space-x-2">
                        {!tutor.is_verified && (
                          <>
                            <Button
                              disabled={actionLoading[tutor.user.id]}
                              onClick={() => handleToggleVerify(tutor.user.id, true)}
                              size="sm"
                              className="bg-green-600 hover:bg-green-700"
                            >
                              Approve
                            </Button>
                            <Button
                              disabled={actionLoading[tutor.user.id]}
                              onClick={() => handleToggleVerify(tutor.user.id, false)}
                              size="sm"
                              variant="destructive"
                            >
                              Reject
                            </Button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default AllTutors
