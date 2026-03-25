'use client'

import React, { useEffect, useState } from 'react'
import Loader from '@/components/Loader'
import { useAuth } from '@/lib/auth-context'
import { fetchReports } from "../../../api/adminApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Flag } from 'lucide-react'

interface Report {
  id: number
  reported_user: string
  reason: string
  status: string
  created_at: string
}

const Reports: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const { token, isLoading: authLoading } = useAuth()

  const loadReports = async () => {
    if (!token) return alert('No token found. Please login again.')
    setLoading(true)
    try {
      const data = await fetchReports(token)
      setReports(data || [])
    } catch (err: any) {
      console.error('Failed to fetch reports:', err)
      alert(err.response?.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to fetch reports')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadReports()
  }, [token])

  if (loading || authLoading) return <Loader />

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'resolved':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'investigating':
        return 'bg-blue-100 text-blue-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const pendingReports = reports.filter(r => r.status.toLowerCase() === 'pending').length

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Flag className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Reports</h1>
          <p className="text-muted-foreground">Review and manage user reports</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Reports</p>
            <p className="text-2xl font-bold text-primary">{reports.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Pending</p>
            <p className="text-2xl font-bold text-orange-600">{pendingReports}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Resolved</p>
            <p className="text-2xl font-bold text-green-600">{reports.filter(r => r.status.toLowerCase() === 'resolved').length}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>All Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {reports.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No reports found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Reported User</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Reason</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {reports.map(r => (
                    <tr key={r.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{r.reported_user}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{r.reason}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(r.status)}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(r.created_at).toLocaleString()}</td>
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

export default Reports
