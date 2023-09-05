import '@/css/tailwind.css'
import '@/css/prism.css'
import '@/css/layout.css'

import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import Analytics from '@/components/analytics'
import LayoutWrapper from '@/components/LayoutWrapper'
import { ClientReload } from '@/components/ClientReload'
const isDevelopment = process.env.NODE_ENV === 'development'
import { initializeApp, getApps } from 'firebase/app'
import CookieConsent from 'react-cookie-consent'

config.autoAddCss = false

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSENGER_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
}

if (getApps().length === 0) {
  initializeApp(firebaseConfig)
}

export default function App({ Component, pageProps }) {
  const { showAds } = Component
  const Wrapper = Component.getLayout || LayoutWrapper
  return (
    <ThemeProvider attribute="class" defaultTheme="system">
      <Head>
        <meta content="width=device-width, initial-scale=1" name="viewport" />
        {showAds && (
          <script
            async
            src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-9844853681537365"
            crossOrigin="anonymous"
          ></script>
        )}
      </Head>
      {isDevelopment && <ClientReload />}
      <Analytics />
      <Wrapper>
        <Component {...pageProps} />
        <CookieConsent
          buttonStyle={{ backgroundColor: 'rgb(99 102 241)', color: 'white', borderRadius: '4px' }}
        >
          This website uses cookies to enhance the user experience.
        </CookieConsent>
      </Wrapper>
    </ThemeProvider>
  )
}
