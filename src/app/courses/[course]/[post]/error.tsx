'use client'

import Link from 'next/link'
import { useEffect } from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error('Course post error:', error)
  }, [error])

  return (
    <div className="page-padding">
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="card bg-base-100 shadow-xl max-w-md w-full">
          <div className="card-body text-center">
            <h2 className="card-title justify-center text-2xl">Something went wrong</h2>
            <p className="text-base-content/70">
              We couldn&apos;t load this course post. Please try again.
            </p>
            <div className="card-actions justify-center mt-4 gap-3">
              <button onClick={reset} className="btn btn-primary">
                Try Again
              </button>
              <Link href="/courses" className="btn btn-outline">
                Go to Courses
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
