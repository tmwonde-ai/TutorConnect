// adminApi.ts
import axios from "axios"

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "tutorconnect-production-1d62.up.railway.app/api"

/* -----------------------------
   Pending Tutors
-------------------------------- */

// Fetch pending tutors
export const fetchPendingTutors = async (token: string) => {
  const res = await axios.get(`${API_BASE}/admin/pending-tutors`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.tutors || []
}

// Approve a tutor
export const approveTutor = async (token: string, userId: number) => {
  const res = await axios.post(
    `${API_BASE}/admin/verify-tutor/${userId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

// Reject a tutor
export const rejectTutor = async (token: string, userId: number) => {
  const res = await axios.post(
    `${API_BASE}/admin/reject-tutor/${userId}`,
    {},
    { headers: { Authorization: `Bearer ${token}` } }
  )
  return res.data
}

/* -----------------------------
   All Tutors
-------------------------------- */

// Fetch all tutors
export const fetchAllTutors = async (token: string) => {
  const res = await axios.get(`${API_BASE}/tutors`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.tutors || []
}

/* -----------------------------
   Sessions
-------------------------------- */

// Fetch all sessions for admin
export const fetchSessions = async (token: string) => {
  const res = await axios.get(`${API_BASE}/admin/sessions`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.sessions || []
}

/* -----------------------------
   Payments
-------------------------------- */

// Fetch payments for a user
export const fetchPayments = async (token: string, userId: number) => {
  const res = await axios.get(`${API_BASE}/payments/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.payments || []
}

/* -----------------------------
   Reports
-------------------------------- */

// Fetch reports
export const fetchReports = async (token: string) => {
  const res = await axios.get(`${API_BASE}/reports`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  return res.data.reports || []
}