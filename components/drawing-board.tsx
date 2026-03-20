'use client'

import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

type Tool =
  | 'pen'
  | 'line'
  | 'rect'
  | 'circle'
  | 'text'
  | 'eraser'

interface BoardImage {
  img: HTMLImageElement
  x: number
  y: number
  w: number
  h: number
}

interface DrawingBoardProps {
  isTutor?: boolean
  snapshot?: string
  onSendSnapshot: (snapshot: string) => void
  onSendStudentSnapshot?: (snapshot: string) => void
}

export function DrawingBoard({
  isTutor = false,
  snapshot,
  onSendSnapshot,
  onSendStudentSnapshot
}: DrawingBoardProps) {

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const previewRef = useRef<HTMLCanvasElement>(null)

  const [tool, setTool] = useState<Tool>('pen')
  const [drawing, setDrawing] = useState(false)

  const [color, setColor] = useState('#ffffff')
  const [size, setSize] = useState(4)

  const [startPos, setStartPos] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const [textInput, setTextInput] = useState('')

  const [undoStack, setUndoStack] = useState<string[]>([])
  const [redoStack, setRedoStack] = useState<string[]>([])

  const [images, setImages] = useState<BoardImage[]>([])

  const [cursorPos, setCursorPos] = useState({ x: 0, y: 0 })

  const canvasSize = { w: 900, h: 550 }

  // ================= SNAPSHOT RENDER =================
  useEffect(() => {
    if (!snapshot) return

    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const img = new Image()
    img.src = snapshot

    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    }
  }, [snapshot])

  // ================= UTIL =================
  const getCanvasCoords = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    }
  }

  const saveState = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    setUndoStack(prev => [...prev, canvas.toDataURL()])
    setRedoStack([])
  }

  const redrawImages = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return

    images.forEach(img => {
      ctx.drawImage(img.img, img.x, img.y, img.w, img.h)
    })
  }

  useEffect(() => {
    redrawImages()
  }, [images])

  // ================= KEYBOARD SHORTCUTS =================
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'b') setTool('pen')
      if (e.key === 'l') setTool('line')
      if (e.key === 'r') setTool('rect')
      if (e.key === 'c') setTool('circle')
      if (e.key === 'e') setTool('eraser')
      if (e.key === 't') setTool('text')

      if (e.ctrlKey && e.key === 'z') undo()
      if (e.ctrlKey && e.shiftKey && e.key === 'Z') redo()
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  // ================= MOUSE DOWN =================
  const handleMouseDown = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e)
    setStartPos(pos)
    setMousePos(pos)
    setDrawing(true)

    if (tool === 'text') {
      const ctx = canvasRef.current?.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = color
      ctx.font = `${size * 5}px sans-serif`
      ctx.fillText(textInput || 'Text', pos.x, pos.y)

      saveState()
      setDrawing(false)
    }
  }

  // ================= PREVIEW =================
  const drawPreview = (pos: any) => {
    const ctx = previewRef.current?.getContext('2d')
    if (!ctx) return

    ctx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.strokeStyle = color
    ctx.lineWidth = size

    if (tool === 'line') {
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y)
    }

    if (tool === 'circle') {
      const r = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) +
        Math.pow(pos.y - startPos.y, 2)
      )
      ctx.beginPath()
      ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2)
      ctx.stroke()
    }
  }

  // ================= MOUSE MOVE =================
  const handleMouseMove = (e: React.MouseEvent) => {
    const pos = getCanvasCoords(e)
    setCursorPos(pos)

    if (!drawing) return

    const ctx = canvasRef.current?.getContext('2d')
    if (!ctx) return

    if (tool === 'pen') {
      ctx.strokeStyle = color
      ctx.lineWidth = size
      ctx.lineCap = 'round'

      ctx.beginPath()
      ctx.moveTo(mousePos.x, mousePos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()

      setMousePos(pos)
    }

    if (tool === 'eraser') {
      ctx.globalCompositeOperation = 'destination-out'

      ctx.beginPath()
      ctx.moveTo(mousePos.x, mousePos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.strokeStyle = 'rgba(0,0,0,1)'
      ctx.lineWidth = size * 4   // <-- scale like text
      ctx.lineCap = 'round'
      ctx.stroke()

      ctx.globalCompositeOperation = 'source-over'
      setMousePos(pos)
    }

    if (tool === 'line' || tool === 'rect' || tool === 'circle') {
      drawPreview(pos)
    }
  }

  // ================= MOUSE UP =================
  const handleMouseUp = (e: React.MouseEvent) => {
    setDrawing(false)
    const pos = getCanvasCoords(e)
    const ctx = canvasRef.current?.getContext('2d')
    const previewCtx = previewRef.current?.getContext('2d')
    if (!ctx || !previewCtx) return

    previewCtx.clearRect(0, 0, canvasSize.w, canvasSize.h)
    ctx.strokeStyle = color
    ctx.lineWidth = size

    if (tool === 'line') {
      ctx.beginPath()
      ctx.moveTo(startPos.x, startPos.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
    }

    if (tool === 'rect') {
      ctx.strokeRect(startPos.x, startPos.y, pos.x - startPos.x, pos.y - startPos.y)
    }

    if (tool === 'circle') {
      const r = Math.sqrt(
        Math.pow(pos.x - startPos.x, 2) +
        Math.pow(pos.y - startPos.y, 2)
      )
      ctx.beginPath()
      ctx.arc(startPos.x, startPos.y, r, 0, Math.PI * 2)
      ctx.stroke()
    }

    saveState()
  }

  // ================= IMAGE UPLOAD =================
  const handleImageUpload = (file: File) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.src = reader.result as string
      img.onload = () => {
        const canvas = canvasRef.current
        setImages([{ img, x: 0, y: 0, w: canvas?.width || 900, h: canvas?.height || 550 }])
        redrawImages()
        saveState()
      }
    }
    reader.readAsDataURL(file)
  }

  const uploadImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) handleImageUpload(file)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const file = e.dataTransfer.files?.[0]
    if (file) handleImageUpload(file)
  }

  // ================= UNDO / REDO =================
  const undo = () => {
    if (!undoStack.length) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const last = undoStack[undoStack.length - 1]
    setUndoStack(prev => prev.slice(0, -1))
    setRedoStack(prev => [...prev, canvas.toDataURL()])

    const img = new Image()
    img.src = last
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }

  const redo = () => {
    if (!redoStack.length) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx || !canvas) return

    const next = redoStack[redoStack.length - 1]
    setRedoStack(prev => prev.slice(0, -1))
    setUndoStack(prev => [...prev, canvas.toDataURL()])

    const img = new Image()
    img.src = next
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0)
    }
  }

  // ================= SNAPSHOT =================
  const sendSnapshot = () => {
    const canvas = canvasRef.current
    if (canvas) onSendSnapshot(canvas.toDataURL())
  }

  const sendStudentSnapshot = () => {
    const canvas = canvasRef.current
    if (canvas && onSendStudentSnapshot) onSendStudentSnapshot(canvas.toDataURL())
  }

  const downloadSnapshot = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.href = canvas.toDataURL()
    link.download = 'board.png'
    link.click()
  }

  const clearBoard = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return

    saveState()
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const previewCtx = previewRef.current?.getContext('2d')
    previewCtx?.clearRect(0, 0, canvas.width, canvas.height)
    setImages([])
  }

  return (
    <Card className="p-2 flex flex-col space-y-2 bg-card">

      <div className="flex flex-wrap gap-2 items-center">
        <Button variant={tool==='pen'?'default':'outline'} onClick={()=>setTool('pen')}>Pen</Button>
        <Button variant={tool==='line'?'default':'outline'} onClick={()=>setTool('line')}>Line</Button>
        <Button variant={tool==='rect'?'default':'outline'} onClick={()=>setTool('rect')}>Rect</Button>
        <Button variant={tool==='circle'?'default':'outline'} onClick={()=>setTool('circle')}>Circle</Button>
        <Button variant={tool==='text'?'default':'outline'} onClick={()=>setTool('text')}>Text</Button>
        <Button variant={tool==='eraser'?'default':'outline'} onClick={()=>setTool('eraser')}>Eraser</Button>

        <input type="color" value={color} onChange={e=>setColor(e.target.value)} />
        <input type="number" value={size} min={1} max={50} onChange={e=>setSize(Number(e.target.value))} />
        <input placeholder="Text" value={textInput} onChange={e=>setTextInput(e.target.value)} />
        <input type="file" accept="image/*" onChange={uploadImage}/>
        <Button onClick={undo}>Undo</Button>
        <Button onClick={redo}>Redo</Button>
        <Button variant="destructive" onClick={clearBoard}>Clear</Button>
        {isTutor && <Button onClick={sendSnapshot}>Send Snapshot</Button>}
        {!isTutor && onSendStudentSnapshot && <Button onClick={sendStudentSnapshot}>Send Annotation</Button>}
        <Button onClick={downloadSnapshot}>Download</Button>
      </div>

      <div
        className="relative border border-border bg-black"
        onDragOver={e=>e.preventDefault()}
        onDrop={handleDrop}
      >
        <canvas
          ref={canvasRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute top-0 left-0 cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
        />
        <canvas
          ref={previewRef}
          width={canvasSize.w}
          height={canvasSize.h}
          className="absolute top-0 left-0 pointer-events-none"
        />
        <div
          style={{
            position:'absolute',
            left: cursorPos.x - (tool === 'eraser' ? size*4/2 : size/2),
            top: cursorPos.y - (tool === 'eraser' ? size*4/2 : size/2),
            width: tool === 'eraser' ? size*4 : size,
            height: tool === 'eraser' ? size*4 : size,
            border: '1px solid white',
            borderRadius: '50%',
            pointerEvents:'none',
            background: tool === 'eraser' ? 'rgba(255,255,255,0.2)' : 'transparent'
          }}
        />
      </div>

      <div className="text-xs opacity-70">
        Active tool: <b>{tool}</b>
      </div>

    </Card>
  )
}