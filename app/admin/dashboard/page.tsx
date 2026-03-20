'use client'

import React from 'react'
import { ProtectedRoute } from '@/components/protected-route'
import DashboardLayout from '@/components/DashboardLayout'
import PendingTutors from '@/components/PendingTutors'
import AllTutors from '@/components/AllTutors'
import { useAuth } from '@/lib/auth-context'

export default function AdminDashboardPage() {
  const { token, isLoading: authLoading } = useAuth() // ✅ use auth-context token

  // While token is loading or not available, show a loader
  if (authLoading || !token) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <p>Loading...</p>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <PendingTutors /> {/* ✅ token comes from auth-context inside component */}
          <AllTutors />     {/* ✅ token comes from auth-context inside component */}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}