import qs from "qs";
import type {
  BannerContent,
  CourseContent,
  PostContent,
  RateCardContent,
} from "@/types/content";
import {
  getLocalBanners,
  getLocalCourseBySlug,
  getLocalCourses,
  getLocalPostBySlug,
  getLocalRateCard,
} from "@/lib/content/localContent";

type ProviderMode = "local" | "strapi" | "dual";

function getProviderMode(): ProviderMode {
  const mode = (process.env.CONTENT_PROVIDER || "local").toLowerCase();
  if (mode === "strapi" || mode === "dual") return mode;
  return "local";
}

function shouldCompareDualRead(): boolean {
  return process.env.CONTENT_DUALREAD_COMPARE === "true";
}

async function strapiFetch(path: string) {
  const strapiUrl = process.env.STRAPI_URL;
  const strapiAPIKey = process.env.STRAPI_API_KEY;
  if (!strapiUrl || !strapiAPIKey) return null;

  const resp = await fetch(`${strapiUrl}${path}`, {
    headers: {
      Authorization: `Bearer ${strapiAPIKey}`,
      "Content-Type": "application/json",
    },
    next: { revalidate: 60 },
  });

  if (!resp.ok) return null;
  return resp.json();
}

async function getStrapiCourses(): Promise<CourseContent[]> {
  const query = qs.stringify(
    {
      sort: ["visibilityOrder:desc"],
      filters: { publishedAt: { $notNull: true } },
      populate: {
        authors: { fields: ["name", "bio"], populate: { avatar: true } },
        chapters: {
          fields: ["name", "description", "showName", "order"],
          populate: {
            posts: {
              fields: [
                "title",
                "slug",
                "description",
                "type",
                "videoUrl",
                "order",
              ],
            },
          },
        },
        banner: true,
        resources: { fields: ["*"] },
      },
    },
    { encodeValuesOnly: true }
  );

  const data = await strapiFetch(`/api/courses?${query}`);
  return (data?.data || []) as CourseContent[];
}

async function getStrapiCourseBySlug(slug: string): Promise<CourseContent | null> {
  const query = qs.stringify(
    {
      filters: { slug: { $eq: slug } },
      populate: {
        authors: { fields: ["name", "bio"], populate: { avatar: true } },
        chapters: {
          fields: ["name", "description", "showName", "order"],
          populate: {
            posts: {
              fields: [
                "title",
                "slug",
                "description",
                "type",
                "videoUrl",
                "order",
              ],
            },
          },
        },
        banner: true,
        resources: { fields: ["*"] },
      },
    },
    { encodeValuesOnly: true }
  );

  const data = await strapiFetch(`/api/courses?${query}`);
  return ((data?.data || [])[0] as CourseContent) || null;
}

async function getStrapiPostBySlug(slug: string): Promise<PostContent | null> {
  const query = qs.stringify(
    {
      fields: ["title", "slug", "description", "type", "videoUrl", "article", "hasAssignment"],
      filters: { slug: { $eq: slug } },
      populate: {
        chapter: { fields: ["name"] },
        resources: { fields: ["*"] },
      },
    },
    { encodeValuesOnly: true }
  );
  const data = await strapiFetch(`/api/posts?${query}`);
  return ((data?.data || [])[0] as PostContent) || null;
}

async function getStrapiBanners(): Promise<BannerContent[]> {
  const query = qs.stringify(
    {
      sort: ["id:ASC"],
      pagination: { page: 1, pageSize: 25 },
    },
    { encodeValuesOnly: true }
  );
  const data = await strapiFetch(`/api/banners?${query}`);
  const banners = ((data?.data || []) as BannerContent[]).map((banner) => ({
    ...banner,
    isActive: banner.isActive !== false,
    dismissable: !!banner.dismissable,
  }));
  return banners.filter((banner) => banner.isActive);
}

async function getStrapiRateCard(): Promise<RateCardContent | null> {
  const rateDocId = process.env.STRAPI_RATE_CARD_DOC_ID || "tyzwd2y813dr8sldugy0y51l";
  const query = qs.stringify(
    {
      fields: ["title", "slug", "description", "article"],
      filters: {
        documentId: { $eq: rateDocId },
      },
      populate: {
        resources: { fields: ["*"] },
      },
    },
    { encodeValuesOnly: true }
  );
  const data = await strapiFetch(`/api/posts?${query}`);
  return ((data?.data || [])[0] as RateCardContent) || null;
}

function logDualMismatch(kind: string, details: Record<string, unknown>) {
  console.warn(`[content-dual-read-mismatch] ${kind}`, details);
}

export async function getCourses(): Promise<CourseContent[]> {
  const mode = getProviderMode();
  const local = getLocalCourses();

  if (mode === "local") return local;

  const remote = await getStrapiCourses();
  if (mode === "strapi") return remote;

  if (shouldCompareDualRead() && local.length !== remote.length) {
    logDualMismatch("courses-length", { local: local.length, strapi: remote.length });
  }
  return local;
}

export async function getCourseBySlug(slug: string): Promise<CourseContent | null> {
  const mode = getProviderMode();
  const local = getLocalCourseBySlug(slug);

  if (mode === "local") return local;

  const remote = await getStrapiCourseBySlug(slug);
  if (mode === "strapi") return remote;

  if (shouldCompareDualRead() && !!local !== !!remote) {
    logDualMismatch("course-found", { slug, local: !!local, strapi: !!remote });
  }

  return local;
}

export async function getPostBySlug(slug: string): Promise<PostContent | null> {
  const mode = getProviderMode();
  const local = getLocalPostBySlug(slug);

  if (mode === "local") return local;

  const remote = await getStrapiPostBySlug(slug);
  if (mode === "strapi") return remote;

  if (shouldCompareDualRead() && !!local !== !!remote) {
    logDualMismatch("post-found", { slug, local: !!local, strapi: !!remote });
  }

  return local;
}

export async function getBanners(): Promise<BannerContent[]> {
  const mode = getProviderMode();
  const local = getLocalBanners();

  if (mode === "local") return local;

  const remote = await getStrapiBanners();
  if (mode === "strapi") return remote;

  if (shouldCompareDualRead() && local.length !== remote.length) {
    logDualMismatch("banners-length", { local: local.length, strapi: remote.length });
  }

  return local;
}

export async function getRateCard(): Promise<RateCardContent | null> {
  const mode = getProviderMode();
  const local = getLocalRateCard();

  if (mode === "local") return local;

  const remote = await getStrapiRateCard();
  if (mode === "strapi") return remote;

  if (shouldCompareDualRead() && !!local !== !!remote) {
    logDualMismatch("rate-card-found", { local: !!local, strapi: !!remote });
  }

  return local;
}
