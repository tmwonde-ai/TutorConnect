'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

interface PaymentModalProps {
  isOpen: boolean
  onClose: () => void
  sessionId: number
  amount: number
  tutorName: string
  onSuccess?: () => void
}

export function PaymentModal({
  isOpen,
  onClose,
  sessionId,
  amount,
  tutorName,
  onSuccess,
}: PaymentModalProps) {
  const [paymentMethod, setPaymentMethod] = useState('airtel_money')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState('')

  const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  const handlePayment = async () => {
    setError('')
    setIsProcessing(true)

    try {
      const token = localStorage.getItem('auth_token')

      // Initiate payment
      const response = await fetch(`${API_URL}/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: sessionId,
          payment_method: paymentMethod,
          phone_number: phoneNumber,
        }),
      })

      if (!response.ok) {
        throw new Error('Payment initiation failed')
      }

      const data = await response.json()
      
      // In a real implementation, this would redirect to Airtel Money or show a payment UI
      // For now, simulate a successful payment
      setTimeout(() => {
        onSuccess?.()
        onClose()
      }, 1000)
    } catch (err) {
      setError('Payment failed. Please try again.')
      console.error('Payment error:', err)
    } finally {
      setIsProcessing(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className='fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50'>
      <Card className='w-full max-w-md border-border'>
        <CardHeader>
          <CardTitle className='text-primary'>Payment</CardTitle>
        </CardHeader>
        <CardContent className='space-y-6'>
          {/* Summary */}
          <div className='bg-muted p-4 rounded-lg'>
            <div className='flex justify-between mb-2'>
              <span className='text-foreground/60'>Tutor</span>
              <span className='font-semibold text-foreground'>{tutorName}</span>
            </div>
            <div className='flex justify-between'>
              <span className='text-foreground/60'>Amount</span>
              <span className='font-semibold text-foreground'>KES {amount.toLocaleString()}</span>
            </div>
          </div>

          {error && (
            <div className='bg-destructive/10 border border-destructive text-destructive px-4 py-3 rounded-lg text-sm'>
              {error}
            </div>
          )}

          {/* Payment Method */}
          <div className='space-y-2'>
            <Label className='text-foreground font-medium'>Payment Method</Label>
            <div className='space-y-2'>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='method'
                  value='airtel_money'
                  checked={paymentMethod === 'airtel_money'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className='accent-primary'
                />
                <span className='text-foreground'>Airtel Money</span>
              </label>
              <label className='flex items-center gap-2 cursor-pointer'>
                <input
                  type='radio'
                  name='method'
                  value='card'
                  checked={paymentMethod === 'card'}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className='accent-primary'
                />
                <span className='text-foreground'>Card Payment</span>
              </label>
            </div>
          </div>

          {/* Phone Number */}
          {paymentMethod === 'airtel_money' && (
            <div className='space-y-2'>
              <Label htmlFor='phone' className='text-foreground font-medium'>
                Phone Number
              </Label>
              <Input
                id='phone'
                placeholder='254712345678'
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className='bg-input border-border'
              />
              <p className='text-xs text-foreground/60'>Enter your Airtel Money registered number</p>
            </div>
          )}

          {/* Actions */}
          <div className='flex gap-2 pt-4'>
            <Button
              onClick={onClose}
              variant='outline'
              className='flex-1 border-border'
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePayment}
              disabled={isProcessing || (paymentMethod === 'airtel_money' && !phoneNumber)}
              className='flex-1 bg-primary hover:bg-primary/90'
            >
              {isProcessing ? 'Processing...' : `Pay KES ${amount.toLocaleString()}`}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
