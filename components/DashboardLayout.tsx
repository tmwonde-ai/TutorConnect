'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'

interface DashboardLayoutProps {
  children?: ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  return (
    <div className="flex min-h-screen bg-gray-50">
      
      {/* Sidebar */}
      <aside className="w-60 bg-gray-800 text-white p-6 flex flex-col">
        <h2 className="mb-6 text-xl font-bold">Admin Panel</h2>

        <ul className="space-y-3 flex-1">
          <li>
            <Link href="/admin/dashboard" className="hover:underline">
              Pending Tutors
            </Link>
          </li>

          <li>
            <Link href="/admin/dashboard/tutors" className="hover:underline">
              All Tutors
            </Link>
          </li>

          <li>
            <Link href="/admin/dashboard/sessions" className="hover:underline">
              Sessions
            </Link>
          </li>

          <li>
            <Link href="/admin/dashboard/payments" className="hover:underline">
              Payments
            </Link>
          </li>

          <li>
            <Link href="/admin/dashboard/reports" className="hover:underline">
              Reports
            </Link>
          </li>
        </ul>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="mt-6 bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white"
        >
          Logout
        </button>
      </aside>

      {/* Main content */}
      <main className="flex-1 p-6 overflow-auto">
        {children}
      </main>

    </div>
  )
}

export default DashboardLayout