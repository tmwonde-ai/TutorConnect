'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function TutorProfileContent() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [subjects, setSubjects] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState('')
  const [experience, setExperience] = useState('')
  const [bio, setBio] = useState('')

  // NEW: Stats state
  const [stats, setStats] = useState({
    sessions: 0,
    hours: 0,
    rating: 0
  })

  const [originalData, setOriginalData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    subjects: [] as string[],
    hourlyRate: '',
    experience: '',
    bio: ''
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.id) return
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/tutors/${user.id}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (res.ok) {
          const data = await res.json()

          setSubjects(data.subjects || [])
          setHourlyRate(String(data.hourly_rate || ''))
          setExperience(String(data.experience_years || ''))
          setBio(data.bio || '')
          setEmail(data.user?.email || '')
          setPhone(data.user?.phone || '')

          setOriginalData({
            fullName: user?.full_name || '',
            email: data.user?.email || '',
            phone: data.user?.phone || '',
            subjects: data.subjects || [],
            hourlyRate: String(data.hourly_rate || ''),
            experience: String(data.experience_years || ''),
            bio: data.bio || ''
          })
        }
      } catch (error) {
        console.error('Failed to load profile:', error)
      }
    }

    const loadStats = async () => {
      try {
        if (!user?.id) return
        const token = localStorage.getItem('auth_token')
        if (!token) return

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/tutors/stats`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (res.ok) {
          const data = await res.json()

          setStats({
            sessions: data.total_sessions || 0,
            hours: data.hours_taught || 0,
            rating: data.avg_rating || 0
          })
        }
      } catch (error) {
        console.error('Failed to load stats:', error)
      }
    }

    loadProfile()
    loadStats()
  }, [user?.id])

  const handleSave = async () => {
    setIsSaving(true)

    try {
      const token = localStorage.getItem('auth_token')
      if (!user?.id || !token) {
        alert('Missing user ID or authentication token')
        setIsSaving(false)
        return
      }

      const payload = {
        full_name: fullName,
        email,
        phone,
        subjects: subjects && subjects.length > 0 ? subjects : [],
        hourly_rate: hourlyRate ? parseFloat(hourlyRate) : 0,
        experience_years: experience ? parseInt(experience) : 0,
        bio: bio || ''
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/tutors/${user.id}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify(payload)
        }
      )

      if (res.ok) {
        setOriginalData({ fullName, email, phone, subjects, hourlyRate, experience, bio })
        setIsEditing(false)
        alert('Profile updated successfully!')
      } else {
        const errorData = await res.text()
        console.error('Save error response:', errorData)
        alert(`Failed to update profile: ${res.status}`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFullName(originalData.fullName)
    setEmail(originalData.email)
    setPhone(originalData.phone)
    setSubjects(originalData.subjects)
    setHourlyRate(originalData.hourlyRate)
    setExperience(originalData.experience)
    setBio(originalData.bio)
    setIsEditing(false)
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      {/* Header */}
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <Link href='/dashboard' className='text-primary hover:underline text-sm mb-4 block'>
            ← Back to Dashboard
          </Link>

          <div className='flex justify-between items-center gap-4'>
            <h1 className='text-3xl font-bold text-primary'>Tutor Profile</h1>

            <div className='flex gap-2'>
              {isEditing && (
                <Button onClick={handleCancel} variant='outline' className='border-border'>
                  Cancel
                </Button>
              )}

              <Button
                onClick={() => {
                  if (isEditing) handleSave()
                  else setIsEditing(true)
                }}
                disabled={isSaving}
                variant={isEditing ? 'default' : 'outline'}
                className={isEditing ? 'bg-primary hover:bg-primary/90' : 'border-primary text-primary'}
              >
                {isSaving ? 'Saving...' : isEditing ? 'Save' : 'Edit'}
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid lg:grid-cols-3 gap-8'>
          {/* Profile Card */}
          <Card className='border-border lg:col-span-2'>
            <CardHeader>
              <CardTitle className='text-primary'>Profile Information</CardTitle>
            </CardHeader>

            <CardContent className='space-y-6'>
              <div>
                <Label className='text-foreground font-medium'>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' placeholder='+260 9XXXXXXX' />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Bio</Label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  disabled={!isEditing}
                  className='w-full h-24 p-2 bg-input border border-border rounded text-foreground placeholder-foreground/40 resize-none mt-2'
                  placeholder='Tell students about yourself...'
                />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Years of Experience</Label>
                <Input type='number' value={experience} onChange={(e) => setExperience(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Hourly Rate (ZMW)</Label>
                <Input type='number' value={hourlyRate} onChange={(e) => setHourlyRate(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' />
              </div>

              <div>
                <Label className='text-foreground font-medium'>Subjects</Label>

                <div className='flex flex-wrap gap-2 mt-2'>
                  {subjects.map((subject) => (
                    <span key={subject} className='bg-primary/10 text-primary px-3 py-1 rounded-full text-sm flex items-center gap-2'>
                      {subject}
                      {isEditing && (
                        <button onClick={() => setSubjects(subjects.filter((s) => s !== subject))} className='hover:text-primary/70'>
                          ×
                        </button>
                      )}
                    </span>
                  ))}
                </div>

                {isEditing && (
                  <Input
                    placeholder='Add subject and press Enter'
                    onKeyPress={(e) => {
                      if (e.key === 'Enter' && e.currentTarget.value) {
                        setSubjects([...subjects, e.currentTarget.value])
                        e.currentTarget.value = ''
                      }
                    }}
                    className='bg-input border-border mt-2'
                  />
                )}
              </div>
            </CardContent>
          </Card>

          {/* Stats & Links */}
          <div className='space-y-6'>
            <Card className='border-border'>
              <CardHeader>
                <CardTitle className='text-primary'>Stats</CardTitle>
              </CardHeader>

              <CardContent className='space-y-4'>
                <div className='text-center'>
                  <p className='text-3xl font-bold text-primary'>{stats.sessions}</p>
                  <p className='text-sm text-foreground/60'>Total Sessions</p>
                </div>

                <div className='text-center pt-4 border-t border-border'>
                  <p className='text-3xl font-bold text-primary'>{stats.hours}</p>
                  <p className='text-sm text-foreground/60'>Hours Taught</p>
                </div>

                <div className='text-center pt-4 border-t border-border'>
                  <p className='text-3xl font-bold text-primary'>{stats.rating || '0.0'}</p>
                  <p className='text-sm text-foreground/60'>Avg Rating</p>
                </div>
              </CardContent>
            </Card>

            <Card className='border-border'>
              <CardHeader>
                <CardTitle className='text-primary'>Quick Links</CardTitle>
              </CardHeader>

              <CardContent className='space-y-2'>
                <Link href='/tutor/sessions'>
                  <Button variant='outline' className='w-full border-border justify-start'>
                    My Sessions
                  </Button>
                </Link>

                <Link href='/tutor/earnings'>
                  <Button variant='outline' className='w-full border-border justify-start'>
                    Earnings
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function TutorProfilePage() {
  return (
    <ProtectedRoute requiredRole='tutor'>
      <TutorProfileContent />
    </ProtectedRoute>
  )
}