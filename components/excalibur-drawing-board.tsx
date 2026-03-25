'use client'

import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send } from 'lucide-react'
import io from 'socket.io-client'
import '@excalidraw/excalidraw/index.css'

// ✅ Dynamically import Excalidraw (NO SSR)
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
)

// ✅ Singleton socket instance
let socket: any
if (typeof window !== 'undefined' && !socket) {
  socket = io('http://localhost:5000', { transports: ['websocket', 'polling'] })
}

interface Props {
  sessionId: number
  userId: number
  isTutor?: boolean
}

export function ExcaliburnDrawingBoard({ sessionId, userId, isTutor = false }: Props) {
  const excalidrawRef = useRef<any>(null)
  const [isSendingSnapshot, setIsSendingSnapshot] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // ✅ Join session
  useEffect(() => {
    if (!sessionId || !userId) return

    socket.emit('join_session', {
      session_id: sessionId,
      user_id: userId
    })

    return () => {
      socket.emit('leave_session', {
        session_id: sessionId,
        user_id: userId
      })
    }
  }, [sessionId, userId])

  // ✅ Listen for snapshots (FIX HERE)
  useEffect(() => {
    const handler = (data: { snapshot: string; user_id: number }) => {
      if (!data?.snapshot || !excalidrawRef.current) return
      if (data.user_id === userId) return

      try {
        const parsed = JSON.parse(data.snapshot)
        const { elements, appState } = parsed

        // ✅ FIX: sanitize appState
        const safeAppState = {
          ...(appState || {}),
          collaborators: new Map() // 🔥 CRITICAL FIX
        }

        excalidrawRef.current.updateScene({
          elements: elements || [],
          appState: safeAppState
        })
      } catch (e) {
        console.error('Failed to apply snapshot:', e)
      }
    }

    socket.on('new_snapshot', handler)
    return () => socket.off('new_snapshot', handler)
  }, [userId])

  // ✅ Capture scene (also fix here)
  const captureSnapshot = async () => {
    if (!excalidrawRef.current) return null

    try {
      const elements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()

      // ❌ REMOVE collaborators before sending
      const { collaborators, ...safeAppState } = appState

      return JSON.stringify({ elements, appState: safeAppState })
    } catch (e) {
      console.error('Snapshot error:', e)
      return null
    }
  }

  // ✅ Send snapshot
  const handleSendSnapshot = async () => {
    if (!sessionId || !userId) return

    setIsSendingSnapshot(true)

    try {
      const snapshot = await captureSnapshot()
      if (!snapshot) return

      await fetch(`http://localhost:5000/api/sessions/${sessionId}/snapshot`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ snapshot, user_id: userId })
      })
    } catch (e) {
      console.error('Send failed:', e)
    } finally {
      setIsSendingSnapshot(false)
    }
  }

  if (!isMounted) return null

  return (
    <Card className="w-full h-full border border-border overflow-hidden flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/50">
        <h3 className="font-semibold text-foreground">
          {isTutor ? 'Tutor Drawing Board' : 'Student Drawing Board'}
        </h3>

        <Button
          onClick={handleSendSnapshot}
          disabled={isSendingSnapshot || !sessionId || !userId}
          size="sm"
          className="gap-2 bg-primary hover:bg-primary/90"
        >
          <Send className="w-4 h-4" />
          Send
        </Button>
      </div>

      <div className="flex-1 overflow-hidden">
        <Excalidraw
          excalidrawAPI={(api) => (excalidrawRef.current = api)}
          UIOptions={{
            canvasMenu: {
              defaultItems: ['clearReset'],
            },
          }}
        />
      </div>
    </Card>
  )
}