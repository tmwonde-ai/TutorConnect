'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function RegisterPage() {
  const router = useRouter()
  const { register, isLoading } = useAuth()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [role, setRole] = useState<'student' | 'tutor'>('student')
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    try {
      await register(email, password, fullName, role)
      router.push(role === 'tutor' ? '/tutor/profile' : '/dashboard')
    } catch (err) {
      setError('Registration failed. Email may already be in use.')
    }
  }

  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted flex items-center justify-center p-4'>
      <Card className='w-full max-w-md border-border'>
        <CardHeader className='text-center'>
          <CardTitle className='text-3xl font-bold text-primary'>Create Account</CardTitle>
          <CardDescription>Join as a student or tutor</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className='space-y-5'>
            {error && (
              <div className='bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm'>
                {error}
              </div>
            )}

            <div className='space-y-2'>
              <Label className='text-foreground font-medium'>Account Type</Label>
              <div className='flex gap-4'>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='role'
                    value='student'
                    checked={role === 'student'}
                    onChange={(e) => setRole(e.target.value as 'student' | 'tutor')}
                    className='accent-primary'
                  />
                  <span className='text-foreground'>Student</span>
                </label>
                <label className='flex items-center gap-2 cursor-pointer'>
                  <input
                    type='radio'
                    name='role'
                    value='tutor'
                    checked={role === 'tutor'}
                    onChange={(e) => setRole(e.target.value as 'student' | 'tutor')}
                    className='accent-primary'
                  />
                  <span className='text-foreground'>Tutor</span>
                </label>
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='fullName' className='text-foreground font-medium'>
                Full Name
              </Label>
              <Input
                id='fullName'
                placeholder='John Doe'
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className='bg-input border-border'
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='email' className='text-foreground font-medium'>
                Email Address
              </Label>
              <Input
                id='email'
                type='email'
                placeholder='you@example.com'
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

            <div className='space-y-2'>
              <Label htmlFor='confirmPassword' className='text-foreground font-medium'>
                Confirm Password
              </Label>
              <Input
                id='confirmPassword'
                type='password'
                placeholder='••••••••'
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className='bg-input border-border'
              />
            </div>

            <Button
              type='submit'
              disabled={isLoading}
              className='w-full bg-primary hover:bg-primary/90 text-primary-foreground font-semibold'
            >
              {isLoading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <div className='text-center text-sm text-foreground/60'>
              Already have an account?{' '}
              <Link href='/auth/login' className='text-primary hover:underline font-semibold'>
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
