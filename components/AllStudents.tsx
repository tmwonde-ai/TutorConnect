'use client'

import React, { useEffect, useState } from 'react'
import axios from 'axios'
import Loader from '@/components/Loader'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { useAuth } from '@/lib/auth-context'

interface Student {
  id: number
  school_name?: string
  grade_level?: string
  user: {
    full_name: string
    email: string
  }
}

const AllStudents: React.FC = () => {
  const [students, setStudents] = useState<Student[]>([])
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const { token, isLoading: authLoading } = useAuth()
  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'

  const loadStudents = async (searchQuery = '') => {
    if (!token) return alert('No token found. Please login again.')

    setLoading(true)
    try {
      const res = await axios.get(`${API_URL}/admin/all-students`, {
        params: {
          search: searchQuery,
          page: 1,
          limit: 10
        },
        headers: { Authorization: `Bearer ${token}` },
      })

      setStudents(res.data.students || [])
    } catch (err: any) {
      console.error('Failed to fetch students:', err)
      alert(
        err.response?.status === 401
          ? 'Unauthorized. Please login again.'
          : 'Failed to fetch students'
      )
    } finally {
      setLoading(false)
    }
  }

  // 🔍 Debounced backend search
  useEffect(() => {
    const delay = setTimeout(() => {
      loadStudents(search)
    }, 300)

    return () => clearTimeout(delay)
  }, [search])

  useEffect(() => {
    if (token) loadStudents()
  }, [token])

  if (loading || authLoading) return <Loader />

  return (
    <Card className="border border-border">
      <CardHeader>
        <CardTitle>All Students ({students.length})</CardTitle>
      </CardHeader>

      <CardContent>
        {/* 🔍 Search Bar */}
        <div className="mb-4">
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>

        {students.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">
            No students found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-sm font-semibold">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">School</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold">Grade</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border">
                {students.map(student => (
                  <tr
                    key={student.id}
                    className="hover:bg-muted/30 transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium">
                      {student.user.full_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {student.user.email}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.school_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {student.grade_level || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AllStudents