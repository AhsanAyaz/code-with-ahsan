export type SocialPlatform = {
  label: string;
  count: number;
  url: string;
};

export const socialReach: Record<string, SocialPlatform> = {
  youtube: { label: "YouTube", count: 33000, url: "https://youtube.com/c/CodeWithAhsan" },
  instagram: { label: "Instagram", count: 64000, url: "https://instagram.com/codewithahsan" },
  facebook: { label: "Facebook", count: 57000, url: "https://facebook.com/CodeWithAhsan" },
  linkedin: { label: "LinkedIn", count: 23000, url: "https://www.linkedin.com/in/ahsanayaz" },
  github: { label: "GitHub", count: 1500, url: "https://github.com/ahsanayaz" },
  x: { label: "X", count: 2000, url: "https://twitter.com/codewith_ahsan" },
  discord: { label: "Discord", count: 4500, url: "https://discord.gg/codewithahsan" },
};
