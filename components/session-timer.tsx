'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Play, Pause, RotateCcw } from 'lucide-react'

interface SessionTimerProps {
  initialMinutes?: number
  onTimeUp?: () => void
}

export function SessionTimer({ initialMinutes = 60, onTimeUp }: SessionTimerProps) {
  const [totalSeconds] = useState(initialMinutes * 60)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const [isRunning, setIsRunning] = useState(false)

  useEffect(() => {

    let interval: NodeJS.Timeout

    if (isRunning && elapsedSeconds < totalSeconds) {

      interval = setInterval(() => {

        setElapsedSeconds((prev) => {

          const newTime = prev + 1

          if (newTime >= totalSeconds) {
            setIsRunning(false)
            onTimeUp?.()
            return newTime
          }

          return newTime
        })

      }, 1000)
    }

    return () => clearInterval(interval)

  }, [isRunning, elapsedSeconds, totalSeconds, onTimeUp])

  const minutes = Math.floor(elapsedSeconds / 60)
  const seconds = elapsedSeconds % 60

  const remaining = totalSeconds - elapsedSeconds
  const remainingMinutes = Math.floor(remaining / 60)
  const remainingSeconds = remaining % 60

  const toggleTimer = () => {
    setIsRunning(!isRunning)
  }

  const resetTimer = () => {
    setIsRunning(false)
    setElapsedSeconds(0)
  }

  const progress = (elapsedSeconds / totalSeconds) * 100

  return (

    <Card className='border-border'>

      <CardHeader>
        <CardTitle className='text-primary'>Session Timer</CardTitle>
      </CardHeader>

      <CardContent className='space-y-4'>

        <div className='text-center'>

          <div className='relative w-32 h-32 mx-auto mb-4'>

            <svg className='w-full h-full transform -rotate-90' style={{ overflow: 'visible' }}>

              <circle
                cx='64'
                cy='64'
                r='60'
                fill='none'
                stroke='currentColor'
                strokeWidth='4'
                className='text-border'
              />

              <circle
                cx='64'
                cy='64'
                r='60'
                fill='none'
                stroke='currentColor'
                strokeWidth='4'
                strokeDasharray={`${(progress / 100) * 376.99} 376.99`}
                className='text-primary transition-all duration-1000'
              />

            </svg>

            <div className='absolute inset-0 flex flex-col items-center justify-center'>

              <div className='text-2xl font-bold text-primary'>
                {String(remainingMinutes).padStart(2, '0')}:
                {String(remainingSeconds).padStart(2, '0')}
              </div>

              <div className='text-xs text-foreground/50 mt-1'>
                remaining
              </div>

            </div>

          </div>

          <p className='text-sm text-foreground/60'>
            Elapsed: {String(minutes).padStart(2, '0')}:
            {String(seconds).padStart(2, '0')}
          </p>

        </div>

        <div className='flex gap-2 justify-center'>

          <Button
            size='sm'
            onClick={toggleTimer}
            className={
              isRunning
                ? 'bg-yellow-600 hover:bg-yellow-700'
                : 'bg-primary hover:bg-primary/90'
            }
          >

            {isRunning ? (
              <>
                <Pause className='w-4 h-4 mr-2' />
                Pause
              </>
            ) : (
              <>
                <Play className='w-4 h-4 mr-2' />
                Start
              </>
            )}

          </Button>

          <Button
            size='sm'
            variant='outline'
            onClick={resetTimer}
            className='border-border'
          >
            <RotateCcw className='w-4 h-4 mr-2' />
            Reset
          </Button>

        </div>

        <div className='text-center text-xs'>

          {elapsedSeconds >= totalSeconds ? (
            <p className='text-destructive font-semibold'>
              Time&apos;s up!
            </p>
          ) : isRunning ? (
            <p className='text-primary'>Timer running...</p>
          ) : (
            <p className='text-foreground/50'>Timer paused</p>
          )}

        </div>

      </CardContent>

    </Card>
  )
}
