const fs = require("fs");
const globby = require("globby");
const prettier = require("prettier");
const siteMetadata = require("../src/data/siteMetadata");
const coursesData = require("../src/content/courses.json");

(async () => {
  const prettierConfig = await prettier.resolveConfig("./.prettierrc.js");
  const pages = await globby([
    "src/app/**/page.{tsx,ts,jsx,js}",
    "!src/app/**/[*/**",
    "!src/app/api/**",
  ]);

  const paths = [];
  const courses = coursesData?.courses || [];

  courses.forEach((course) => {
    const courseSlug = course.slug;
    paths.push(`/courses/${courseSlug}`);

    (course.chapters || []).forEach((chapter) => {
      (chapter.posts || []).forEach((post) => {
        if (!post?.slug) return;
        paths.push(`/courses/${courseSlug}/${post.slug}`);
      });
    });

    paths.push(`/courses/${courseSlug}/resources`);
    paths.push(`/courses/${courseSlug}/submissions`);
  });

  const sitemap = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${[...pages, ...paths]
              .map((page) => {
                let path = page
                  .replace("src/app", "")
                  .replace("public/", "/")
                  .replace(/\/\([^)]+\)/g, "")
                  .replace(/\/page\.[a-z]+$/, "");

                const route = path === "/index" || path === "" ? "" : path;
                if (page === `pages/404.js`) {
                  return;
                }
                return `
                        <url>
                            <loc>${siteMetadata.siteUrl}${route}</loc>
                        </url>
                    `;
              })
              .join("")}
        </urlset>
    `;

  const formatted = await prettier.format(sitemap, {
    ...prettierConfig,
    parser: "html",
  });

  fs.writeFileSync("public/sitemap.xml", formatted);
})();
