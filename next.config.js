const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install()
}

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  // eslint: {
  //   dirs: ['pages', 'components', 'lib', 'layouts', 'scripts'],
  // },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'media.giphy.com' },
      { protocol: 'https', hostname: 'github.com' },
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'img.buymeacoffee.com' },
      { protocol: 'https', hostname: 'media1.tenor.com' },
      { protocol: 'https', hostname: 'cdn.jsdelivr.net' },
    ],
  },
  async rewrites() {
    return [
      {
        source: '/blog/:path*',
        destination: 'https://blog.codewithahsan.dev/:path*', // <-- Correct
      },
    ]
  },
  redirects: async () => {
    return [
      // Original redirects
      {
        source: '/youtube',
        destination: 'https://youtube.com/codewithahsan',
        permanent: true,
      },
      {
        source: '/slides',
        destination: 'https://ahsanayaz.github.io/slides',
        permanent: true,
      },
      {
        source: '/gde',
        destination: 'https://developers.google.com/profile/u/ahsanayaz',
        permanent: true,
      },
      {
        source: '/instagram',
        destination: 'https://instagram.com/codewithahsan',
        permanent: true,
      },
      {
        source: '/pre',
        destination:
          'https://www.udemy.com/course/practical-reactjs-essentials-in-hindi-urdu/?couponCode=35F94B376C0B8FE3AD38',
        permanent: true,
      },
      {
        source: '/facebook',
        destination: 'https://facebook.com/codewithahsan',
        permanent: true,
      },
      {
        source: '/tiktok',
        destination: 'https://tiktok.com/@codewithahsan',
        permanent: true,
      },
      {
        source: '/linkedin',
        destination: 'https://linked.com/in/ahsanayaz',
        permanent: true,
      },
      {
        source: '/web-dev-bootcamp',
        destination: '/courses/web-dev-bootcamp',
        permanent: true,
      },
      {
        source: '/rapidapi',
        destination:
          'https://rapidapi.com/hub?utm_source=AHSAN-AYAZ&utm_medium=DevRel&utm_campaign=DevRel',
        permanent: true,
      },
      {
        source: '/rapidapi-extension',
        destination:
          'https://marketplace.visualstudio.com/items?itemName=RapidAPI.vscode-rapidapi-client&utm_source=AHSAN-AYAZ&utm_medium=DevRel&utm_campaign=DevRel',
        permanent: true,
      },
      {
        source: '/discord',
        destination: 'https://discord.gg/KSPpuxD8SG',
        permanent: true,
      },
    ]
  },
  webpack: (config, { dev, isServer }) => {
    // config.module.rules.push({
    //   test: /\.(png|jpe?g|gif|mp4)$/i,
    //   use: [
    //     {
    //       loader: 'file-loader',
    //       options: {
    //         publicPath: '/_next',
    //         name: 'static/media/[name].[hash].[ext]',
    //       },
    //     },
    //   ],
    // })

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    if (!dev && !isServer) {
      config.devtool = 'source-map'
    }

    return config
  },

  // Add this line to enable source maps in production
  productionBrowserSourceMaps: true,
})
