'use client'

import { useParams } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { ExcaliburnDrawingBoard } from '@/components/excalibur-drawing-board'
import { DrawingBoard } from '@/components/drawing-board'
import { SessionChat } from '@/components/session-chat'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useEffect, useState } from 'react'
import { useSocket } from '@/lib/use-socket' // ✅ ADDED

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
  latest_snapshot?: string
}

export default function SessionPage() {
  const { user, getAuthHeaders } = useAuth()
  const params = useParams()
  const sessionId = params.id as string
  const isTutor = user?.role === 'tutor'

  const { emit, on, off, onConnect, connected } = useSocket() // ✅ ADDED

  if (!process.env.NEXT_PUBLIC_API_URL) {
    throw new Error("API URL not configured")
  }

  const API_BASE = process.env.NEXT_PUBLIC_API_URL

  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [snapshot, setSnapshot] = useState<string | null>(null)
  const [activeBoard, setActiveBoard] = useState<'excalibur' | 'upload'>('excalibur')
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

  useEffect(() => {
    fetchSession()
  }, [sessionId])

  // ================= ✅ SOCKET SYNC =================
  useEffect(() => {
    if (!sessionId || !user) return

    const joinRoom = () => {
      emit('join_session', {
        session_id: sessionId,
        user_id: user.id
      })
    }

    if (connected) joinRoom()
    onConnect(joinRoom)

    const handleSnapshot = (data: any) => {
      if (!data?.snapshot) return
      setSnapshot(data.snapshot)
    }

    on('new_snapshot', handleSnapshot)

    return () => {
      off('new_snapshot', handleSnapshot)
    }
  }, [sessionId, user, connected])

  // ================= TIMER =================
  useEffect(() => {
    if (!sessionData?.started_at) return

    const startTime = new Date(sessionData.started_at).getTime()
    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [sessionData?.started_at])

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    return `${h.toString().padStart(2,'0')}:${m.toString().padStart(2,'0')}:${s.toString().padStart(2,'0')}`
  }

  // ================= START / END =================
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

  // ================= SEND SNAPSHOT =================
  const handleSendSnapshot = async (snap: string) => {
    try {
      setSnapshot(snap)
      if (!sessionData) return

      await fetch(`${API_BASE}/sessions/${sessionData.id}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
        body: JSON.stringify({ snapshot: snap, user_id: user?.id })
      })
    } catch (err: any) {
      console.error('Snapshot save error:', err.message)
    }
  }

  // ================= STATES =================
  if (loading) return <p className="text-center py-20">Loading session...</p>
  if (error || !sessionData)
    return <p className="text-center py-20 text-red-500">{error || 'Session not found'}</p>

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

          {/* BOARDS */}
          <div className="lg:col-span-3 flex flex-col space-y-6">
            <Card className="border-border flex-1">
              <CardHeader>
                <CardTitle className="text-primary">Interactive Board</CardTitle>
              </CardHeader>
              <CardContent className="h-[600px] p-0 flex flex-col">

                <div className="flex gap-2 p-2 border-b border-border">
                  <Button
                    variant={activeBoard === 'excalibur' ? 'default' : 'outline'}
                    onClick={() => setActiveBoard('excalibur')}
                  >
                    Excalibur Board
                  </Button>
                  <Button
                    variant={activeBoard === 'upload' ? 'default' : 'outline'}
                    onClick={() => setActiveBoard('upload')}
                  >
                    Upload Board
                  </Button>
                </div>

                <div className="flex-1 overflow-hidden">
                  {activeBoard === 'excalibur' && (
                    <ExcaliburnDrawingBoard
                      isTutor={isTutor}
                      snapshot={snapshot || undefined}
                      onSendSnapshot={handleSendSnapshot}
                    />
                  )}
                  {activeBoard === 'upload' && (
                    <DrawingBoard
                      isTutor={isTutor}
                      snapshot={snapshot || undefined}
                      onSendSnapshot={handleSendSnapshot}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* SIDEBAR */}
          <div className="lg:col-span-1 flex flex-col space-y-6">

            {/* CHAT */}
            <div className="flex-1">
              <SessionChat
                sessionId={sessionData.id.toString()}
                currentUserRole={(user?.role as 'tutor' | 'student') || 'student'}
                currentUserName={user?.full_name || 'User'}
                currentUserId={user?.id.toString() || '0'}
              />
            </div>

            {/* SESSION INFO */}
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
                <p className="font-semibold text-foreground">
                  {sessionData.duration_minutes ? `${sessionData.duration_minutes} minutes` : '1 hour'}
                </p>
                <p className="text-sm text-foreground/60">Rate</p>
                <p className="font-semibold text-foreground">
                  ZMW {(sessionData.hourly_rate ?? 0).toFixed(2)}/hour
                </p>
              </CardContent>
            </Card>

            {/* PARTICIPANTS */}
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