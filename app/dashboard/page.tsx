'use client'

import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ThemeToggle } from "@/components/theme-toggle"

function DashboardContent() {
  const { user, logout } = useAuth()

  return (
    <div className='min-h-screen '>
      {/* Header */}
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex justify-between items-center'>
          <h1 className='text-3xl font-bold text-primary'>TutorConnect</h1>
          
          <div className='flex items-center gap-4'>
            <span className='text-foreground/70'>{user?.full_name}</span>

            <ThemeToggle />
            <Button
              onClick={logout}
              variant='outline'
              className='border-primary text-primary hover:bg-primary/10'>

              Sign Out
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12'>
        {user?.role === 'student' ? (
          <div className='space-y-8'>
            {/* Student Dashboard */}
            <div>
              <h2 className="text-2xl font-bold text-white !text-white mb-6 relative z-10">
                Welcome, {user?.full_name}!
              </h2>
              <div className='grid md:grid-cols-3 gap-6'>
                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>Find a Tutor</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>Search and connect with qualified tutors</p>
                    <Link href='/student/search-tutors'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        Browse Tutors
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>My Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>View and manage your tutoring sessions</p>
                    <Link href='/student/sessions'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        My Sessions
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>My Profile</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>Update your profile and preferences</p>
                    <Link href='/student/profile'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        Edit Profile
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        ) : (
          <div className='space-y-8'>
            {/* Tutor Dashboard */}
            <div>
              <h2 className='text-2xl font-bold text-foreground mb-6'>Welcome, {user?.full_name}!</h2>
              <div className='grid md:grid-cols-3 gap-6'>
                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>My Profile</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>Set up your tutor profile and availability</p>
                    <Link href='/tutor/profile'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        View Profile
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>Upcoming Sessions</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>Manage your scheduled sessions</p>
                    <Link href='/tutor/sessions'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        My Sessions
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className='border-border hover:shadow-lg transition-shadow'>
                  <CardHeader>
                    <CardTitle className='text-primary'>Earnings</CardTitle>
                  </CardHeader>
                  <CardContent className='space-y-4'>
                    <p className='text-foreground/70'>Track your earnings and payouts</p>
                    <Link href='/tutor/earnings'>
                      <Button className='w-full bg-primary hover:bg-primary/90'>
                        View Earnings
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default function Dashboard() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
