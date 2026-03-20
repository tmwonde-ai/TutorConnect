'use client'

import { useAuth } from '@/lib/auth-context'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export function ProtectedRoute({
  children,
  requiredRole,
}: {
  children: React.ReactNode
  requiredRole?: 'tutor' | 'student' | 'admin'
}) {
  const router = useRouter()
  const { isAuthenticated, isLoading, user } = useAuth()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/auth/login')
    } else if (!isLoading && requiredRole && user?.role !== requiredRole) {
      router.push('/dashboard')
    }
  }, [isLoading, isAuthenticated, requiredRole, user, router])

  if (isLoading) {
    return (
      <div className='flex items-center justify-center min-h-screen bg-background'>
        <div className='text-center'>
          <div className='w-12 h-12 border-4 border-primary border-t-primary/30 rounded-full animate-spin mx-auto'></div>
          <p className='mt-4 text-foreground/60'>Loading...</p>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  if (requiredRole && user?.role !== requiredRole) {
    return null
  }

  return <>{children}</>
}
