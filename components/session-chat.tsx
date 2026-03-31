'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Send } from 'lucide-react'
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
  currentUserId: string
}

export function SessionChat({
  sessionId,
  currentUserRole,
  currentUserName,
  currentUserId
}: SessionChatProps) {
  const { emit, on, off, onConnect, connected } = useSocket()
  const messagesRef = useRef<Message[]>([])

  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)

  const [isRecording, setIsRecording] = useState(false)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)

  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  const [modalImage, setModalImage] = useState<string | null>(null)
  const [zoom, setZoom] = useState(1)

  

  const API_BASE =
    process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'

  const safeTime = (t: any) => {
    const d = new Date(t)
    return isNaN(d.getTime()) ? 0 : d.getTime()
  }

  const BASE_URL =
  process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') ||
  'http://localhost:5000'

  const getMessageUrl = (content: string) => {
    if (content.startsWith('http')) return content
    if (content.startsWith('/')) return `${BASE_URL}${content}`
    return content
}

  

  const formatLocalTime = (timestamp: string) => {
    const d = new Date(timestamp)
    if (isNaN(d.getTime())) return ''
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Join room + rejoin on reconnect
  useEffect(() => {
    if (!sessionId || !currentUserId) return
    const joinRoom = () => {
      emit('join_session', {
        session_id: sessionId,
        user_id: currentUserId
      })
    }
    joinRoom()
    onConnect(joinRoom)
    return () => off('connect', joinRoom)
  }, [sessionId, currentUserId])

  // Listen for messages
  useEffect(() => {
    const handleNewMessage = (msgData: any) => {
      const newMsg: Message = {
        id: msgData.id?.toString() ?? crypto.randomUUID(),
        sender: msgData.sender_name ?? msgData.sender ?? 'User',
        senderRole: (msgData.sender_role ?? 'student').toLowerCase() as
          | 'tutor'
          | 'student',
        content: getMessageUrl(msgData.content),
        timestamp: msgData.timestamp ?? new Date().toISOString(),
        type: msgData.type ?? 'text'
      }

        setMessages(prev => {
    // Remove temp version if same content
          const filtered = prev.filter(
            m => !(m.isTemp && m.content === msgData.content)
          )

          const updated = [...filtered, newMsg].sort(
            (a, b) => safeTime(a.timestamp) - safeTime(b.timestamp)
          )

          messagesRef.current = updated
          return updated
        })
    }

    on('message_received', handleNewMessage)
    return () => off('message_received', handleNewMessage)
  }, [])

  // Send text message
  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !connected) return

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
// ✅ Image upload
const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0]
  if (!file) return

  // Show temporary preview
  const tempMessage: Message = {
    id: crypto.randomUUID(),
    sender: currentUserName,
    senderRole: currentUserRole,
    content: URL.createObjectURL(file),
    timestamp: new Date().toISOString(),
    type: 'image',
    isTemp: true
  }
  setMessages(prev => [...prev, tempMessage])
  messagesRef.current = [...messagesRef.current, tempMessage]

  try {
    const formData = new FormData()
    formData.append('file', file)

    setIsUploading(true)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${API_BASE}/upload`)

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setUploadProgress(Math.round((e.loaded / e.total) * 100))
      }
    }

    xhr.onload = () => {
      setIsUploading(false)
      setUploadProgress(0)

      if (xhr.status === 200) {
        const data = JSON.parse(xhr.responseText)

        emit('send_message', {
          session_id: sessionId,
          content: data.url,
          type: 'image',
          sender: currentUserName,
          sender_role: currentUserRole
        })
      } else {
        setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
      }
    }

    xhr.onerror = () => {
      setIsUploading(false)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    }

    xhr.send(formData)

  } catch (error) {
    console.error('Image upload failed:', error)
    setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
  }
}

// Audio recording
const startRecording = async () => {
  if (!navigator.mediaDevices) return
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
  const recorder = new MediaRecorder(stream)
  const chunks: Blob[] = []

  recorder.ondataavailable = e => chunks.push(e.data)
  recorder.onstop = async () => {
    const audioBlob = new Blob(chunks, { type: 'audio/webm' })
    const audioUrl = URL.createObjectURL(audioBlob)

    const tempMessage: Message = {
      id: crypto.randomUUID(),
      sender: currentUserName,
      senderRole: currentUserRole,
      content: audioUrl,
      timestamp: new Date().toISOString(),
      type: 'audio',
      isTemp: true
    }
    setMessages(prev => [...prev, tempMessage])
    messagesRef.current = [...messagesRef.current, tempMessage]

    try {
      const formData = new FormData()
      formData.append('file', audioBlob, 'recording.webm')
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: formData
      })
      const data = await res.json()
      const audioFileUrl = data.url

      emit('send_message', {
        session_id: sessionId,
        content: audioFileUrl,
        type: 'audio',
        sender: currentUserName,
        sender_role: currentUserRole
      })
    } catch (error) {
      console.error('Audio upload failed:', error)
      setMessages(prev => prev.filter(m => m.id !== tempMessage.id))
    }
  }

  setMediaRecorder(recorder)
  recorder.start()
  setIsRecording(true)
}

const stopRecording = () => {
  mediaRecorder?.stop()
  setIsRecording(false)
}

return (
  <Card className="border-border flex flex-col h-96">
    <CardHeader className="border-b border-border pb-3 flex flex-row items-center justify-between">
      <CardTitle className="text-primary">Chat</CardTitle>
      <div
        className={`text-xs px-2 py-1 rounded-full ${
          connected
            ? 'bg-green-100 text-green-700'
            : 'bg-yellow-100 text-yellow-700'
        }`}
      >
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
                  src={getMessageUrl(message.content)}
                  className="max-w-full rounded cursor-pointer"
                  onClick={() => {
                    setModalImage(getMessageUrl(message.content))
                    setZoom(1) // reset zoom when opening
                  }}
                />
              )}

              {message.type === 'audio' && (
                <audio controls src={getMessageUrl(message.content)} />
              )}

              <p className="text-xs opacity-70 mt-1">
                {formatLocalTime(message.timestamp)}
              </p>
            </div>
          </div>
        ))
      )}
    </CardContent>

    {isUploading && (
      <div className="px-4 pb-2">
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-blue-500 h-2 rounded"
            style={{ width: `${uploadProgress}%` }}
          />
        </div>
        <p className="text-xs text-center">{uploadProgress}%</p>
      </div>
    )}

    <div className="border-t border-border p-4">
      <form onSubmit={handleSendMessage} className="flex flex-col gap-2">
        <Input
          value={newMessage}
          onChange={e => setNewMessage(e.target.value)}
          placeholder="Type a message..."
          disabled={isSending || !connected}
          className="w-full"
        />

        <div className="flex gap-2 justify-end">
          {/* Image Upload */}
          <input
            id="image-upload"
            type="file"
            accept="image/*"
            onChange={handleImageChange}
            className="hidden"
          />
          <Button
            type="button"
            className="px-3 py-2"
            disabled={isUploading}
            onClick={() => document.getElementById('image-upload')?.click()}
          >
            Upload Image
          </Button>

          {/* Audio Recording */}
          <Button
            onClick={isRecording ? stopRecording : startRecording}
            className="px-3 py-2"
            disabled={isUploading}
          >
            {isRecording ? 'Stop Recording' : 'Record Audio'}
          </Button>

          {/* Send Button */}
          <Button type="submit" disabled={!newMessage.trim() || !connected || isUploading}>
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </form>
    </div>

    {/* Image Modal */}
    {modalImage && (
      <div
        className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50"
        onClick={() => setModalImage(null)}
      >
        <div
          className="relative bg-black p-4 rounded"
          onClick={(e) => e.stopPropagation()}
        >
          <img
            src={modalImage}
            style={{ transform: `scale(${zoom})` }}
            className="max-h-[80vh] max-w-[80vw] transition-transform"
          />
          <div className="flex justify-between mt-2 space-x-2">
            <button
              className="px-2 py-1 bg-gray-200 rounded"
              onClick={() => setZoom(prev => prev + 0.2)}
            >
              Zoom In
            </button>
            <button
              className="px-2 py-1 bg-gray-200 rounded"
              onClick={() => setZoom(prev => Math.max(prev - 0.2, 0.2))}
            >
              Zoom Out
            </button>
            <button
              className="px-2 py-1 bg-red-500 text-white rounded"
              onClick={() => setModalImage(null)}
            >
              Close
            </button>
          </div>
        </div>
      </div>
    )}
  </Card>
)
}