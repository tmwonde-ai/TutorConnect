'use client'  // 🔑 must be first line

import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { ExcaliburnDrawingBoard } from '@/components/excalibur-drawing-board'
import { SessionChat } from '@/components/session-chat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { useSocket } from "@/lib/use-socket"

interface SessionData {
  id: number
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  subject: string
  scheduled_at: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  hourly_rate: number
  tutor_name?: string
  student_name?: string
}

export default function SessionPage() {
  const { user, getAuthHeaders } = useAuth()
  const params = useParams()
  const sessionId = params.id as string
  const isTutor = user?.role === 'tutor'

if (!process.env.NEXT_PUBLIC_API_URL) {
  throw new Error("API URL not configured")
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const { emit, on, off } = useSocket()

  // ================= SNAPSHOT STATE =================
  const [snapshot, setSnapshot] = useState<string | null>(null)

  // ================= TIMER STATE =================
  const [elapsedSeconds, setElapsedSeconds] = useState(0)

  // ================= FETCH SESSION =================
  const fetchSession = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/sessions/${sessionId}`, {
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Failed to fetch session')
      const data = await res.json()
      setSessionData(data)
      if (data.latest_snapshot) setSnapshot(data.latest_snapshot)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // ================= SOCKET CONNECTION =================
  useEffect(() => {
    if (!sessionId || !user) return

    emit("join_session", { session_id: sessionId, user_id: user.id })

    const handleNewSnapshot = (data: any) => {
      setSnapshot(data.snapshot)
    }

    on("new_snapshot", handleNewSnapshot)
    on("student_snapshot", handleNewSnapshot)

    return () => {
      emit("leave_session", { session_id: sessionId })
      off("new_snapshot", handleNewSnapshot)
      off("student_snapshot", handleNewSnapshot)
    }
  }, [sessionId, user])

  // ================= FETCH ON LOAD =================
  useEffect(() => {
    fetchSession()
  }, [sessionId])

  // ================= TIMER EFFECT =================
  useEffect(() => {
    if (!sessionData?.started_at) return

    const startTime = new Date(sessionData.started_at).getTime()

    const interval = setInterval(() => {
      const now = Date.now()
      const diff = Math.floor((now - startTime) / 1000)
      setElapsedSeconds(diff)
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionData?.started_at])

  // ================= FORMAT TIMER =================
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  }

  // ================= START SESSION =================
  const handleStartSession = async () => {
    if (!sessionData) return
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionData.id}/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Failed to start session')
      const data = await res.json()
      setSessionData(data.session)
      alert('Session started')
    } catch (err: any) {
      alert(err.message)
    }
  }

  // ================= END SESSION =================
  const handleEndSession = async () => {
    if (!sessionData) return
    if (!confirm('End this session? You will not be able to resume it.')) return
    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionData.id}/end`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
      })
      if (!res.ok) throw new Error('Failed to end session')
      const data = await res.json()
      setSessionData(data.session)
      alert('Session ended')
    } catch (err: any) {
      alert(err.message)
    }
  }

  // ================= LOADING / ERROR STATES =================
  if (loading) return <p className="text-center py-20">Loading session...</p>
  if (error || !sessionData) return <p className="text-center py-20 text-red-500">{error || 'Session not found'}</p>

  // ================= RENDER =================
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted">

        {/* HEADER */}
        <header className="sticky top-0 z-10 bg-card border-b border-border">
          <div className="max-w-full mx-auto px-6 py-6 flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-primary">Tutoring Session</h1>
              <p className="text-foreground/60 mt-1">Session ID: {sessionData.id}</p>
            </div>
            <div className="flex gap-6 items-center">
              {sessionData.status === 'ongoing' && (
                <div className="text-lg font-mono font-semibold text-green-500">
                  {formatTime(elapsedSeconds)}
                </div>
              )}

              {isTutor && sessionData.status === 'scheduled' && (
                <Button onClick={handleStartSession}>Start Session</Button>
              )}
              {isTutor && sessionData.status === 'ongoing' && (
                <Button onClick={handleEndSession} variant="destructive">End Session</Button>
              )}
            </div>
          </div>
        </header>

        {/* MAIN */}
        <main className="max-w-full mx-auto px-6 py-8 grid lg:grid-cols-4 gap-8">

          {/* LEFT SIDE */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Card className="border-border flex-1">
              <CardHeader>
                <CardTitle className="text-primary">Interactive Board</CardTitle>
              </CardHeader>
              <CardContent className="h-[600px] p-0">
                
                {/* ✅ FIX APPLIED HERE */}
                <ExcaliburnDrawingBoard
                  sessionId={sessionData.id}
                  userId={user?.id || 0}
                  isTutor={isTutor}
                />

              </CardContent>
            </Card>
          </div>

          {/* RIGHT SIDEBAR */}
          <div className="lg:col-span-1 flex flex-col space-y-6">
            <div className="flex-1">
              <SessionChat
                sessionId={sessionData.id.toString()}
                currentUserRole={(user?.role as 'tutor' | 'student') || 'student'}
                currentUserName={user?.full_name || 'User'}
              />
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-primary">Session Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-foreground/60">Status</p>
                <p className="font-semibold text-foreground capitalize">{sessionData.status}</p>
                <p className="text-sm text-foreground/60">Subject</p>
                <p className="font-semibold text-foreground">{sessionData.subject}</p>
                <p className="text-sm text-foreground/60">Scheduled At</p>
                <p className="font-semibold text-foreground">{new Date(sessionData.scheduled_at).toLocaleString()}</p>
                <p className="text-sm text-foreground/60">Duration</p>
                <p className="font-semibold text-foreground">{sessionData.duration_minutes ? `${sessionData.duration_minutes} minutes` : '1 hour'}</p>
                <p className="text-sm text-foreground/60">Rate</p>
                <p className="font-semibold text-foreground">ZMW {(sessionData.hourly_rate ?? 0).toFixed(2)}/hour</p>
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-primary">Participants</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm text-foreground/60">Tutor</p>
                  <p className="font-semibold text-foreground">{sessionData.tutor_name || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-sm text-foreground/60">Student</p>
                  <p className="font-semibold text-foreground">{sessionData.student_name || 'N/A'}</p>
                </div>
              </CardContent>
            </Card>

          </div>
        </main>
      </div>
    </ProtectedRoute>
  )
}