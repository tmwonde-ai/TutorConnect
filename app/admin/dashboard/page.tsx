'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import DashboardLayout from '@/components/DashboardLayout'
import PendingTutors from '@/components/PendingTutors'
import AllTutors from '@/components/AllTutors'
import AllStudents from '@/components/AllStudents'
import { useAuth } from '@/lib/auth-context'
import Loader from '@/components/Loader'

export default function AdminDashboardPage() {
  const { token, isLoading: authLoading } = useAuth()

  if (authLoading || !token) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <Loader />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Manage tutors, students, sessions, payments, and reports
            </p>
          </div>

          {/* Tutors Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <PendingTutors />
            <AllTutors />
          </div>

          {/* Students Section */}
          <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
            <AllStudents />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}