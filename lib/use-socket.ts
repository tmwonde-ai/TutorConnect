import { useEffect, useRef, useCallback, useState } from 'react'
import io, { Socket } from 'socket.io-client'

interface UseSocketOptions {
  url?: string
  disabled?: boolean
}

export function useSocket(options: UseSocketOptions = {}) {
  const defaultUrl =
    process.env.NODE_ENV === 'development'
      ? 'http://localhost:5000'
      : process.env.NEXT_PUBLIC_SOCKET_URL

  const { url = defaultUrl, disabled = false } = options

  const socketRef = useRef<Socket | null>(null)
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    if (disabled) return
    if (!url) {
      console.error('[Socket] No URL provided')
      return
    }

    // ✅ Prevent duplicate sockets
    if (socketRef.current) return

    const socket = io(url, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000
    })

    socketRef.current = socket

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id)
      setConnected(true)
    })

    socket.on('disconnect', (reason) => {
      console.log('[Socket] Disconnected:', reason)
      setConnected(false)
    })

    socket.on('reconnect', (attempt) => {
      console.log('[Socket] Reconnected after', attempt, 'attempts')
    })

    socket.on('connect_error', (err) => {
      console.error('[Socket] Connection error:', err)
    })

    // ❌ Do NOT disconnect on unmount (important for app-wide socket)
    return () => {}
  }, [url, disabled])

  // ✅ Emit event
  const emit = useCallback((event: string, data: any) => {
    if (!socketRef.current) {
      console.warn('[Socket] Emit failed, no socket')
      return
    }
    socketRef.current.emit(event, data)
  }, [])

  // ✅ Listen to event
  const on = useCallback((event: string, callback: (data: any) => void) => {
    socketRef.current?.on(event, callback)
  }, [])

  // ✅ Remove listener
  const off = useCallback((event: string, callback?: (data: any) => void) => {
    socketRef.current?.off(event, callback)
  }, [])

  // ✅ NEW: Listen specifically for connect (CRITICAL)
  const onConnect = useCallback((callback: () => void) => {
    socketRef.current?.on('connect', callback)
  }, [])

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    onConnect, // ⭐ THIS is the key fix
    connected
  }
}