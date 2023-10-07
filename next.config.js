const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

module.exports = withBundleAnalyzer({
  reactStrictMode: true,
  pageExtensions: ['js', 'jsx', 'md', 'mdx'],
  eslint: {
    dirs: ['pages', 'components', 'lib', 'layouts', 'scripts'],
  },
  images: {
    domains: [
      'media.giphy.com',
      'github.com',
      'res.cloudinary.com',
      'img.buymeacoffee.com',
      'media1.tenor.com',
    ],
  },
  redirects: async () => {
    return [
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
        destination:
          'https://developers.google.com/profile/u/ahsanayaz',
        permanent: true,
      },
      {
        source: '/instagram',
        destination: 'https://instagram.com/codewithahsan',
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
    config.module.rules.push({
      test: /\.(png|jpe?g|gif|mp4)$/i,
      use: [
        {
          loader: 'file-loader',
          options: {
            publicPath: '/_next',
            name: 'static/media/[name].[hash].[ext]',
          },
        },
      ],
    })

    config.module.rules.push({
      test: /\.svg$/,
      use: ['@svgr/webpack'],
    })

    if (!dev && !isServer) {
      // Replace React with Preact only in client production build
      Object.assign(config.resolve.alias, {
        react: 'preact/compat',
        'react-dom/test-utils': 'preact/test-utils',
        'react-dom': 'preact/compat',
      })
    }

    return config
  },
})
