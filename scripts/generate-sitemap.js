const fs = require("fs");
const globby = require("globby");
const prettier = require("prettier");
const siteMetadata = require("../src/data/siteMetadata");

require("dotenv").config();
const qs = require("qs");
const axios = require("axios");
const { STRAPI_COURSE_POPULATE_OBJ } = require("../src/lib/strapiQueryHelpers");

// Headers config
axios.defaults.headers.common["Authorization"] =
  `Bearer ${process.env.STRAPI_API_KEY}`;

const getCourses = async () => {
  const strapiUrl = process.env.STRAPI_URL;
  const strapiAPIKey = process.env.STRAPI_API_KEY;
  const query = qs.stringify(
    {
      populate: STRAPI_COURSE_POPULATE_OBJ,
      sort: ["publishedAt:desc"],
    },
    {
      encodeValuesOnly: true,
    }
  );
  const url = `${strapiUrl}/api/courses?${query}`;
  const coursesResp = await axios.get(url, {
    headers: {
      "Content-Type": "application/json",
      "X-Requested-With": "XMLHttpRequest",
      Authorization: `Bearer ${strapiAPIKey}`,
    },
  });
  const courses = coursesResp.data.data;
  return courses;
};

(async () => {
  const prettierConfig = await prettier.resolveConfig("./.prettierrc.js");
  const pages = await globby([
    "src/app/**/page.{tsx,ts,jsx,js}",

    "!src/app/**/[*/**", // Exclude dynamic routes
    "!src/app/api/**",
  ]);
  const paths = [];
  const courses = await getCourses();
  courses.map((course) => {
    const { slug: courseSlug, chapters } = course;
    paths.push(`/courses/${courseSlug}`);
    chapters.map((chapter) => {
      const { posts } = chapter;
      posts.map((post) => {
        const { slug: postSlug } = post;
        paths.push(`/courses/${courseSlug}/${postSlug}`);
      });
      paths.push(`/courses/${courseSlug}/resources`);
      paths.push(`/courses/${courseSlug}/submissions`);
    });
  });

  const sitemap = `
        <?xml version="1.0" encoding="UTF-8"?>
        <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
            ${[...pages, ...paths]
              .map((page) => {
                let path = page
                  .replace("src/app", "")
                  .replace("public/", "/")
                  .replace(/\/\([^)]+\)/g, "") // Remove route groups like (marketing)
                  .replace(/\/page\.[a-z]+$/, ""); // Remove /page.tsx, /page.js

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

  // eslint-disable-next-line no-sync
  fs.writeFileSync("public/sitemap.xml", formatted);
})();
