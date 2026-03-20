'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { X, Upload, Video, Image as ImageIcon } from 'lucide-react'

interface SessionMediaViewerProps {
  onMediaSelect?: (url: string) => void
}

export function SessionMediaViewer({ onMediaSelect }: SessionMediaViewerProps) {
  const [mediaType, setMediaType] = useState<'image' | 'video' | null>(null)
  const [mediaSrc, setMediaSrc] = useState<string>('')
  const [mediaFile, setMediaFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string
      setMediaType(type)
      setMediaSrc(dataUrl)
      setMediaFile(file)
      onMediaSelect?.(dataUrl)
    }
    reader.readAsDataURL(file)
  }

  const clearMedia = () => {
    setMediaType(null)
    setMediaSrc('')
    setMediaFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  return (
    <Card className='border-border'>
      <CardHeader className='pb-3'>
        <CardTitle className='text-primary'>Media Viewer</CardTitle>
      </CardHeader>
      <CardContent className='space-y-4'>
        {/* Media Display */}
        {mediaSrc && mediaType ? (
          <div className='relative bg-primary/10 rounded-lg overflow-hidden'>
            {mediaType === 'image' ? (
              <img src={mediaSrc} alt='Selected' className='w-full h-auto max-h-64 object-contain' />
            ) : (
              <video
                src={mediaSrc}
                controls
                className='w-full h-auto max-h-64 object-contain bg-black'
              />
            )}
            <Button
              size='sm'
              variant='destructive'
              onClick={clearMedia}
              className='absolute top-2 right-2 bg-destructive/90 hover:bg-destructive'
            >
              <X className='w-4 h-4' />
            </Button>
            <p className='text-xs text-foreground/50 p-2'>
              {mediaFile?.name} ({(mediaFile?.size || 0 / 1024).toFixed(2)} KB)
            </p>
          </div>
        ) : (
          <div className='space-y-3'>
            <p className='text-sm text-foreground/60 text-center'>No media selected</p>
            
            {/* Upload Buttons */}
            <div className='space-y-2'>
              <Button
                variant='outline'
                onClick={() => fileInputRef.current?.click()}
                className='w-full border-border hover:bg-primary/20 hidden'
              >
                <Upload className='w-4 h-4 mr-2' />
                Browse Files
              </Button>

              <div className='flex gap-2'>
                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'image/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setMediaType('image')
                          setMediaSrc(event.target?.result as string)
                          setMediaFile(file)
                          onMediaSelect?.(file)
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  }}
                  className='flex-1 border-border hover:bg-primary/20'
                >
                  <ImageIcon className='w-4 h-4 mr-2' />
                  Image
                </Button>

                <Button
                  size='sm'
                  variant='outline'
                  onClick={() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = 'video/*'
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0]
                      if (file) {
                        const reader = new FileReader()
                        reader.onload = (event) => {
                          setMediaType('video')
                          setMediaSrc(event.target?.result as string)
                          setMediaFile(file)
                          onMediaSelect?.(file)
                        }
                        reader.readAsDataURL(file)
                      }
                    }
                    input.click()
                  }}
                  className='flex-1 border-border hover:bg-primary/20'
                >
                  <Video className='w-4 h-4 mr-2' />
                  Video
                </Button>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type='file'
          className='hidden'
        />
      </CardContent>
    </Card>
  )
}
