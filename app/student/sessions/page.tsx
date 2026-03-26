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
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled'
  scheduled_at: string
  started_at?: string
  ended_at?: string
  duration_minutes?: number
  paid: boolean
  tutor_name: string
  reject_reason?: string
  rating?: number
}

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
}

function Modal({ isOpen, onClose, title, children }: ModalProps) {
  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 transition-opacity duration-300 ${
        isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
      }`}
    >
      <div
        className={`bg-white rounded-lg p-6 w-full max-w-sm transform transition-transform duration-300 ${
          isOpen ? 'translate-y-0 scale-100' : 'translate-y-6 scale-95'
        }`}
      >
        {title && <h2 className="text-lg font-semibold mb-4">{title}</h2>}
        <div>{children}</div>
      </div>
    </div>
  )
}

function StudentSessionsContent() {
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(false)
  const [cancellingId, setCancellingId] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [payingSessionId, setPayingSessionId] = useState<number | null>(null)
  const [deleteSessionId, setDeleteSessionId] = useState<number | null>(null)
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false)

  // --- Rating state ---
  const [ratingSessionId, setRatingSessionId] = useState<number | null>(null)
  const [ratingValue, setRatingValue] = useState<number>(0)
  const [reviewText, setReviewText] = useState('')
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false)
  const [sessionRatings, setSessionRatings] = useState<Record<number, number>>({})

  useEffect(() => {
    loadSessions()
  }, [])

  const loadSessions = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      )
      if (res.ok) {
        const data = await res.json()
        const sessionsData = Array.isArray(data.sessions) ? data.sessions : []
        setSessions(sessionsData)

        // populate ratings if present
        const ratingsObj: Record<number, number> = {}
        sessionsData.forEach((s: Session) => {
          if (s.rating) ratingsObj[s.id] = s.rating
        })
        setSessionRatings(ratingsObj)
      }
    } catch (error) {
      console.error('Failed to load sessions:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCancelSession = async (sessionId: number) => {
    if (!confirm('Are you sure you want to cancel this session?')) return
    
    setCancellingId(sessionId)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions/${sessionId}/cancel`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }
      )
      if (res.ok) {
        setSessions(sessions.map(s => s.id === sessionId ? { ...s, status: 'cancelled' } : s))
        alert('Session cancelled')
      }
    } catch (error) {
      console.error('Failed to cancel session:', error)
      alert('Failed to cancel session')
    } finally {
      setCancellingId(null)
    }
  }

  const handleDeleteSession = (sessionId: number) => {
    setDeleteSessionId(sessionId)
    setIsDeleteModalOpen(true)
  }

  const confirmDeleteSession = async () => {
    if (!deleteSessionId) return

    try {
      const token = localStorage.getItem("auth_token")
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/sessions/${deleteSessionId}`,
        { method: "DELETE", headers: { Authorization: `Bearer ${token}` } }
      )
      if (res.ok) setSessions(prev => prev.filter(s => s.id !== deleteSessionId))
      else alert("Failed to delete session")
    } catch (error) {
      console.error("Delete session error:", error)
      alert("Failed to delete session")
    } finally {
      setIsDeleteModalOpen(false)
      setDeleteSessionId(null)
    }
  }

  const handlePayNow = (sessionId: number) => {
    setPayingSessionId(sessionId)
    setPhoneNumber('')
    setIsModalOpen(true)
  }

  const submitPayment = async () => {
    if (!phoneNumber || !payingSessionId) return

    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/payments`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: payingSessionId, phone_number: phoneNumber })
        }
      )
      const data = await res.json()
      if (res.ok) {
        alert("Payment initiated. Please confirm on your phone.")
        loadSessions()
      } else alert(data.message || "Payment failed")
    } catch (error) {
      console.error('Payment failed:', error)
      alert("Payment failed")
    } finally {
      setIsModalOpen(false)
      setPayingSessionId(null)
    }
  }

  const submitRating = async () => {
    if (!ratingSessionId || ratingValue === 0) {
      alert("Please provide a rating")
      return
    }
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/ratings`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ session_id: ratingSessionId, rating: ratingValue, review: reviewText })
        }
      )
      if (res.ok) {
        alert('Rating submitted successfully')
        setSessionRatings(prev => ({ ...prev, [ratingSessionId]: ratingValue }))
        setIsRatingModalOpen(false)
        setRatingSessionId(null)
      } else {
        const data = await res.json()
        alert(data.message || 'Failed to submit rating')
      }
    } catch (error) {
      console.error('Failed to submit rating:', error)
      alert('Failed to submit rating')
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-500/10 text-blue-600'
      case 'ongoing': return 'bg-green-500/10 text-green-600'
      case 'completed': return 'bg-gray-500/10 text-gray-600'
      case 'cancelled': return 'bg-red-500/10 text-red-600'
      default: return 'bg-gray-500/10 text-gray-600'
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <Link href='/dashboard' className='text-primary hover:underline text-sm mb-4 block'>
            ← Back to Dashboard
          </Link>
          <div className='flex justify-between items-center'>
            <h1 className='text-3xl font-bold text-primary'>My Sessions</h1>
            <Link href='/student/search-tutors'>
              <Button className='bg-primary hover:bg-primary/90'>Book New Session</Button>
            </Link>
          </div>
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
                <p className='text-foreground/60 mb-4'>No sessions yet. Start by booking a session with a tutor.</p>
                <Link href='/student/search-tutors'>
                  <Button className='bg-primary hover:bg-primary/90'>Find a Tutor</Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            sessions.map((session) => (
              <Card key={session.id} className='border-border hover:shadow-lg transition-shadow'>
                <CardContent className='pt-6'>
                  <div className='flex flex-col md:flex-row items-start md:items-center justify-between'>
                    <div className='flex-1'>
                      <h3 className='text-lg font-semibold text-foreground'>{session.subject}</h3>
                      <p className='text-sm text-foreground/60'>with {session.tutor_name}</p>

                      <div className='grid grid-cols-3 gap-4 mt-4 text-sm'>
                        <div>
                          <p className='text-foreground/60'>Scheduled</p>
                          <p className='font-semibold text-foreground'>
                            {new Date(session.scheduled_at).toLocaleDateString()} {new Date(session.scheduled_at).toLocaleTimeString()}
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
                          <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(session.status)}`}>
                            {session.status}
                          </span>
                        </div>
                      </div>

                      {session.status === 'cancelled' && session.reject_reason && (
                        <div className='mt-2 p-3 bg-red-50 border border-red-200 rounded'>
                          <p className='text-red-700 text-sm font-semibold'>Session rejected by tutor</p>
                          <p className='text-red-600 text-sm'>{session.reject_reason}</p>

                          <Button
                            size='sm'
                            variant='outline'
                            className='border-red-300 text-red-600 hover:bg-red-50 mt-3'
                            onClick={() => handleDeleteSession(session.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      )}
                    </div>

                    <div className='flex gap-2 mt-4 md:mt-0 items-center'>
                      {session.status === 'scheduled' && (
                        <>
                          <Link href={`/session/${session.id}`}>
                            <Button size='sm' className='bg-primary hover:bg-primary/90'>Join</Button>
                          </Link>

                          <Button
                            size='sm'
                            variant='outline'
                            className='border-border text-destructive hover:bg-destructive/10'
                            onClick={() => handleCancelSession(session.id)}
                            disabled={cancellingId === session.id}
                          >
                            {cancellingId === session.id ? 'Cancelling...' : 'Cancel'}
                          </Button>
                        </>
                      )}

                      {session.status === 'ongoing' && (
                        <Link href={`/session/${session.id}`}>
                          <Button size='sm' className='bg-accent hover:bg-accent/90'>Resume</Button>
                        </Link>
                      )}

                      {session.status === 'completed' && !session.paid && (
                        <Button size='sm' className='bg-primary hover:bg-primary/90' onClick={() => handlePayNow(session.id)}>Pay Now</Button>
                      )}

                      {session.status === 'completed' && (
                        <Button
                          size='sm'
                          variant='outline'
                          className='border-border'
                          onClick={() => {
                            setRatingSessionId(session.id)
                            setRatingValue(0)
                            setReviewText('')
                            setIsRatingModalOpen(true)
                          }}
                          disabled={!!sessionRatings[session.id]}
                        >
                          {sessionRatings[session.id] ? `Rated: ${sessionRatings[session.id]}★` : 'Rate Tutor'}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </main>

      {/* PAYMENT MODAL */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Enter Airtel Money Number">
        <input type="text" placeholder="260XXXXXXXXX" value={phoneNumber} onChange={(e) => setPhoneNumber(e.target.value)} className="w-full px-3 py-2 border rounded mb-4"/>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => setIsModalOpen(false)}>Cancel</button>
          <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90" onClick={submitPayment}>Pay</button>
        </div>
      </Modal>

      {/* DELETE MODAL */}
      <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)} title="Remove Session">
        <p className="text-sm text-gray-600 mb-4">Do you want to remove this rejected session from your list?</p>
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => setIsDeleteModalOpen(false)}>Keep</button>
          <button className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700" onClick={confirmDeleteSession}>Remove</button>
        </div>
      </Modal>

      {/* RATING MODAL */}
      <Modal isOpen={isRatingModalOpen} onClose={() => setIsRatingModalOpen(false)} title="Rate Your Tutor">
        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Rating:</label>
          <div className="flex gap-1">
            {[1,2,3,4,5].map((star) => (
              <button key={star} type="button" onClick={() => setRatingValue(star)} className={`text-2xl ${ratingValue >= star ? 'text-yellow-400' : 'text-gray-300'}`}>★</button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-gray-700 mb-1">Review (optional):</label>
          <textarea value={reviewText} onChange={(e) => setReviewText(e.target.value)} className="w-full px-3 py-2 border rounded" rows={3} placeholder="Write a review..."/>
        </div>

        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onClick={() => setIsRatingModalOpen(false)}>Cancel</button>
          <button className="px-4 py-2 bg-primary text-white rounded hover:bg-primary/90" onClick={submitRating}>Submit</button>
        </div>
      </Modal>
    </div>
  )
}

export default function StudentSessionsPage() {
  return (
    <ProtectedRoute requiredRole='student'>
      <StudentSessionsContent />
    </ProtectedRoute>
  )
}