import { useEffect, useRef, useCallback, useState } from 'react'
import io, { Socket } from 'socket.io-client'

interface UseSocketOptions {
  url?: string
  disabled?: boolean
}

export function useSocket(options: UseSocketOptions = {}) {
  // Dynamically set the URL based on environment
const defaultUrl =
  process.env.NODE_ENV === 'development'
    ? 'http://localhost:5000' // local dev
    : process.env.NEXT_PUBLIC_SOCKET_URL // production // production: same host

  const { url = defaultUrl, disabled = false } = options
  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (disabled) return

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected')
      setConnected(false)
    })

    return () => {
      socket.disconnect()
    }
  }, [url, disabled])

  const emit = useCallback((event: string, data: any) => {
    socketRef.current?.emit(event, data)
  }, [])

  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback)
  }, [])

  const off = useCallback((event: string, callback?: (data: any) => void) => {
    socketRef.current?.off(event, callback)
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    connected
  }
}