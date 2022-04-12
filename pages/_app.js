import '@/css/tailwind.css'
import '@/css/prism.css'

import { ThemeProvider } from 'next-themes'
import Head from 'next/head'
import { config } from '@fortawesome/fontawesome-svg-core'
import '@fortawesome/fontawesome-svg-core/styles.css'
import Analytics from '@/components/analytics'
import LayoutWrapper from '@/components/LayoutWrapper'
import { ClientReload } from '@/components/ClientReload'
const isDevelopment = process.env.NODE_ENV === 'development'
config.autoAddCss = false

export default function App({ Component, pageProps }) {
  const { showAds } = Component
  return (
    <ThemeProvider attribute="class">
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
      <LayoutWrapper>
        <Component {...pageProps} />
      </LayoutWrapper>
    </ThemeProvider>
  )
}
