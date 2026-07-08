export type SocialPlatform = {
  label: string;
  count: number;
  url: string;
};

export const socialReach: Record<string, SocialPlatform> = {
  youtube: { label: "YouTube", count: 37000, url: "https://youtube.com/c/CodeWithAhsan" },
  instagram: { label: "Instagram", count: 64000, url: "https://instagram.com/code.with.ahsan" },
  facebook: { label: "Facebook", count: 60000, url: "https://facebook.com/CodeWithAhsan" },
  linkedin: { label: "LinkedIn", count: 23000, url: "https://www.linkedin.com/in/ahsanayaz" },
  github: { label: "GitHub", count: 1600, url: "https://github.com/ahsanayaz" },
  x: { label: "X", count: 2000, url: "https://twitter.com/codewith_ahsan" },
  tiktok: { label: "TikTok", count: 10500, url: "https://tiktok.com/@codewithahsan" },
  discord: { label: "Discord", count: 5200, url: "https://codewithahsan.dev/discord" },
};
