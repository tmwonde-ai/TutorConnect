'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send, Image as ImageIcon, Mic } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

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
}

export function SessionChat({
  sessionId,
  currentUserRole,
  currentUserName
}: SessionChatProps) {
  const { getAuthHeaders } = useAuth()

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [modalImage, setModalImage] = useState<string | null>(null)
  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  const [isInitialLoad, setIsInitialLoad] = useState(true) // To avoid beeping on first fetch

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  // ---------------- SAFE TIMESTAMP ----------------
  const safeTime = (t: any) => {
    const d = new Date(t)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  // ---------------- URL HELPER ----------------
  const getMessageUrl = (content: string) => {
    if (content.startsWith('http')) return content
    if (content.startsWith('/')) return `${API_BASE.replace('/api', '')}${content}`
    return content
  }

  // ---------------- FORMAT TIME ----------------
  const formatLocalTime = (timestamp: string) => {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // ---------------- PLAY BEEP ----------------
  const playBeep = () => {
    const context = new AudioContext()
    const oscillator = context.createOscillator()
    oscillator.type = 'sine'
    oscillator.frequency.setValueAtTime(440, context.currentTime) // 440Hz
    oscillator.connect(context.destination)
    oscillator.start()
    oscillator.stop(context.currentTime + 0.1) // 0.1s beep
  }

  // ---------------- FETCH MESSAGES ----------------
  const fetchMessages = async () => {
    try {
      const headers = getAuthHeaders()
      if (!headers?.Authorization) return

      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      })

      if (!res.ok) return

      const data = await res.json()

      const serverMessages: Message[] = Array.isArray(data.messages)
        ? data.messages.map((msg: any) => ({
            id: msg.id?.toString() ?? crypto.randomUUID(),
            sender: msg.sender_name ?? msg.sender ?? 'User',
            senderRole: (msg.sender_role ?? 'student').toLowerCase() as
              | 'tutor'
              | 'student',
            content: getMessageUrl(msg.content),
            timestamp: msg.timestamp ?? new Date().toISOString(),
            type: msg.type ?? 'text'
          }))
        : []

      const serverIds = new Set(serverMessages.map(m => m.id))

      setMessages(prev => {
        const tempMessages = prev.filter(
          m => m.isTemp && !serverIds.has(m.id)
        )

        return [...tempMessages, ...serverMessages].sort(
          (a, b) => safeTime(a.timestamp) - safeTime(b.timestamp)
        )
      })
    } catch (error) {
      console.error('Error fetching messages:', error)
    }
  }

  useEffect(() => {
    if (!sessionId) return

    fetchMessages()
    const interval = setInterval(fetchMessages, 2000)

    return () => clearInterval(interval)
  }, [sessionId])

  // ---------------- NEW MESSAGE NOTIFICATION ----------------
  useEffect(() => {
    if (isInitialLoad) {
      setIsInitialLoad(false)
      return
    }

    if (messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (lastMessage.sender !== currentUserName) {
      playBeep()
    }
  }, [messages, currentUserName, isInitialLoad])

  // ---------------- SEND TEXT ----------------
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newMessage.trim()) return

    const headers = getAuthHeaders()
    if (!headers?.Authorization) return

    setIsSending(true)

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      sender: currentUserName,
      senderRole: currentUserRole,
      content: newMessage,
      timestamp: new Date().toISOString(),
      type: 'text',
      isTemp: true
    }

    setMessages(prev => [...prev, tempMessage])
    setNewMessage('')

    try {
      const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          content: tempMessage.content,
          type: 'text'
        })
      })

      if (!res.ok) throw new Error('Failed to send message')
    } catch (error) {
      console.error(error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    } finally {
      setIsSending(false)
    }
  }

  // ---------------- SEND FILE ----------------
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

    setMessages(prev => [...prev, tempMessage])

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

      setMessages(prev =>
        prev.map(m =>
          m.id === tempMessage.id
            ? {
                ...m,
                content: getMessageUrl(data.file_url),
                isTemp: false
              }
            : m
        )
      )
    } catch (error) {
      console.error('File upload error:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    } finally {
      setIsSending(false)
    }
  }

  // ---------------- VOICE RECORDING ----------------
  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

    const recorder = new MediaRecorder(stream)

    const chunks: BlobPart[] = []

    recorder.ondataavailable = e => chunks.push(e.data)

    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: 'audio/webm' })

      const file = new File([blob], `voice_${Date.now()}.webm`, {
        type: 'audio/webm'
      })

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

  // ---------------- RENDER ----------------
  return (
    <>
      <Card className="border-border flex flex-col h-96">
        <CardHeader className="border-b border-border pb-3">
          <CardTitle className="text-primary">Chat</CardTitle>
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
                className={`flex ${
                  message.senderRole === currentUserRole
                    ? 'justify-end'
                    : 'justify-start'
                }`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    message.senderRole === currentUserRole
                      ? 'bg-primary text-primary-foreground rounded-br-none'
                      : 'bg-secondary/50 text-foreground rounded-bl-none'
                  }`}
                >
                  {message.senderRole !== currentUserRole && (
                    <p className="text-xs font-semibold text-primary mb-1">
                      {message.sender}
                    </p>
                  )}

                  {message.type === 'text' && (
                    <p className="text-sm break-words">{message.content}</p>
                  )}

                  {message.type === 'image' && (
                    <img
                      src={message.content}
                      alt="Shared"
                      className="cursor-pointer max-h-48 rounded"
                      onClick={() => setModalImage(message.content)}
                    />
                  )}

                  {message.type === 'audio' && (
                    <audio controls className="w-full">
                      <source src={message.content} type="audio/webm" />
                    </audio>
                  )}

                  <p className="text-xs opacity-70 mt-1">
                    {formatLocalTime(message.timestamp)}
                  </p>
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
              disabled={isSending}
              className="flex-1 bg-input border-border"
            />

            <Button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              size="sm"
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>

          <div className="flex gap-3 items-center">
            <label className="cursor-pointer">
              <ImageIcon className="w-5 h-5 text-primary" />
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={isSending}
                onChange={e =>
                  e.target.files && handleSendFile(e.target.files[0], 'image')
                }
              />
            </label>

            <Button
              onClick={isRecording ? stopRecording : startRecording}
              size="sm"
              className="bg-secondary hover:bg-secondary/80"
            >
              {isRecording ? 'Stop' : 'Record'}
              <Mic className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </Card>

      {modalImage && (
        <div
          className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 cursor-pointer"
          onClick={() => setModalImage(null)}
        >
          <img
            src={modalImage}
            alt="Full View"
            className="max-h-[80%] max-w-[80%] rounded"
          />
        </div>
      )}
    </>
  )
}