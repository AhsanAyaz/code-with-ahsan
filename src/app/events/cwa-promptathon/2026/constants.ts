export type StatItem = {
  label: string;
  value: string;
};

export const COMMUNITY_STATS: StatItem[] = [
  { value: "4,300+", label: "Discord Members" },
  { value: "130,000+", label: "Social Followers" },
  { value: "60+", label: "Active Mentorships" },
  { value: "20+", label: "Weekly Meetups" },
  { value: "GDE", label: "Founder in AI & Angular" },
];

export type EventMilestone = {
  title: string;
  dateTime: string;
};

export const EVENT_MILESTONES: EventMilestone[] = [
  { title: "Theme Reveal", dateTime: "20 March 2026, 10:00 AM" },
  { title: "Hackathon Kickoff", dateTime: "28 March 2026, 10:00 AM" },
  { title: "Submission Deadline", dateTime: "28 March 2026, 5:00 PM" },
  { title: "Winners Announced", dateTime: "28 March 2026, 7:00 PM" },
];

export type ThemeItem = {
  title: string;
  description: string;
};

export const HACKATHON_THEMES: ThemeItem[] = [
  {
    title: "AI Brand Architect",
    description: "Create AI tools for brand identity, content, media, or voice experiences.",
  },
  {
    title: "AI Community Board",
    description: "Build solutions that help developer communities collaborate and scale impact.",
  },
  {
    title: "Personal AI Trainer",
    description: "Design assistants that coach learning, productivity, and personal growth.",
  },
];

export type JudgePlaceholder = {
  role: string;
};

export const JUDGES_PLACEHOLDERS: JudgePlaceholder[] = [
  { role: "Judge" },
  { role: "Mentor" },
  { role: "Judge" },
  { role: "Mentor" },
];

export type SponsorLogoPlaceholder = {
  tierHint: string;
};

export const SPONSOR_PLACEHOLDERS: SponsorLogoPlaceholder[] = [
  { tierHint: "Tool Partner" },
  { tierHint: "Community Partner" },
  { tierHint: "Platinum / Gold" },
  { tierHint: "Silver / Bronze" },
];

export type SponsorshipFeature = {
  name: string;
  platinum: string;
  gold: string;
  silver: string;
  bronze: string;
};

export const SPONSORSHIP_FEATURES: SponsorshipFeature[] = [
  {
    name: "Social Media Mentions",
    platinum: "All posts",
    gold: "Partial posts",
    silver: "2-3 posts",
    bronze: "1-2 posts",
  },
  {
    name: "Speaker Slot",
    platinum: "1 slot",
    gold: "1 slot",
    silver: "-",
    bronze: "-",
  },
  {
    name: "CV Access for Recruitment",
    platinum: "Yes",
    gold: "No",
    silver: "No",
    bronze: "No",
  },
  {
    name: "Swag Distribution",
    platinum: "Yes",
    gold: "Yes",
    silver: "Yes",
    bronze: "Yes",
  },
  {
    name: "Logo on Event Page",
    platinum: "Yes",
    gold: "Yes",
    silver: "Yes",
    bronze: "No",
  },
  {
    name: "Logo on Stream Overlays",
    platinum: "Yes",
    gold: "Yes",
    silver: "No",
    bronze: "No",
  },
  {
    name: "Product Used in Hackathon",
    platinum: "Yes",
    gold: "Yes",
    silver: "Yes",
    bronze: "No",
  },
  {
    name: "Dedicated Discord Channel",
    platinum: "Yes",
    gold: "Yes",
    silver: "No",
    bronze: "No",
  },
  {
    name: "Live Demo Room",
    platinum: "Yes",
    gold: "Yes",
    silver: "No",
    bronze: "No",
  },
];
