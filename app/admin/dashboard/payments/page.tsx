'use client'

import React, { useEffect, useState } from 'react'
import Loader from '@/components/Loader'
import { fetchPayments } from '../../../api/adminApi'

interface Payment {
  id: number
  session_id: number
  amount: number
  currency: string
  status: string
  created_at: string
}

interface Props {
  token: string
}

const Payments: React.FC<Props> = ({ token }) => {
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)

  const loadPayments = async () => {
    if (!token) return alert('No token found. Please login again.')
    setLoading(true)
    try {
      const data = await fetchPayments(token, 1) // replace 1 with actual userId if needed
      setPayments(data || [])
    } catch (err: any) {
      console.error('Failed to fetch payments:', err)
      alert(
        err.response?.status === 401
          ? 'Unauthorized. Please login again.'
          : 'Failed to fetch payments'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (token) loadPayments()
  }, [token])

  if (loading) return <Loader />

  return (
    <div className="bg-white rounded-lg shadow p-4">
      <h2 className="text-xl font-bold mb-4">Payments</h2>
      {payments.length === 0 ? (
        <p>No payments found.</p>
      ) : (
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className={thStyle}>Session</th>
              <th className={thStyle}>Amount</th>
              <th className={thStyle}>Status</th>
              <th className={thStyle}>Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map(p => (
              <tr key={p.id} style={trStyle}>
                <td className={tdStyle}>{p.session_id}</td>
                <td className={tdStyle}>
                  {p.amount} {p.currency}
                </td>
                <td className={tdStyle}>{p.status}</td>
                <td className={tdStyle}>
                  {new Date(p.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

const thStyle = 'border-b border-gray-300 p-3 text-left'
const tdStyle = 'border-b border-gray-200 p-3'
const trStyle = { background: '#fafafa' }

export default Payments