export type StatItem = {
  label: string;
  value: string;
};

export const COMMUNITY_STATS: StatItem[] = [
  { value: "4,300+", label: "Discord Members" },
  { value: "130,000+", label: "Social Followers" },
  { value: "60+", label: "Active Mentorships" },
  { value: "20+", label: "Weekly Meetups" },
  { value: "GDE", label: "Founder: Google Developer Expert in AI & Angular" },
];

export const SPONSOR_STATS: StatItem[] = [
  { value: "4,300+", label: "Discord Members" },
  { value: "130,000+", label: "Social Followers" },
  { value: "50", label: "Participants" },
  { value: "4", label: "Confirmed Judges" },
  { value: "GDE", label: "Founder" },
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
    description:
      "Create AI tools for brand identity, content, media, or voice experiences.",
  },
  {
    title: "AI Community Board",
    description:
      "Build solutions that help developer communities collaborate and scale impact.",
  },
  {
    title: "Personal AI Trainer",
    description:
      "Design assistants that coach learning, productivity, and personal growth.",
  },
];

export type JudgeProfile = {
  name: string;
  title: string;
  experience: string;
  linkedinUrl: string;
  avatarUrl: string;
};

export const JUDGES: JudgeProfile[] = [
  {
    name: "Imran Siddiqui",
    title: "Principal Presales Architect at HP Enterprise",
    experience: "18+ years",
    linkedinUrl: "https://www.linkedin.com/in/mimrans",
    avatarUrl:
      "/static/images/events/cwa-promptathon-2026/judges/imran-siddiqui.jpg",
  },
  {
    name: "Muhammad Noman",
    title: "Principal Software Consultant at 10 Pearls",
    experience: "9+ years",
    linkedinUrl: "https://www.linkedin.com/in/mnomanmemon",
    avatarUrl:
      "/static/images/events/cwa-promptathon-2026/judges/muhammad-noman.jpg",
  },
  {
    name: "Asad Ullah Khalid",
    title: "Senior Frontend Engineer at Mercedes-Benz.io",
    experience: "6+ years",
    linkedinUrl: "https://www.linkedin.com/in/asadkhalid305/",
    avatarUrl:
      "/static/images/events/cwa-promptathon-2026/judges/asadullah-khalid.jpg",
  },
  {
    name: "Muhammad Faheem",
    title: "Senior Software Engineer at Enoch Tech",
    experience: "5+ years",
    linkedinUrl: "https://www.linkedin.com/in/mfaheemrajput/",
    avatarUrl:
      "/static/images/events/cwa-promptathon-2026/judges/muhammad-faheem.jpg",
  },
];

export type ConfirmedSponsor = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: string;
};

export const CONFIRMED_SPONSORS: ConfirmedSponsor[] = [
  {
    name: "CommandCode",
    logoUrl: "/static/images/events/cwa-promptathon-2026/sponsors/commandcode-logo.jpg",
    websiteUrl: "https://commandcode.ai",
    tier: "Tool Partner",
  },
  {
    name: "Google",
    logoUrl: "/static/images/events/cwa-promptathon-2026/sponsors/google-transparent.png",
    websiteUrl: "https://google.com",
    tier: "Tool Partner",
  },
];

export type SponsorLogoPlaceholder = {
  tierHint: string;
};

export const SPONSOR_PLACEHOLDERS: SponsorLogoPlaceholder[] = [
  { tierHint: "Spot Available" },
  { tierHint: "Spot Available" },
  { tierHint: "Spot Available" },
];

export type SponsorshipFeature = {
  name: string;
  community: string;
  gold: string;
  platinum: string;
};

export const SPONSORSHIP_FEATURES: SponsorshipFeature[] = [
  {
    name: "Social Media Mentions",
    community: "2-3 posts",
    gold: "All posts",
    platinum: "All posts",
  },
  {
    name: "Speaker Slot",
    community: "No",
    gold: "Yes",
    platinum: "1 slot",
  },
  {
    name: "CV Access for Recruitment",
    community: "No",
    gold: "No",
    platinum: "Yes",
  },
  {
    name: "Swag Distribution",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
  {
    name: "Logo on Event Page",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
  {
    name: "Logo on Stream Overlays",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
  {
    name: "Product Used in Hackathon",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
  {
    name: "Dedicated Discord Channel",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
  {
    name: "Live Demo Room",
    community: "Yes",
    gold: "Yes",
    platinum: "Yes",
  },
];
