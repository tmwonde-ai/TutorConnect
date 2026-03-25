'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Image as ImageIcon, Mic } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'
import { useSocket } from '@/lib/use-socket'

interface Message {
  id: string
  sender: string
  senderRole: 'tutor' | 'student'
  content: string
  timestamp: string
  type: 'text' | 'image' | 'audio'
  isTemp?: boolean
}

interface SessionChatProps {
  sessionId: string
  currentUserRole: 'tutor' | 'student'
  currentUserName: string
  currentUserId: string // <-- added user id to send to backend
}

export function SessionChat({
  sessionId,
  currentUserRole,
  currentUserName,
  currentUserId
}: SessionChatProps) {
  const { getAuthHeaders } = useAuth()
  const { emit, on, off, connected } = useSocket()
  const messagesRef = useRef<Message[]>([])

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  // ---- Safe timestamp ----
  const safeTime = (t: any) => {
    const d = new Date(t)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  // ---- URL helper ----
  const getMessageUrl = (content: string) => {
    if (content.startsWith('http')) return content
    if (content.startsWith('/')) return `${API_BASE.replace('/api', '')}${content}`
    return content
  }

  // ---- Format time ----
  const formatLocalTime = (timestamp: string) => {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // ---- WebSocket listeners setup ----
  useEffect(() => {
    if (!connected || !sessionId) return

    // Emit join session event with proper snake_case keys
    emit('join_session', { session_id: sessionId, user_id: currentUserId })

    // Listen for new messages via WebSocket
    const handleNewMessage = (msgData: any) => {
      const newMsg: Message = {
        id: msgData.id?.toString() ?? crypto.randomUUID(),
        sender: msgData.sender_name ?? msgData.sender ?? 'User',
        senderRole: (msgData.sender_role ?? 'student').toLowerCase() as 'tutor' | 'student',
        content: getMessageUrl(msgData.content),
        timestamp: msgData.timestamp ?? new Date().toISOString(),
        type: msgData.type ?? 'text'
      }

      setMessages(prev => {
        const updated = [...prev, newMsg].sort(
          (a, b) => safeTime(a.timestamp) - safeTime(b.timestamp)
        )
        messagesRef.current = updated
        return updated
      })
    }

    on('message_received', handleNewMessage)

    return () => {
      off('message_received', handleNewMessage)
    }
  }, [connected, sessionId, emit, on, off, currentUserId])

  // ---- Send text via WebSocket or API ----
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim() || !connected) return

    const headers = getAuthHeaders()
    if (!headers?.Authorization) return

    setIsSending(true)
    const messageContent = newMessage
    setNewMessage('')

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      sender: currentUserName,
      senderRole: currentUserRole,
      content: messageContent,
      timestamp: new Date().toISOString(),
      type: 'text',
      isTemp: true
    }

    setMessages(prev => {
      const updated = [...prev, tempMessage]
      messagesRef.current = updated
      return updated
    })

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          content: messageContent,
          type: 'text'
        })
      })

      if (!res.ok) throw new Error('Failed to send message')

      // Emit via WebSocket for real-time delivery with snake_case keys
      emit('send_message', {
        session_id: sessionId,
        content: messageContent,
        type: 'text',
        sender: currentUserName,
        sender_role: currentUserRole
      })
    } catch (error) {
      console.error(error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    } finally {
      setIsSending(false)
    }
  }

  // ---- Send file ----
  const handleSendFile = async (file: File, type: 'image' | 'audio') => {
    const headers = getAuthHeaders()
    if (!headers?.Authorization) return

    setIsSending(true)

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      sender: currentUserName,
      senderRole: currentUserRole,
      content: URL.createObjectURL(file),
      timestamp: new Date().toISOString(),
      type,
      isTemp: true
    }

    setMessages(prev => {
      const updated = [...prev, tempMessage]
      messagesRef.current = updated
      return updated
    })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('type', type)

      const res = await fetch(
        `${API_BASE}/sessions/${sessionId}/messages/file`,
        {
          method: 'POST',
          headers: { Authorization: headers.Authorization },
          body: formData
        }
      )

      if (!res.ok) throw new Error('Failed to send file')

      const data = await res.json()
      const fileUrl = getMessageUrl(data.file_url)

      setMessages(prev =>
        prev.map(m =>
          m.id === tempMessage.id
            ? { ...m, content: fileUrl, isTemp: false }
            : m
        )
      )

      // Emit via WebSocket with snake_case keys
      emit('send_message', {
        session_id: sessionId,
        content: fileUrl,
        type,
        sender: currentUserName,
        sender_role: currentUserRole
      })
    } catch (error) {
      console.error('File upload error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    } finally {
      setIsSending(false)
    }
  }

  // ---- Voice recording ----
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const recorder = new MediaRecorder(stream)
    const chunks: BlobPart[] = []

    recorder.ondataavailable = e => chunks.push(e.data)

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })
      const file = new File([blob], `voice_${Date.now()}.webm`, { type: 'audio/webm' })
      handleSendFile(file, 'audio')
    }

    recorder.start()
    setMediaRecorder(recorder)
    setIsRecording(true)
  }

  const stopRecording = () => {
    mediaRecorder?.stop()
    setIsRecording(false)
  }

  // ---- Render ----
  return (
    <>
      <Card className="border-border flex flex-col h-96">
        <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
          <CardTitle className="text-primary">Chat</CardTitle>
          <div className={`text-xs px-2 py-1 rounded-full ${connected ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
            {connected ? 'Connected' : 'Connecting...'}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-foreground/50">
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map(message => (
              <div
                key={message.id}
                className={`flex ${message.senderRole === currentUserRole ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs px-4 py-2 rounded-lg ${message.senderRole === currentUserRole ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary/50 text-foreground rounded-bl-none'}`}>
                  {message.senderRole !== currentUserRole && (
                    <p className="text-xs font-semibold text-primary mb-1">{message.sender}</p>
                  )}

                  {message.type === 'text' && <p className="text-sm break-words">{message.content}</p>}
                  {message.type === 'image' && <img src={message.content} alt="Shared" className="cursor-pointer max-h-48 rounded" onClick={() => setModalImage(message.content)} />}
                  {message.type === 'audio' && <audio controls className="w-full"><source src={message.content} type="audio/webm" /></audio>}

                  <p className="text-xs opacity-70 mt-1">{formatLocalTime(message.timestamp)}</p>
                </div>
              </div>
            ))
          )}
        </CardContent>

        <div className="border-t border-border p-4 flex flex-col gap-2">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <Input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder="Type a message..."
              disabled={isSending || !connected}
              className="flex-1 bg-input border-border"
            />

            <Button type="submit" disabled={isSending || !newMessage.trim() || !connected} size="sm" className="bg-primary hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="flex gap-3 items-center">
            <label className="cursor-pointer">
              <ImageIcon className="w-5 h-5 text-primary" />
              <input type="file" accept="image/*" className="hidden" disabled={isSending} onChange={e => e.target.files && handleSendFile(e.target.files[0], 'image')} />
            </label>

            <Button onClick={isRecording ? stopRecording : startRecording} size="sm" className="bg-secondary hover:bg-secondary/80">
              {isRecording ? 'Stop' : 'Record'}
              <Mic className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {modalImage && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer" onClick={() => setModalImage(null)}>
          <img src={modalImage} alt="Full View" className="max-h-[80%] max-w-[80%] rounded" />
        </div>
      )}
    </>
  )
}