'use client'

import { useState, useEffect } from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import Link from 'next/link'

interface Earning {
  id: number
  session_id: number
  amount: number
  currency: string
  status: 'pending' | 'completed' | 'paid'
  date: string
  student_name: string
  subject: string
}

function TutorEarningsContent() {
  const [earnings, setEarnings] = useState<Earning[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadEarnings()
  }, [])

  const loadEarnings = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem('auth_token')
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/tutors/earnings`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        }
      )
      if (res.ok) {
        const data = await res.json()
        setEarnings(data.earnings || [])
      }
    } catch (error) {
      console.error('Failed to load earnings:', error)
    } finally {
      setLoading(false)
    }
  }

  const totalEarnings = earnings.reduce((sum, e) => sum + e.amount, 0)
  const pendingEarnings = earnings
    .filter(e => e.status === 'completed')
    .reduce((sum, e) => sum + e.amount, 0)

  const paidEarnings = earnings
    .filter(e => e.status === 'paid')
    .reduce((sum, e) => sum + e.amount, 0)

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/10 text-yellow-600'
      case 'completed':
        return 'bg-blue-500/10 text-blue-600'
      case 'paid':
        return 'bg-green-500/10 text-green-600'
      default:
        return 'bg-gray-500/10 text-gray-600'
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      
      {/* Header */}
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <Link href='/dashboard' className='text-primary hover:underline text-sm mb-4 block'>
            ← Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-primary'>Earnings</h1>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        {loading ? (
          <Card className='border-border'>
            <CardContent className='pt-12 pb-12 text-center'>
              <div className='inline-block'>
                <div className='w-12 h-12 border-4 border-primary border-t-primary/30 rounded-full animate-spin'></div>
              </div>
              <p className='mt-4 text-foreground/60'>Loading your earnings...</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className='grid md:grid-cols-3 gap-6 mb-8'>

              <Card className='border-border'>
                <CardHeader>
                  <CardTitle className='text-sm text-foreground/60'>Total Earnings</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-3xl font-bold text-primary'>
                    ZMW {totalEarnings.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className='border-border'>
                <CardHeader>
                  <CardTitle className='text-sm text-foreground/60'>Pending</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-3xl font-bold text-yellow-600'>
                    ZMW {pendingEarnings.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className='border-border'>
                <CardHeader>
                  <CardTitle className='text-sm text-foreground/60'>Paid Out</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className='text-3xl font-bold text-green-600'>
                    ZMW {paidEarnings.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

            </div>

            {/* Earnings Table */}
            <Card className='border-border'>
              <CardHeader className='flex justify-between items-center'>
                <CardTitle className='text-primary'>Transaction History</CardTitle>

                {pendingEarnings > 0 && (
                  <Button className='bg-primary hover:bg-primary/90'>
                    Withdraw Pending (ZMW {pendingEarnings.toLocaleString()})
                  </Button>
                )}

              </CardHeader>

              <CardContent>
                <div className='space-y-3'>
                  {earnings.length === 0 ? (
                    <p className='text-center text-foreground/60 py-8'>
                      No earnings yet
                    </p>
                  ) : (
                    earnings.map((earning) => (
                      <div
                        key={earning.id}
                        className='flex items-center justify-between p-4 bg-muted rounded-lg'
                      >
                        <div className='flex-1'>
                          <p className='font-semibold text-foreground'>
                            {earning.student_name}
                          </p>
                          <p className='text-sm text-foreground/60'>
                            {earning.subject} • {new Date(earning.date).toLocaleDateString()}
                          </p>
                        </div>

                        <div className='text-right'>
                          <p className='font-semibold text-foreground'>
                            ZMW {earning.amount.toLocaleString()}
                          </p>

                          <span
                            className={`inline-block px-3 py-1 rounded-full text-xs font-semibold capitalize ${getStatusColor(
                              earning.status
                            )}`}
                          >
                            {earning.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}

export default function TutorEarningsPage() {
  return (
    <ProtectedRoute requiredRole='tutor'>
      <TutorEarningsContent />
    </ProtectedRoute>
  )
}