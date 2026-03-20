'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/protected-route'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import Link from 'next/link'

function StudentProfileContent() {
  const { user } = useAuth()
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [fullName, setFullName] = useState(user?.full_name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [schoolName, setSchoolName] = useState('')
  const [gradeLevel, setGradeLevel] = useState('')
  const [learningGoals, setLearningGoals] = useState('')

  const [totalSessions, setTotalSessions] = useState(0)
  const [hoursLearned, setHoursLearned] = useState(0)

  const [originalData, setOriginalData] = useState({
    fullName: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    schoolName: '',
    gradeLevel: '',
    learningGoals: ''
  })

  useEffect(() => {
    const loadProfile = async () => {
      try {
        if (!user?.id) return
        const token = localStorage.getItem('auth_token')
        if (!token) return

        // Load student profile
        const resProfile = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/students/${user.id}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (resProfile.ok) {
          const data = await resProfile.json()
          setSchoolName(data.school_name || '')
          setGradeLevel(data.grade_level || '')
          setLearningGoals(data.learning_goals || '')
          setEmail(data.email || user?.email || '')
          setPhone(data.phone || user?.phone || '')

          setOriginalData({
            fullName: user?.full_name || '',
            email: data.email || user?.email || '',
            phone: data.phone || user?.phone || '',
            schoolName: data.school_name || '',
            gradeLevel: data.grade_level || '',
            learningGoals: data.learning_goals || ''
          })
        }

        // Load sessions for learning progress
        const resSessions = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/sessions`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        if (resSessions.ok) {
          const sessionsData = await resSessions.json()
          const sessions = sessionsData.sessions || []

          const completedSessions = sessions.filter(s => s.status === 'completed')
          setTotalSessions(completedSessions.length)

          const totalMinutes = completedSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
          setHoursLearned(Math.floor(totalMinutes / 60))
        }
      } catch (error) {
        console.error('Failed to load profile or sessions:', error)
      }
    }

    loadProfile()
  }, [user?.id])

  const handleSave = async () => {
    setIsSaving(true)
    try {
      const token = localStorage.getItem('auth_token')
      if (!user?.id || !token) return

      const payload = {
        full_name: fullName,
        email,
        phone,
        school_name: schoolName,
        grade_level: gradeLevel,
        learning_goals: learningGoals
      }

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/api/students/${user.id}`,
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
        setOriginalData({ fullName, email, phone, schoolName, gradeLevel, learningGoals })
        setIsEditing(false)
        alert('Profile updated successfully!')
      } else {
        const errorData = await res.text()
        console.error('Save error response:', errorData)
        alert(`Failed to update profile: ${res.status}`)
      }
    } catch (error) {
      console.error('Error saving profile:', error)
      alert('Error saving profile')
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFullName(originalData.fullName)
    setEmail(originalData.email)
    setPhone(originalData.phone)
    setSchoolName(originalData.schoolName)
    setGradeLevel(originalData.gradeLevel)
    setLearningGoals(originalData.learningGoals)
    setIsEditing(false)
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      <header className='border-b border-border bg-card'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6'>
          <Link href='/dashboard' className='text-primary hover:underline text-sm mb-4 block'>
            ← Back to Dashboard
          </Link>
          <div className='flex justify-between items-center gap-4'>
            <h1 className='text-3xl font-bold text-primary'>Student Profile</h1>
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

      <main className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8'>
        <div className='grid lg:grid-cols-3 gap-8'>
          {/* Profile Card */}
          <Card className='border-border lg:col-span-2'>
            <CardHeader>
              <CardTitle className='text-primary'>Profile Information</CardTitle>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Full Name */}
              <div>
                <Label className='text-foreground font-medium'>Full Name</Label>
                <Input value={fullName} onChange={(e) => setFullName(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2'/>
              </div>
              {/* Email */}
              <div>
                <Label className='text-foreground font-medium'>Email</Label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2'/>
              </div>
              {/* Phone */}
              <div>
                <Label className='text-foreground font-medium'>Phone</Label>
                <Input value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' placeholder='+260 9XXXXXXX'/>
              </div>
              {/* School Name */}
              <div>
                <Label className='text-foreground font-medium'>School Name</Label>
                <Input value={schoolName} onChange={(e) => setSchoolName(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' placeholder='Your school name'/>
              </div>
              {/* Grade Level */}
              <div>
                <Label className='text-foreground font-medium'>Grade Level</Label>
                <Input value={gradeLevel} onChange={(e) => setGradeLevel(e.target.value)} disabled={!isEditing} className='bg-input border-border mt-2' placeholder='e.g., Grade 10'/>
              </div>
              {/* Learning Goals */}
              <div>
                <Label className='text-foreground font-medium'>Learning Goals</Label>
                <textarea value={learningGoals} onChange={(e) => setLearningGoals(e.target.value)} disabled={!isEditing} className='w-full h-24 p-2 bg-input border border-border rounded text-foreground placeholder-foreground/40 resize-none mt-2' placeholder='What do you want to learn?'/>
              </div>
            </CardContent>
          </Card>

          {/* Stats & Links */}
          <div className='space-y-6'>
            <Card className='border-border'>
              <CardHeader>
                <CardTitle className='text-primary'>Learning Progress</CardTitle>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='text-center'>
                  <p className='text-3xl font-bold text-primary'>{totalSessions}</p>
                  <p className='text-sm text-foreground/60'>Total Sessions</p>
                </div>
                <div className='text-center pt-4 border-t border-border'>
                  <p className='text-3xl font-bold text-primary'>{hoursLearned}</p>
                  <p className='text-sm text-foreground/60'>Hours Learned</p>
                </div>
              </CardContent>
            </Card>

            <Card className='border-border'>
              <CardHeader>
                <CardTitle className='text-primary'>Quick Links</CardTitle>
              </CardHeader>
              <CardContent className='space-y-2'>
                <Link href='/student/search-tutors'>
                  <Button variant='outline' className='w-full border-border justify-start'>Find a Tutor</Button>
                </Link>
                <Link href='/student/sessions'>
                  <Button variant='outline' className='w-full border-border justify-start'>My Sessions</Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function StudentProfilePage() {
  return (
    <ProtectedRoute requiredRole='student'>
      <StudentProfileContent />
    </ProtectedRoute>
  )
}