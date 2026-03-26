'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface StudentProfile {
  full_name: string
  email: string
  phone: string
  school_name: string
  grade_level: string
  learning_goals: string
}

export default function StudentProfileView() {
  const params = useParams()
  const studentId = params.id

  const [student, setStudent] = useState<StudentProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadStudent = async () => {
      try {
        const token = localStorage.getItem('auth_token')

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/students/${studentId}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        )

        if (res.ok) {
          const data = await res.json()
          setStudent(data)
        }
      } catch (error) {
        console.error('Failed to load student:', error)
      } finally {
        setLoading(false)
      }
    }

    loadStudent()
  }, [studentId])

  if (loading) return <p className="p-10">Loading student profile...</p>

  if (!student) return <p className="p-10">Student not found</p>

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted">

      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/tutor/sessions">
            <Button variant="outline">← Back to Sessions</Button>
          </Link>
          <h1 className="text-xl font-semibold text-primary">Student Profile</h1>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-2xl">{student.full_name}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-8">

            {/* Contact Info */}
            <div className="grid md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-semibold">{student.email}</p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Phone Number</p>
                <p className="font-semibold">
                  {student.phone || 'Not provided'}
                </p>
              </div>

            </div>

            {/* Academic Info */}
            <div className="grid md:grid-cols-2 gap-6">

              <div>
                <p className="text-sm text-muted-foreground">School / University</p>
                <p className="font-semibold">
                  {student.school_name || 'Not provided'}
                </p>
              </div>

              <div>
                <p className="text-sm text-muted-foreground">Grade / Year</p>
                <p className="font-semibold">
                  {student.grade_level || 'Not provided'}
                </p>
              </div>

            </div>

            {/* Learning Goals */}
            <div>
              <p className="text-sm text-muted-foreground">Learning Goals</p>
              <p className="mt-2">
                {student.learning_goals || 'Not provided'}
              </p>
            </div>

          </CardContent>
        </Card>

      </main>
    </div>
  )
}