import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "media.giphy.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.buymeacoffee.com" },
      { protocol: "https", hostname: "media1.tenor.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
    ],
  },
  async rewrites() {
    return [
      {
        source: "/blog/:path*",
        destination: "https://blog.codewithahsan.dev/:path*",
      },
    ];
  },
  async redirects() {
    return [
      {
        source: "/youtube",
        destination: "https://youtube.com/codewithahsan",
        permanent: true,
      },
      {
        source: "/slides",
        destination: "https://ahsanayaz.github.io/slides",
        permanent: true,
      },
      {
        source: "/gde",
        destination: "https://developers.google.com/profile/u/ahsanayaz",
        permanent: true,
      },
      {
        source: "/instagram",
        destination: "https://instagram.com/codewithahsan",
        permanent: true,
      },
      {
        source: "/pre",
        destination:
          "https://www.udemy.com/course/practical-reactjs-essentials-in-hindi-urdu/?couponCode=35F94B376C0B8FE3AD38",
        permanent: true,
      },
      {
        source: "/facebook",
        destination: "https://facebook.com/codewithahsan",
        permanent: true,
      },
      {
        source: "/tiktok",
        destination: "https://tiktok.com/@codewithahsan",
        permanent: true,
      },
      {
        source: "/linkedin",
        destination: "https://linked.com/in/ahsanayaz",
        permanent: true,
      },
      {
        source: "/web-dev-bootcamp",
        destination: "/courses/web-dev-bootcamp",
        permanent: true,
      },
      {
        source: "/rapidapi",
        destination:
          "https://rapidapi.com/hub?utm_source=AHSAN-AYAZ&utm_medium=DevRel&utm_campaign=DevRel",
        permanent: true,
      },
      {
        source: "/rapidapi-extension",
        destination:
          "https://marketplace.visualstudio.com/items?itemName=RapidAPI.vscode-rapidapi-client&utm_source=AHSAN-AYAZ&utm_medium=DevRel&utm_campaign=DevRel",
        permanent: true,
      },
      {
        source: "/discord",
        destination: "https://discord.gg/KSPpuxD8SG",
        permanent: true,
      },
    ];
  },
  turbopack: {
    rules: {
      "*.svg": {
        loaders: ["@svgr/webpack"],
        as: "*.js",
      },
    },
  },
  webpack(config) {
    // Grab the existing rule that handles SVG imports
    // @ts-expect-error - rule type
    const fileLoaderRule = config.module.rules.find((rule) =>
      rule.test?.test?.(".svg")
    );

    config.module.rules.push(
      // Reapply the existing rule, but only for svg imports ending in ?url
      {
        ...fileLoaderRule,
        test: /\.svg$/i,
        resourceQuery: /url/, // *.svg?url
      },
      // Convert all other *.svg imports to React components
      {
        test: /\.svg$/i,
        issuer: fileLoaderRule.issuer,
        resourceQuery: {
          not: [...(fileLoaderRule.resourceQuery?.not || []), /url/],
        }, // exclude if *.svg?url
        use: ["@svgr/webpack"],
      }
    );

    // Modify the file loader rule to ignore *.svg, since we have it handled now.
    fileLoaderRule.exclude = /\.svg$/i;

    return config;
  },
};

export default nextConfig;
