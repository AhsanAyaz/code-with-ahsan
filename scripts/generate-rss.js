const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");

// Simple version of getAllFilesFrontMatter to avoid import issues with ES modules in scripts
const getAllFilesFrontMatter = (folder) => {
  const prefixPaths = path.join(process.cwd(), "src", "data", folder);

  if (!fs.existsSync(prefixPaths)) {
    console.warn(`Data directory not found for RSS: ${prefixPaths}`);
    return [];
  }

  const files = fs.readdirSync(prefixPaths);

  const allFrontMatter = files.map((file) => {
    // check prefixPaths is directory
    const source = fs.readFileSync(path.join(prefixPaths, file), "utf8");
    const { data } = matter(source);
    if (data.draft !== true) {
      return {
        ...data,
        slug: file.replace(".mdx", "").replace(".md", ""),
      };
    }
  });

  // Filter out drafts and sort by date
  return allFrontMatter
    .filter(Boolean)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

const siteMetadata = require("../src/data/siteMetadata");

const escape = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const generateRssItem = (post) => `
  <item>
    <guid>${siteMetadata.siteUrl}/blog/${post.slug}</guid>
    <title>${escape(post.title)}</title>
    <link>${siteMetadata.siteUrl}/blog/${post.slug}</link>
    ${post.summary && `<description>${escape(post.summary)}</description>`}
    <pubDate>${new Date(post.date).toUTCString()}</pubDate>
    <author>${siteMetadata.email} (${siteMetadata.author})</author>
    ${post.tags && post.tags.map((t) => `<category>${t}</category>`).join("")}
  </item>
`;

const generateRss = (posts, page = "feed.xml") => `
  <rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
    <channel>
      <title>${escape(siteMetadata.title)}</title>
      <link>${siteMetadata.siteUrl}/blog</link>
      <description>${escape(siteMetadata.description)}</description>
      <language>${siteMetadata.language}</language>
      <managingEditor>${siteMetadata.email} (${
        siteMetadata.author
      })</managingEditor>
      <webMaster>${siteMetadata.email} (${siteMetadata.author})</webMaster>
      <lastBuildDate>${new Date(posts[0].date).toUTCString()}</lastBuildDate>
      <atom:link href="${
        siteMetadata.siteUrl
      }/${page}" rel="self" type="application/rss+xml"/>
      ${posts.map(generateRssItem).join("")}
    </channel>
  </rss>
`;

(async () => {
  const posts = getAllFilesFrontMatter("blog");

  if (posts.length > 0) {
    const rss = generateRss(posts);
    fs.writeFileSync("./public/feed.xml", rss);
    console.log("RSS Feed generated at public/feed.xml");
  }
})();
