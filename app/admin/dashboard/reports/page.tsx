'use client'

import React, { useEffect, useState } from 'react'
import Loader from '@/components/Loader'
import { useAuth } from '@/lib/auth-context'
import { fetchReports } from "../../../api/adminApi" // same path

// Define Report interface
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

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Reports</h2>
      {reports.length === 0 ? (
        <p>No reports found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thStyle}>Reported User</th>
              <th className={thStyle}>Reason</th>
              <th className={thStyle}>Status</th>
              <th className={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id} style={trStyle}>
                <td className={tdStyle}>{r.reported_user}</td>
                <td className={tdStyle}>{r.reason}</td>
                <td className={tdStyle}>{r.status}</td>
                <td className={tdStyle}>{new Date(r.created_at).toLocaleString()}</td>
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

export default Reports