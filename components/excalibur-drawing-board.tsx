'use client'

import { useRef, useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Send } from 'lucide-react'
import '@excalidraw/excalidraw/index.css'
import { useAuth } from '@/lib/auth-context'

const API_BASE = process.env.NEXT_PUBLIC_API_URL

// Dynamically import Excalidraw (no SSR)
const Excalidraw = dynamic(
  async () => (await import('@excalidraw/excalidraw')).Excalidraw,
  { ssr: false }
)

interface Props {
  isTutor?: boolean
  onSendSnapshot: (snapshot: string) => void
  snapshot?: string
}

export function ExcaliburnDrawingBoard({ isTutor = false, onSendSnapshot, snapshot }: Props) {
  const { getAuthHeaders } = useAuth()
  const excalidrawRef = useRef<any>(null)
  const [isSendingSnapshot, setIsSendingSnapshot] = useState(false)
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => setIsMounted(true), [])

  // =================== LOAD SNAPSHOT ===================
  useEffect(() => {
    if (!snapshot || !excalidrawRef.current) return
    try {
      const parsed = JSON.parse(snapshot)
      const { elements, appState, files } = parsed
      const safeAppState = { ...(appState || {}), collaborators: new Map() }
      excalidrawRef.current.updateScene({
        elements: elements || [],
        appState: safeAppState,
        files: files || {}
      })
    } catch (e) {
      console.error('Failed to load snapshot:', e)
    }
  }, [snapshot])

  // =================== CAPTURE SNAPSHOT ===================
  const captureSnapshot = async () => {
    if (!excalidrawRef.current) return null
    try {
      const elements = excalidrawRef.current.getSceneElements()
      const appState = excalidrawRef.current.getAppState()
      const files = excalidrawRef.current.getFiles()
      const { collaborators, ...safeAppState } = appState

      return JSON.stringify({
        elements,
        appState: safeAppState,
        files
      })
    } catch (e) {
      console.error('Snapshot capture error:', e)
      return null
    }
  }

  // =================== SEND SNAPSHOT ===================
  const handleSendSnapshot = async () => {
    setIsSendingSnapshot(true)
    try {
      const snapshotStr = await captureSnapshot()
      if (!snapshotStr) return
      onSendSnapshot(snapshotStr)
    } catch (e: any) {
      console.error('Send snapshot failed:', e.message)
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
          disabled={isSendingSnapshot}
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