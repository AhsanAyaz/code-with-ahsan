export interface ContentResource {
  label: string;
  url: string;
  active?: boolean;
  [key: string]: unknown;
}

export interface AuthorContent {
  name: string;
  bio?: string;
  avatar?: {
    url?: string;
    [key: string]: unknown;
  } | null;
  meta?: {
    socials?: Record<string, string>;
  };
  [key: string]: unknown;
}

export interface PostContent {
  id: number;
  title: string;
  slug: string;
  description?: string;
  type?: string;
  videoUrl?: string;
  article?: string;
  hasAssignment?: boolean;
  order?: number;
  publishedAt?: string | null;
  chapter?: {
    id: number;
    name: string;
  } | null;
  resources?: ContentResource[];
  [key: string]: unknown;
}

export interface ChapterContent {
  id: number;
  name: string;
  description?: string;
  showName?: boolean;
  order?: number;
  posts: PostContent[];
}

export interface CourseContent {
  id: number;
  name: string;
  description?: string;
  outline?: string;
  videoUrls?: string[];
  publishedAt?: string | null;
  duration?: string | null;
  resources?: ContentResource[];
  banner?: {
    url?: string;
    [key: string]: unknown;
  } | null;
  introVideoUrl?: string;
  slug: string;
  isExternal?: boolean;
  externalCourseUrl?: string | null;
  externalStudentsCount?: number | null;
  visibilityOrder?: number | null;
  isVisible?: boolean;
  authors: AuthorContent[];
  chapters: ChapterContent[];
}

export interface BannerContent {
  id: number;
  content: string;
  isActive: boolean;
  dismissable: boolean;
  publishedAt?: string | null;
}

export interface RateCardContent {
  id: number;
  title: string;
  slug: string;
  description?: string;
  article?: string;
  resources?: ContentResource[];
}

export type EventType = "workshop" | "hackathon" | "tech-talk" | "webinar" | "conference" | "other";
export type EventStatus = "upcoming" | "completed" | "cancelled";

export interface EventContent {
  slug: string;
  title: string;
  description: string;
  type: EventType;
  date: string;                  // ISO date string
  endDate?: string | null;
  location?: string | null;
  speaker?: string | null;
  bannerImage?: string | null;
  dedicatedRoute?: string | null;
  isVisible?: boolean;
  status: EventStatus;
  visibilityOrder?: number;
  body: string;                  // MDX content (markdown only)
}
