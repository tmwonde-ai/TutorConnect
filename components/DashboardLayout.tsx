'use client'

import React, { ReactNode } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { LogOut, BarChart3, Users, Clock, DollarSign, FileText, AlertCircle } from 'lucide-react'

interface DashboardLayoutProps {
  children?: ReactNode
}

interface NavItem {
  label: string
  href: string
  icon: React.ReactNode
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const router = useRouter()
  const { logout } = useAuth()

  const handleLogout = () => {
    logout()
    router.push('/auth/login')
  }

  const navItems: NavItem[] = [
    {
      label: 'Pending Tutors',
      href: '/admin/dashboard',
      icon: <AlertCircle className="w-4 h-4" />
    },
    {
      label: 'All Tutors',
      href: '/admin/dashboard/tutors',
      icon: <Users className="w-4 h-4" />
    },
    {
      label: 'Sessions',
      href: '/admin/dashboard/sessions',
      icon: <Clock className="w-4 h-4" />
    },
    {
      label: 'Payments',
      href: '/admin/dashboard/payments',
      icon: <DollarSign className="w-4 h-4" />
    },
    {
      label: 'Reports',
      href: '/admin/dashboard/reports',
      icon: <FileText className="w-4 h-4" />
    }
  ]

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 bg-gradient-to-b from-primary to-secondary text-primary-foreground p-6 flex flex-col shadow-lg">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-accent flex items-center justify-center">
            <BarChart3 className="w-6 h-6 text-primary" />
          </div>
          <h2 className="text-2xl font-bold">Admin</h2>
        </div>

        <nav className="space-y-2 flex-1">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-white/10 transition-colors text-primary-foreground hover:text-primary-foreground group"
            >
              <span className="opacity-75 group-hover:opacity-100 transition-opacity">{item.icon}</span>
              <span className="font-medium">{item.label}</span>
            </Link>
          ))}
        </nav>

        {/* Logout button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full mt-auto flex items-center gap-2 border-primary-foreground/30 text-primary-foreground hover:bg-white/10"
        >
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/5 p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}

export default DashboardLayout
