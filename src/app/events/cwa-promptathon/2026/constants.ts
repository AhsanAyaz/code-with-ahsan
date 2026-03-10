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
      "https://media.licdn.com/dms/image/v2/D4D03AQHSxewilpWE9w/profile-displayphoto-crop_800_800/B4DZxX59rOJ8AM-/0/1771001340116?e=1773878400&v=beta&t=L_O4YqFD79gvEnJbe9EVKmbcmIBTSMKbgU5aW5IIbOU",
  },
  {
    name: "Muhammad Noman",
    title: "Principal Software Consultant at 10 Pearls",
    experience: "9+ years",
    linkedinUrl: "https://www.linkedin.com/in/mnomanmemon",
    avatarUrl:
      "https://media.licdn.com/dms/image/v2/C4D03AQFqEykx6PGlaA/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1663789669818?e=1773878400&v=beta&t=2uUBASpllh1HSJaiqInEb9C4aVQT5tazTaleq5aMpWw",
  },
  {
    name: "Asad Ullah Khalid",
    title: "Senior Frontend Engineer at Mercedes-Benz.io",
    experience: "6+ years",
    linkedinUrl: "https://www.linkedin.com/in/asadkhalid305/",
    avatarUrl:
      "https://media.licdn.com/dms/image/v2/D4E03AQGk0ry36qwAsA/profile-displayphoto-shrink_800_800/B4EZQnyeDxHEAk-/0/1735834329848?e=1773878400&v=beta&t=-V4-7FVIORu5avV-4rBvCwtvyiH4gIIsNzb4xDQfQhU",
  },
  {
    name: "Muhammad Faheem",
    title: "Senior Software Engineer at Enoch Tech",
    experience: "5+ years",
    linkedinUrl: "https://www.linkedin.com/in/mfaheemrajput/",
    avatarUrl:
      "https://media.licdn.com/dms/image/v2/D4E03AQGGpdSeA3SVUg/profile-displayphoto-shrink_800_800/profile-displayphoto-shrink_800_800/0/1706203960476?e=1774483200&v=beta&t=o3atr4RehbXqwRsQHRWPQaTtUUk3qRgK3aCQvujIG34",
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
