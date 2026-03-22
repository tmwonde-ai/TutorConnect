'use client'

import { ProtectedRoute } from '@/components/protected-route'
import DashboardLayout from '@/components/DashboardLayout'
import PendingTutors from '@/components/PendingTutors'
import AllTutors from '@/components/AllTutors'
import { useAuth } from '@/lib/auth-context'

export default function AdminDashboardPage() {
  const { token, isLoading: authLoading } = useAuth()

  // Wait for auth to finish initializing
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex justify-center items-center min-h-screen">
          <p>Loading authentication...</p>
        </div>
      </DashboardLayout>
    )
  }

  // If not logged in, don't render children (ProtectedRoute handles redirect)
  if (!token) {
    return null
  }

  return (
    <ProtectedRoute requiredRole="admin">
      <DashboardLayout>
        <h1 className="text-2xl font-bold mb-4">Admin Dashboard</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Children will only fetch once token is available */}
          <PendingTutors />
          <AllTutors />
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}