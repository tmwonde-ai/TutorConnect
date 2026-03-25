'use client'

import React, { useEffect, useState } from "react"
import { fetchSessions } from "../../../api/adminApi"
import Loader from "@/components/Loader"
import { useAuth } from "@/lib/auth-context"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock } from "lucide-react"

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700'
      case 'in_progress':
        return 'bg-blue-100 text-blue-700'
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Clock className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Sessions</h1>
          <p className="text-muted-foreground">Track all tutoring sessions</p>
        </div>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>All Sessions ({sessions.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {sessions.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No sessions found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Subject</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Tutor</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Student</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Scheduled</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">{s.subject}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.tutor_obj?.full_name || "Unknown"}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{s.student_obj?.full_name || "Unknown"}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(s.status)}`}>
                          {s.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {new Date(s.scheduled_at).toLocaleString()}
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

export default Sessions
