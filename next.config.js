const withBundleAnalyzer = require('@next/bundle-analyzer')({
  enabled: process.env.ANALYZE === 'true',
})

if (process.env.NODE_ENV === 'development') {
  require('source-map-support').install()
}

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
      'cdn.jsdelivr.net',
    ],
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

      // Blog post redirects - mapping from original paths to Ghost paths
      {
        source: '/blog/8-techniques-to-write-cleaner-javscript-code',
        destination: 'https://blog.codewithahsan.dev/8-techniques-to-write-cleaner-javscript-code',
        permanent: true,
      },
      {
        source: '/blog/10-critical-mistakes-every-software-engineer-should-avoid',
        destination:
          'https://blog.codewithahsan.dev/10-critical-mistakes-every-software-engineer-should-avoid',
        permanent: true,
      },
      {
        source: '/blog/adding-comments-to-your-gatsbyjs-blog',
        destination: 'https://blog.codewithahsan.dev/adding-comments-to-your-gatsbyjs-blog',
        permanent: true,
      },
      {
        source: '/blog/angular-performance-budgets',
        destination: 'https://blog.codewithahsan.dev/angular-performance-budgets',
        permanent: true,
      },
      {
        source: '/blog/angular-signals-taking-reactivity-to-new-heights',
        destination:
          'https://blog.codewithahsan.dev/angular-signals-taking-reactivity-to-new-heights',
        permanent: true,
      },
      {
        source:
          '/blog/angular-unit-tests-constructor-not-compatible-with-angular-dependency-injection',
        destination:
          'https://blog.codewithahsan.dev/angular-unit-tests-constructor-not-compatible-with-angular-dependency-injection',
        permanent: true,
      },
      {
        source: '/blog/angular19-resource-api',
        destination: 'https://blog.codewithahsan.dev/angular19-resource-api',
        permanent: true,
      },
      {
        source: '/blog/css-box-model',
        destination: 'https://blog.codewithahsan.dev/css-box-model',
        permanent: true,
      },
      {
        source: '/blog/extend-angular-built-in-pipes',
        destination: 'https://blog.codewithahsan.dev/extend-angular-built-in-pipes',
        permanent: true,
      },
      {
        source: '/blog/github-batch-pr-reviewer-chrome-extension',
        destination: 'https://blog.codewithahsan.dev/github-batch-pr-reviewer-chrome-extension',
        permanent: true,
      },
      {
        source: '/blog/hackstack-2023-starts',
        destination: 'https://blog.codewithahsan.dev/hackstack-2023-starts',
        permanent: true,
      },
      {
        source: '/blog/how-i-won-the-keychron-k2-at-whatthestack-conference',
        destination:
          'https://blog.codewithahsan.dev/how-i-won-the-keychron-k2-at-whatthestack-conference',
        permanent: true,
      },
      {
        source: '/blog/how-to-build-programming-logic',
        destination: 'https://blog.codewithahsan.dev/how-to-build-programming-logic',
        permanent: true,
      },
      {
        source: '/blog/i-failed-a-lot',
        destination: 'https://blog.codewithahsan.dev/i-failed-a-lot',
        permanent: true,
      },
      {
        source: '/blog/make-passive-income-by-selling-apis',
        destination: 'https://blog.codewithahsan.dev/make-passive-income-by-selling-apis',
        permanent: true,
      },
      {
        source: '/blog/mastering-consistency-web-development-learning',
        destination:
          'https://blog.codewithahsan.dev/mastering-consistency-web-development-learning',
        permanent: true,
      },
      {
        source: '/blog/tech-karo-first-meetup-2021',
        destination: 'https://blog.codewithahsan.dev/tech-karo-first-meetup-2021',
        permanent: true,
      },
      {
        source: '/blog/the-complete-typescript-setup-from-zero-to-hero',
        destination:
          'https://blog.codewithahsan.dev/the-complete-typescript-setup-from-zero-to-hero',
        permanent: true,
      },
      {
        source: '/blog/the-most-easy-way-to-add-update-and-delete-contacts-in-flutter',
        destination:
          'https://blog.codewithahsan.dev/the-most-easy-way-to-add-update-and-delete-contacts-in-flutter',
        permanent: true,
      },
      {
        source: '/blog/understanding-discriminated-unions-in-typescript',
        destination:
          'https://blog.codewithahsan.dev/understanding-discriminated-unions-in-typescript',
        permanent: true,
      },
      {
        source: '/blog/understanding-ramadan-for-non-muslim-workspace-colleagues',
        destination:
          'https://blog.codewithahsan.dev/understanding-ramadan-for-non-muslim-workspace-colleagues',
        permanent: true,
      },
      {
        source: '/blog/web-dev-roadmap-2024',
        destination: 'https://blog.codewithahsan.dev/web-dev-roadmap-2024',
        permanent: true,
      },

      // Nested blog post redirects
      {
        source: '/blog/flutter-marketplace-app-with-stripe/part-1',
        destination: 'https://blog.codewithahsan.dev/flutter-marketplace-app-with-stripe-part-1',
        permanent: true,
      },
      {
        source: '/blog/flutter-marketplace-app-with-stripe/part-2',
        destination: 'https://blog.codewithahsan.dev/flutter-marketplace-app-with-stripe-part-2',
        permanent: true,
      },
      {
        source: '/blog/flutter-stripe-tutorial-with-official-package/part-1',
        destination:
          'https://blog.codewithahsan.dev/flutter-stripe-tutorial-with-official-package-part-1',
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
      config.devtool = 'source-map'
    }

    return config
  },

  // Add this line to enable source maps in production
  productionBrowserSourceMaps: true,
})
