'use client'

import React, { useEffect, useState } from 'react'
import Loader from '@/components/Loader'
import { useAuth } from '@/lib/auth-context'
import { fetchPayments } from "../../../api/adminApi"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { DollarSign } from 'lucide-react'

interface Payment {
  id: number
  session_id: number
  amount: number
  currency: string
  status: string
  created_at: string
}

const Payments: React.FC = () => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const { token, isLoading: authLoading } = useAuth()

  const loadPayments = async () => {
    if (!token) return alert('No token found. Please login again.')
    setLoading(true)
    try {
      const data = await fetchPayments(token, 1)
      setPayments(data || [])
    } catch (err: any) {
      console.error('Failed to fetch payments:', err)
      alert(err.response?.status === 401 ? 'Unauthorized. Please login again.' : 'Failed to fetch payments')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadPayments()
  }, [token])

  if (loading || authLoading) return <Loader />

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
      case 'success':
        return 'bg-green-100 text-green-700'
      case 'pending':
        return 'bg-yellow-100 text-yellow-700'
      case 'failed':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const totalAmount = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <DollarSign className="w-6 h-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground">Payments</h1>
          <p className="text-muted-foreground">Manage payment transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Total Payments</p>
            <p className="text-2xl font-bold text-primary">${totalAmount.toFixed(2)}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Transactions</p>
            <p className="text-2xl font-bold text-primary">{payments.length}</p>
          </CardContent>
        </Card>
        <Card className="border border-border">
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground mb-1">Average</p>
            <p className="text-2xl font-bold text-primary">${(totalAmount / payments.length || 0).toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border border-border">
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No payments found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Session ID</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Amount</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Status</th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-foreground">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {payments.map(p => (
                    <tr key={p.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium">#{p.session_id}</td>
                      <td className="px-4 py-3 text-sm font-medium">{p.amount} {p.currency}</td>
                      <td className="px-4 py-3 text-sm">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(p.status)}`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{new Date(p.created_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default Payments
