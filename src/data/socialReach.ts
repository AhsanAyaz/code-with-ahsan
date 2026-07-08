export type SocialPlatform = {
  label: string;
  count: number;
  url: string;
  /** Suffix shown under the count on stat cards (e.g. "Subscribers"). */
  sub?: string;
};

export const socialReach: Record<string, SocialPlatform> = {
  youtube: {
    label: "YouTube",
    count: 37000,
    url: "https://youtube.com/c/CodeWithAhsan",
    sub: "Subscribers",
  },
  instagram: {
    label: "Instagram",
    count: 64000,
    url: "https://instagram.com/code.with.ahsan",
    sub: "Followers",
  },
  facebook: {
    label: "Facebook",
    count: 60000,
    url: "https://facebook.com/CodeWithAhsan",
    sub: "Followers",
  },
  linkedin: {
    label: "LinkedIn",
    count: 23000,
    url: "https://www.linkedin.com/in/ahsanayaz",
    sub: "Followers",
  },
  github: { label: "GitHub", count: 1600, url: "https://github.com/ahsanayaz", sub: "Followers" },
  x: { label: "X", count: 2000, url: "https://twitter.com/codewith_ahsan", sub: "Followers" },
  tiktok: {
    label: "TikTok",
    count: 10500,
    url: "https://tiktok.com/@codewithahsan",
    sub: "Followers",
  },
  discord: {
    label: "Discord",
    count: 5200,
    url: "https://codewithahsan.dev/discord",
    sub: "Members",
  },
  newsletter: {
    label: "Newsletter",
    count: 2100,
    url: "https://blog.codewithahsan.dev/#/portal/signup",
    sub: "Subscribers",
  },
};
