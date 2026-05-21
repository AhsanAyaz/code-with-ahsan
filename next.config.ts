import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@loupeink/web-sdk"],
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: "https", hostname: "media.giphy.com" },
      { protocol: "https", hostname: "github.com" },
      { protocol: "https", hostname: "avatars.githubusercontent.com" },
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "img.buymeacoffee.com" },
      { protocol: "https", hostname: "media1.tenor.com" },
      { protocol: "https", hostname: "cdn.jsdelivr.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "firebasestorage.googleapis.com" },
      { protocol: "https", hostname: "unavatar.io" },
      { protocol: "https", hostname: "media.licdn.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
    ],
  },
  async rewrites() {
    // Track 4 (Quick 260521-jsd): the previous /blog/:path* rewrite is intentionally
    // removed and replaced by a 301 redirect in redirects() below. Rewrites mask the
    // URL so Google keeps the www-indexed copy alive; a 301 lets Google migrate the
    // index entry to the blog subdomain (the desired behaviour).
    return [];
  },
  async redirects() {
    return [
      {
        source: "/how-to-gde-urdu",
        destination: "https://www.instagram.com/reel/DTQuzaIjgPS/",
        permanent: true,
      },
      {
        source: "/events/cwa-promptathon/2026/sponsorships",
        destination: "/events/cwa-promptathon/2026/sponsorship",
        permanent: true,
      },
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
      {
        source: "/dinq-giveaway",
        destination:
          "https://n8n.codewithahsan.dev/form/42d5787c-cba9-457e-b05e-a1116d5d1c3f",
        permanent: true,
      },
      { source: "/mas-raffle", destination: "/raffle", permanent: true },
      { source: "/admin/mas-raffle", destination: "/admin/raffle", permanent: true },
      { source: "/api/mas-raffle/:path*", destination: "/api/raffle/:path*", permanent: true },

      // === Track 4 (Quick 260521-jsd): GSC 404 cleanup, 26 of 27 rows from secure/gsc_404_may_2026/Table.csv.
      // The 27th row — https://blog.codewithahsan.dev/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide/ —
      // is on the blog subdomain (different deploy target), out of scope for this app's redirects. Documented in SUMMARY. ===

      // Group A — 11 explicit per-slug rules for ahsync-bytes-weekly-digest-* → /community (newsletter content lives there now).
      // Per-slug (no :rest* catch-all) to avoid path-to-regexp within-segment matching fragility.
      // CSV row: /ahsync-bytes-weekly-digest-18th-may-2026/
      { source: "/ahsync-bytes-weekly-digest-18th-may-2026", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-23rd-feb-2026/
      { source: "/ahsync-bytes-weekly-digest-23rd-feb-2026", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-16th-feb-2026/
      { source: "/ahsync-bytes-weekly-digest-16th-feb-2026", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-13th-oct-2025/
      { source: "/ahsync-bytes-weekly-digest-13th-oct-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-1st-dec-2025/
      { source: "/ahsync-bytes-weekly-digest-1st-dec-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-5th-jan-2026/
      { source: "/ahsync-bytes-weekly-digest-5th-jan-2026", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-8th-dec-2025/
      { source: "/ahsync-bytes-weekly-digest-8th-dec-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-15th-sep-2025/
      { source: "/ahsync-bytes-weekly-digest-15th-sep-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-22nd-sep-2025/
      { source: "/ahsync-bytes-weekly-digest-22nd-sep-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-29th-dec-2025/
      { source: "/ahsync-bytes-weekly-digest-29th-dec-2025", destination: "/community", permanent: true },
      // CSV row: /ahsync-bytes-weekly-digest-7th-july-2025/
      { source: "/ahsync-bytes-weekly-digest-7th-july-2025", destination: "/community", permanent: true },

      // Group B — /tags/* → / (legacy tag system gone)
      // CSV row: /tags/github
      { source: "/tags/:rest*", destination: "/", permanent: true },

      // Group C — /home → / (CSV row: /home)
      { source: "/home", destination: "/", permanent: true },

      // Group D — typo / standalone paths
      // CSV rows: /preDid, /logic-
      { source: "/preDid", destination: "/", permanent: true },
      { source: "/logic-", destination: "/", permanent: true },

      // Group D-bis — /ng-book (both apex + www variants in CSV) → Angular Cookbook 2E Amazon page.
      // siteMetadata.ngBook (used by AboutContent.tsx) is repointed to the SAME URL in src/data/siteMetadata.js,
      // so the internal CTA + external 301 converge on the live destination.
      // CSV rows: https://codewithahsan.dev/ng-book, https://www.codewithahsan.dev/ng-book
      { source: "/ng-book", destination: "https://www.amazon.com/Angular-Cookbook-actionable-recipes-developers-ebook/dp/B0C3MG5X99", permanent: true },

      // Group E — Legacy /blog/* → blog subdomain (REPLACES the previous rewrite for SEO 301 migration)
      // CSV rows: /blog/css-box-model, /blog/angular-unit-tests-constructor-not-compatible-with-angular-dependency-injection,
      //          /blog/extend-angular-built-in-pipes, /blog/the-most-easy-way-to-add-update-and-delete-contacts-in-flutter,
      //          /blog/flutter-marketplace-app-with-stripe/part-1
      { source: "/blog/:path*", destination: "https://blog.codewithahsan.dev/:path*", permanent: true },

      // Group F — Deep blog slugs that were never under /blog/ (top-level legacy posts) → blog subdomain at same slug
      // CSV rows: how-i-made-contributing-..., zero-to-3d-..., 10-mind-blowing-ways-..., how-to-pre-render-dynamic-routes-...
      { source: "/how-i-made-contributing-to-an-open-source-firebase-app-10x-easier-and-what-ai-got-wrong-along-the-way", destination: "https://blog.codewithahsan.dev/how-i-made-contributing-to-an-open-source-firebase-app-10x-easier-and-what-ai-got-wrong-along-the-way", permanent: true },
      { source: "/zero-to-3d-building-a-gesture-controlled-particle-system-with-one-prompt", destination: "https://blog.codewithahsan.dev/zero-to-3d-building-a-gesture-controlled-particle-system-with-one-prompt", permanent: true },
      { source: "/10-mind-blowing-ways-to-use-gemini-cli-that-arent-just-write-code", destination: "https://blog.codewithahsan.dev/10-mind-blowing-ways-to-use-gemini-cli-that-arent-just-write-code", permanent: true },
      { source: "/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide", destination: "https://blog.codewithahsan.dev/how-to-pre-render-dynamic-routes-in-angular-a-practical-guide", permanent: true },
    ];
  },
  turbopack: {
    root: "..",
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
