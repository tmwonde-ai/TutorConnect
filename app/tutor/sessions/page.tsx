'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

interface Session {
  id: number
  tutor_id: number
  student_id: number
  subject: string
  status: 'pending' | 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  scheduled_at: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  paid: boolean
  student_name: string
  accepted_by_tutor?: boolean
  reject_reason?: string
}

function TutorSessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)

  const [processingSession, setProcessingSession] = useState<number | null>(null)
  const [rejectingSession, setRejectingSession] = useState<number | null>(null)
  const [rejectReason, setRejectReason] = useState('')

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions`,
        { headers: token ? { Authorization: `Bearer ${token}` } : {} }
      )

      if (res.ok) {
        const data = await res.json()
        setSessions(data.sessions || [])
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const acceptSession = async (sessionId: number) => {
    setProcessingSession(sessionId)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions/${sessionId}/accept`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      )
      if (res.ok) loadSessions()
    } catch (error) {
      console.error('Accept session error:', error)
    } finally {
      setProcessingSession(null)
    }
  }

  const rejectSession = async () => {
    if (!rejectingSession) return
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejecting this session.')
      return
    }

    setProcessingSession(rejectingSession)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions/${rejectingSession}/reject`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ reason: rejectReason })
        }
      )

      const data = await res.json()
      if (!res.ok) {
        alert(data.message || 'Failed to reject session')
        return
      }

      // Update local session list
      setSessions(sessions.map(s =>
        s.id === rejectingSession
          ? { ...s, status: 'cancelled', reject_reason: rejectReason }
          : s
      ))
      setRejectReason('')
      setRejectingSession(null)
    } catch (error) {
      console.error('Reject session error:', error)
      alert('Failed to reject session')
    } finally {
      setProcessingSession(null)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-200 text-yellow-800'
      case 'scheduled': return 'bg-blue-100 text-blue-600'
      case 'ongoing': return 'bg-green-100 text-green-600'
      case 'completed': return 'bg-gray-100 text-gray-600'
      case 'cancelled': return 'bg-red-100 text-red-600'
      default: return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <Link href='/dashboard' className='text-primary hover:underline text-sm mb-4 block'>
            ← Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-primary'>My Sessions</h1>
        </div>
      </header>

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='space-y-4'>
          {loading ? (
            <Card className='border-border'>
              <CardContent className='pt-12 pb-12 text-center'>
                <div className='inline-block'>
                  <div className='w-12 h-12 border-4 border-primary border-t-primary/30 rounded-full animate-spin'></div>
                </div>
                <p className='mt-4 text-foreground/60'>Loading your sessions...</p>
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card className='border-border'>
              <CardContent className='pt-12 pb-12 text-center'>
                <p className='text-foreground/60'>No sessions yet. Update your profile to start receiving bookings.</p>
              </CardContent>
            </Card>
          ) : (
            sessions.map(session => {
              const displayStatus =
              session.status === 'cancelled'
                ? 'cancelled'
                : session.accepted_by_tutor
                ? session.status
                : 'pending'

              return (
                <Card key={session.id} className='border-border hover:shadow-lg transition-shadow'>
                  <CardContent className='pt-6'>
                    <div className='flex items-center justify-between'>
                      <div className='flex-1'>
                        <h3 className='text-lg font-semibold text-foreground'>{session.subject}</h3>
                        <p className='text-sm text-foreground/60'>Student: {session.student_name}</p>

                        <div className='grid grid-cols-3 gap-4 mt-4 text-sm'>
                          <div>
                            <p className='text-foreground/60'>Scheduled</p>
                            <p className='font-semibold text-foreground'>
                              {new Date(session.scheduled_at).toLocaleDateString()}{' '}
                              {new Date(session.scheduled_at).toLocaleTimeString()}
                            </p>
                          </div>

                          {session.status === 'completed' && (
                            <div>
                              <p className='text-foreground/60'>Duration</p>
                              <p className='font-semibold text-foreground'>{session.duration_minutes} minutes</p>
                            </div>
                          )}

                          <div>
                            <p className='text-foreground/60'>Status</p>
                            <span
                              className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(displayStatus)}`}
                            >
                              {displayStatus}
                            </span>
                          </div>
                        </div>

                        {displayStatus === 'cancelled' && session.reject_reason && (
                          <p className='text-sm text-destructive mt-2'>Reason: {session.reject_reason}</p>
                        )}
                      </div>

                      <div className='flex gap-2'>
                        <Link href={`/student-profile/${session.student_id}`}>
                          <Button size='sm' variant='outline' className='border-border'>View Student Profile</Button>
                        </Link>

                        {displayStatus === 'pending' && (
                          <>
                            <Button
                              size='sm'
                              style={{ backgroundColor: '#1a4d2e', color: '#fff' }}
                              disabled={processingSession === session.id}
                              onClick={() => acceptSession(session.id)}
                              className='hover:brightness-90'
                            >
                              Accept
                            </Button>

                            <Button
                              size='sm'
                              variant='outline'
                              className='border-border text-destructive'
                              onClick={() => setRejectingSession(session.id)}
                            >
                              Reject
                            </Button>
                          </>
                        )}

                        {displayStatus === 'scheduled' && (
                          <Link href={`/session/${session.id}`}>
                            <Button size='sm' className='bg-primary hover:bg-primary/90'>Start</Button>
                          </Link>
                        )}

                        {displayStatus === 'ongoing' && (
                          <Link href={`/session/${session.id}`}>
                            <Button size='sm' className='bg-accent hover:bg-accent/90'>Resume</Button>
                          </Link>
                        )}

                        {displayStatus === 'completed' && !session.paid && (
                          <Button size='sm' className='bg-primary hover:bg-primary/90' disabled>Pending Payment</Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      </main>

      {/* Reject Dialog */}
      {rejectingSession && (
        <div className='fixed inset-0 bg-black/40 flex items-center justify-center z-50'>
          <div className='bg-card border border-border rounded-lg p-6 w-[400px]'>
            <h2 className='text-lg font-semibold mb-4'>Reject Session</h2>
            <p className='text-sm text-foreground/60 mb-3'>Please provide a reason for rejecting this session.</p>

            <textarea
              className='w-full border border-border rounded-md p-2 text-sm'
              rows={4}
              value={rejectReason}
              onChange={e => setRejectReason(e.target.value)}
              placeholder='Enter rejection reason...'
            />

            <div className='flex justify-end gap-2 mt-4'>
              <Button
                variant='outline'
                onClick={() => {
                  setRejectReason('')
                  setRejectingSession(null)
                }}
              >
                Cancel
              </Button>

              <Button
                className='bg-destructive hover:bg-destructive/90'
                onClick={rejectSession}
              >
                Confirm Reject
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default function TutorSessionsPage() {
  return (
    <ProtectedRoute requiredRole='tutor'>
      <TutorSessionsContent />
    </ProtectedRoute>
  )
}