'use client'

import React, { useEffect, useState } from "react"
import { fetchSessions } from "../../../api/adminApi" // same path
import Loader from "@/components/Loader"
import { useAuth } from "@/lib/auth-context"

interface User {
  id: number
  full_name: string
}

interface Session {
  id: number
  subject: string
  status: string
  scheduled_at: string
  tutor_obj?: User
  student_obj?: User
}

const Sessions: React.FC = () => {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const { token, isLoading: authLoading } = useAuth()

  useEffect(() => {
    const loadSessions = async () => {
      if (!token) return

      try {
        // ✅ Pass the token from auth context
        const data = await fetchSessions(token)
        setSessions(data || [])
      } catch (err) {
        console.error("Failed to fetch sessions:", err)
      } finally {
        setLoading(false)
      }
    }

    if (token) loadSessions()
  }, [token])

  if (loading || authLoading) return <Loader />

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">All Sessions</h1>

      <table className="w-full border-collapse">
        <thead>
          <tr>
            <th className={thStyle}>Subject</th>
            <th className={thStyle}>Tutor</th>
            <th className={thStyle}>Student</th>
            <th className={thStyle}>Status</th>
            <th className={thStyle}>Scheduled At</th>
          </tr>
        </thead>

        <tbody>
          {sessions.map((s) => (
            <tr key={s.id} style={trStyle}>
              <td className={tdStyle}>{s.subject}</td>
              <td className={tdStyle}>{s.tutor_obj?.full_name || "Unknown"}</td>
              <td className={tdStyle}>{s.student_obj?.full_name || "Unknown"}</td>
              <td className={tdStyle}>{s.status}</td>
              <td className={tdStyle}>
                {new Date(s.scheduled_at).toLocaleString()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

const thStyle = "border-b border-gray-300 p-3 text-left"
const tdStyle = "border-b border-gray-200 p-3"
const trStyle = { background: "#fafafa" }

export default Sessions