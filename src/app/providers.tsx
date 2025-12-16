'use client'

import { ThemeProvider } from 'next-themes'
import { AuthContext } from '@/contexts/AuthContext'
import { useState } from 'react'
import { initializeApp, getApps } from 'firebase/app'
import CookieConsent from 'react-cookie-consent'
import LoginModal from '@/components/LoginModal'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSENGER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

// Initialize Firebase only on client side or if not already initialized
if (typeof window !== 'undefined' && getApps().length === 0) {
  try {
    initializeApp(firebaseConfig)
  } catch (e) {
    console.error('Firebase initialization error', e)
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [showLoginPopup, setShowLoginPopup] = useState(false)

  // Fix hydration mismatch for ThemeProvider if needed, but next-themes handles it usually.

  return (
    <ThemeProvider attribute="data-theme" defaultTheme="system" enableSystem>
      <AuthContext.Provider value={{ showLoginPopup, setShowLoginPopup: setShowLoginPopup as any }}>
        <LoginModal show={showLoginPopup} />
        {children}
        <CookieConsent
          buttonStyle={{
            backgroundColor: 'rgb(99 102 241)',
            color: 'white',
            borderRadius: '4px',
          }}
        >
          This website uses cookies to enhance the user experience.
        </CookieConsent>
      </AuthContext.Provider>
    </ThemeProvider>
  )
}
