export type SocialPlatform = {
  label: string;
  count: number;
  url: string;
};

export const socialReach: Record<string, SocialPlatform> = {
  youtube: { label: "YouTube", count: 15000, url: "https://youtube.com/c/CodeWithAhsan" },
  instagram: { label: "Instagram", count: 5000, url: "https://instagram.com/codewithahsan" },
  facebook: { label: "Facebook", count: 10000, url: "https://facebook.com/CodeWithAhsan" },
  linkedin: { label: "LinkedIn", count: 8000, url: "https://www.linkedin.com/in/ahsanayaz" },
  github: { label: "GitHub", count: 2000, url: "https://github.com/ahsanayaz" },
  x: { label: "X", count: 3000, url: "https://twitter.com/codewith_ahsan" },
};
