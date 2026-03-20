'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function LoginPage() {
  const router = useRouter()
  const { login, isLoading } = useAuth()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const [adminMode, setAdminMode] = useState(false)
  const [clickCount, setClickCount] = useState(0)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    try {
      await login(email, password)

      // ✅ small delay to ensure localStorage is updated
      setTimeout(() => {
        const storedUser = localStorage.getItem('auth_user')

        if (storedUser) {
          const user = JSON.parse(storedUser)

          if (user.role === 'admin') {
            router.push('/admin/dashboard')
          } else {
            router.push('/dashboard')
          }
        } else {
          router.push('/dashboard')
        }
      }, 100)

    } catch (err) {
      setError(adminMode ? 'Invalid admin credentials' : 'Invalid email or password')
    }
  }

  const handleLogoClick = () => {
    setClickCount(prev => prev + 1)
    if (clickCount + 1 >= 13) {
      setAdminMode(true)
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4'>
      <Card className='w-full max-w-md border-border'>
        <CardHeader className='text-center'>
          <CardTitle
            className='text-3xl font-bold text-primary'
            onClick={handleLogoClick}
          >
            Sign In
          </CardTitle>
          <CardDescription>
            {adminMode ? 'Admin Access' : 'Access your tutoring account'}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className='space-y-6'>

            {error && (
              <div className='bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm'>
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label htmlFor='email' className='text-foreground font-medium'>
                {adminMode ? 'Admin Email' : 'Email Address'}
              </Label>
              <Input
                id='email'
                type='email'
                placeholder={adminMode ? 'admin@example.com' : 'you@example.com'}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className='bg-input border-border'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='password' className='text-foreground font-medium'>
                Password
              </Label>
              <Input
                id='password'
                type='password'
                placeholder='••••••••'
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className='bg-input border-border'
              />
            </div>

            <Button
              type='submit'
              disabled={isLoading}
              className='w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
            >
              {isLoading ? 'Signing in...' : adminMode ? 'Admin Sign In' : 'Sign In'}
            </Button>

            {!adminMode && (
              <div className='text-center text-sm text-foreground/60'>
                Don't have an account?{' '}
                <Link href='/auth/register' className='text-primary hover:underline font-semibold'>
                  Create one
                </Link>
              </div>
            )}

          </form>
        </CardContent>
      </Card>
    </div>
  )
}