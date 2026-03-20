'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

interface Tutor {
  id: number
  subjects: string[]
  experience_years: number
  hourly_rate: number
  total_sessions: number
  is_verified: boolean
  rating: number
  user?: {
    id: number
    full_name: string
  }
}

// ------------------- TOAST COMPONENT -------------------
interface ToastProps {
  message: string
  isOpen: boolean
}
function Toast({ message, isOpen }: ToastProps) {
  return (
    <div
      className={`fixed top-6 right-6 z-50 bg-green-500 text-white px-4 py-2 rounded shadow-lg transform transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-6 pointer-events-none'
      }`}
    >
      {message}
    </div>
  )
}
// -------------------------------------------------------

function SearchTutorsContent() {
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  const [tutors, setTutors] = useState<Tutor[]>([])
  const [loading, setLoading] = useState(false)
  const [filters, setFilters] = useState({ subject: '', name: '', rating: '', price: '' })
  const [selectedTutor, setSelectedTutor] = useState<Tutor | null>(null)
  const [showBooking, setShowBooking] = useState(false)
  const [bookingSubject, setBookingSubject] = useState('')
  const [bookingTime, setBookingTime] = useState('')
  const [bookingLoading, setBookingLoading] = useState(false)

  // TOAST STATE
  const [toastMessage, setToastMessage] = useState('')
  const [showToast, setShowToast] = useState(false)

  const fetchTutors = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filters.subject) params.append('subject', filters.subject)
      if (filters.name) params.append('name', filters.name)
      if (filters.rating) params.append('min_rating', filters.rating)
      if (filters.price) params.append('max_price', filters.price)

      const url = `${API_URL}/tutors?${params.toString()}`
      const token = localStorage.getItem('auth_token')
      const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      const data = await res.json()
      if (res.ok) setTutors(data.tutors || [])
    } catch (err) {
      console.error('Tutor fetch failed', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const timer = setTimeout(fetchTutors, 400)
    return () => clearTimeout(timer)
  }, [filters])

  // ---------------- BOOK SESSION ----------------
  const bookSession = async () => {
    if (!selectedTutor || !selectedTutor.user || !bookingSubject || !bookingTime) {
      setToastMessage('Please fill all fields and ensure tutor has a valid account')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
      return
    }

    try {
      setBookingLoading(true)
      const token = localStorage.getItem('auth_token')

      const res = await fetch(`${API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          tutor_id: selectedTutor.user.id,
          subject: bookingSubject,
          scheduled_at: new Date(bookingTime).toISOString(),
          hourly_rate: selectedTutor.hourly_rate
        })
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.message)

      // SHOW SUCCESS TOAST INSTEAD OF ALERT
      setToastMessage('Session booked successfully')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)

      setShowBooking(false)
      setBookingSubject('')
      setBookingTime('')
    } catch (err) {
      console.error(err)
      setToastMessage('Booking failed')
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } finally {
      setBookingLoading(false)
    }
  }
  // -------------------------------------------------

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      {/* HEADER */}
      <header className='border-b bg-card'>
        <div className='max-w-7xl mx-auto px-6 py-6'>
          <Link href='/dashboard' className='text-primary text-sm'>
            ← Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold mt-2'>Find a Tutor</h1>
        </div>
      </header>

      {/* MAIN */}
      <main className='max-w-7xl mx-auto px-6 py-8'>
        {/* FILTERS */}
        <Card className='mb-8'>
          <CardContent className='grid md:grid-cols-4 gap-4 pt-6'>
            <Input placeholder='Subject/Course' onChange={(e) => setFilters({ ...filters, subject: e.target.value })} />
            <Input placeholder='Tutor name' onChange={(e) => setFilters({ ...filters, name: e.target.value })} />
            <Input type='number' placeholder='Min rating' onChange={(e) => setFilters({ ...filters, rating: e.target.value })} />
            <Input type='number' placeholder='Max price' onChange={(e) => setFilters({ ...filters, price: e.target.value })} />
          </CardContent>
        </Card>

        {/* TUTOR GRID */}
        {loading ? (
          <p className='text-center py-10'>Loading tutors...</p>
        ) : (
          <div className='grid md:grid-cols-2 lg:grid-cols-3 gap-6'>
            {tutors.map((tutor) => (
              <Card key={tutor.id}>
                <CardHeader>
                  <CardTitle className='flex justify-between'>
                    {tutor.user?.full_name || 'Tutor'}
                    {tutor.is_verified && (
                      <span className='text-xs bg-green-100 px-2 py-1 rounded'>Verified</span>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className='space-y-4'>
                  <div className='flex flex-wrap gap-2'>
                    {tutor.subjects.map((s) => (
                      <span key={s} className='text-xs bg-primary/10 text-primary px-2 py-1 rounded'>{s}</span>
                    ))}
                  </div>
                  <div className='grid grid-cols-2 text-sm'>
                    <p>⭐ {tutor.rating?.toFixed(1) ?? '0.0'}</p>
                    <p>{tutor.experience_years} yrs exp</p>
                    <p>KES {tutor.hourly_rate}/hr</p>
                    <p>{tutor.total_sessions} sessions</p>
                  </div>
                  <Button className='w-full' onClick={() => { setSelectedTutor(tutor); setShowBooking(true) }}>
                    Book Session
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* BOOKING MODAL */}
      {showBooking && selectedTutor && (
        <div className='fixed inset-0 bg-black/50 flex items-center justify-center'>
          <Card className='w-full max-w-md'>
            <CardHeader>
              <CardTitle>Book Session</CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <div>
                <p className='text-sm text-muted-foreground'>Tutor</p>
                <p className='font-semibold'>{selectedTutor.user?.full_name}</p>
              </div>
              <div>
                <Label>Date & Time</Label>
                <Input type='datetime-local' value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} />
              </div>
              <div>
                <Label>Subject</Label>
                <Input placeholder='Enter subject' value={bookingSubject} onChange={(e) => setBookingSubject(e.target.value)} />
              </div>
              <div className='flex gap-2 pt-2'>
                <Button variant='outline' className='flex-1' onClick={() => setShowBooking(false)}>Cancel</Button>
                <Button className='flex-1' onClick={bookSession} disabled={bookingLoading}>
                  {bookingLoading ? 'Booking...' : 'Confirm'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* TOAST */}
      <Toast message={toastMessage} isOpen={showToast} />
    </div>
  )
}

export default function SearchTutorsPage() {
  return (
    <ProtectedRoute requiredRole='student'>
      <SearchTutorsContent />
    </ProtectedRoute>
  )
}