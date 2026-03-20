import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function Home() {
  return (
    <div className='min-h-screen bg-gradient-to-b from-background to-muted'>
      <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20'>
        {/* Header */}
        <div className='text-center mb-16'>
          <h1 className='text-5xl font-bold text-primary mb-6 text-balance'>
            Learn with Expert Tutors Online
          </h1>
          <p className='text-xl text-foreground/60 mb-8 max-w-2xl mx-auto text-pretty'>
            Connect with qualified tutors for personalized one-on-one learning sessions. Interactive whiteboard, real-time communication, and flexible scheduling.
          </p>
          <div className='flex gap-4 justify-center flex-wrap'>
            <Link href='/auth/login'>
              <Button size='lg' className='bg-primary hover:bg-primary/90'>
                Sign In
              </Button>
            </Link>
            <Link href='/auth/register'>
              <Button size='lg' variant='outline' className='border-primary text-primary hover:bg-primary/10'>
                Get Started
              </Button>
            </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className='grid md:grid-cols-3 gap-8 mt-20'>
          <div className='bg-card p-8 rounded-lg border border-border'>
            <div className='text-4xl mb-4'>✍️</div>
            <h3 className='text-xl font-semibold text-primary mb-3'>Interactive Board</h3>
            <p className='text-foreground/70'>
              Real-time whiteboard for drawing, writing, and collaboration during sessions.
            </p>
          </div>

          <div className='bg-card p-8 rounded-lg border border-border'>
            <div className='text-4xl mb-4'>🎓</div>
            <h3 className='text-xl font-semibold text-primary mb-3'>Expert Tutors</h3>
            <p className='text-foreground/70'>
              Verified tutors with qualifications across subjects and experience levels.
            </p>
          </div>

          <div className='bg-card p-8 rounded-lg border border-border'>
            <div className='text-4xl mb-4'>⏰</div>
            <h3 className='text-xl font-semibold text-primary mb-3'>Flexible Schedule</h3>
            <p className='text-foreground/70'>
              Book sessions at times that work for you. No commitment required.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className='grid md:grid-cols-4 gap-8 mt-20 pt-16 border-t border-border'>
          <div className='text-center'>
            <div className='text-3xl font-bold text-primary mb-2'>500+</div>
            <p className='text-foreground/60'>Active Tutors</p>
          </div>
          <div className='text-center'>
            <div className='text-3xl font-bold text-primary mb-2'>10K+</div>
            <p className='text-foreground/60'>Students</p>
          </div>
          <div className='text-center'>
            <div className='text-3xl font-bold text-primary mb-2'>50K+</div>
            <p className='text-foreground/60'>Sessions</p>
          </div>
          <div className='text-center'>
            <div className='text-3xl font-bold text-primary mb-2'>4.9★</div>
            <p className='text-foreground/60'>Avg Rating</p>
          </div>
        </div>
      </div>
    </div>
  )
}
