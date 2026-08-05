import type { HackathonTwist } from "@/types/events";

// ─── Font switch ─────────────────────────────────────────────────────────────
// Set to false to use Rubik (site default) for all headings instead of Bebas Neue.
const USE_BEBAS_HEADINGS = true;
export const headingFont = USE_BEBAS_HEADINGS
  ? "var(--font-bebas, 'Bebas Neue', sans-serif)"
  : "var(--font-rubik, 'Rubik', sans-serif)";

// ─── Section anchors ─────────────────────────────────────────────────────────
// Used for in-page scrolling (e.g. the hero "Become a Sponsor" button).
export const SECTION_IDS = {
  sponsorshipPackages: "sponsorship-packages",
  sponsors: "our-sponsors",
  schedule: "schedule",
  mentors: "mentors",
  judges: "judges",
  venue: "venue",
  contact: "contact",
  organizers: "organizers",
} as const;

// ─── Event meta ──────────────────────────────────────────────────────────────
// CWA Ship Karachi 2026 is a single-day, ON-SITE hackathon. A short community
// kick-off opens the day, but the whole event is one hackathon track.
// TODO: confirm the venue and lock the exact day (17 vs 18 September).
const EVENT_PATH = "/events/cwa-ship-karachi/2026";
const ORGANIZER_IMG = "/static/images/events/cwa-ship-karachi-2026/organizers";

export const EVENT = {
  /** Firestore document id — events/{eventId}/winners/data */
  eventId: "cwa-ship-karachi-2026",
  path: EVENT_PATH,
  name: "CWA Ship Karachi 2026",
  kicker: "One-Day Hackathon",
  tagline: "One day. One track. On-site.",
  theme: "Building with AI",
  /** Human-facing date. The exact day is not locked yet. */
  dateLabel: "17 or 18 September 2026",
  timeLabel: "9:00 AM – 6:00 PM",
  /** Countdown target (local time). Uses the earlier of the two candidate days. */
  isoStart: "2026-09-17T09:00:00",
  locationShort: "On-site · Karachi, PK",
  registerUrl: "https://forms.gle/davuSPGjiDxTLkte6",
  sponsorshipUrl: `${EVENT_PATH}/sponsorship`,
} as const;

export type StatItem = {
  label: string;
  value: string;
};

export const COMMUNITY_STATS: StatItem[] = [
  { value: "5,200+", label: "Discord Members" },
  { value: "130,000+", label: "Social Followers" },
  { value: "60+", label: "Active Mentorships" },
  { value: "20+", label: "Weekly Meetups" },
  { value: "GDE", label: "Founder: Google Developer Expert in AI & Angular" },
];

export type ThemeItem = {
  title: string;
  description: string;
};

export const HACKATHON_THEMES: ThemeItem[] = [
  {
    title: "TBD - 01",
    description:
      "Build AI-powered tools that enhance productivity, creativity, and collaboration for developers.",
  },
  {
    title: "TBD - 02",
    description:
      "Create AI-driven solutions that improve accessibility, inclusivity, and user experience in digital products.",
  },
  {
    title: "TBD - 03",
    description:
      "Develop AI applications that leverage data analytics, machine learning, and natural language processing to solve real-world problems.",
  },
];

// ─── Judges ──────────────────────────────────────────────────────────────────
// `quote` is rendered only when non-empty.
// TODO: collect a short line from each judge before the event — do not invent one.
export type JudgeProfile = {
  name: string;
  position: string;
  company: string;
  experience: string;
  quote: string;
  linkedinUrl: string;
  avatarUrl: string;
};

export const JUDGES: JudgeProfile[] = [
  {
    name: "TBD - 01",
    position: "------------",
    company: "-------------",
    experience: "",
    quote: "",
    linkedinUrl: "",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/judges/tbd.svg",
  },
  {
    name: "TBD - 02",
    position: "------------",
    company: "-------------",
    experience: "",
    quote: "",
    linkedinUrl: "",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/judges/tbd.svg",
  },
  {
    name: "TBD - 03",
    position: "------------",
    company: "-------------",
    experience: "",
    quote: "",
    linkedinUrl: "",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/judges/tbd.svg",
  },
];

// ─── Mentors ─────────────────────────────────────────────────────────────────
// Mentors guide the teams through the build sprint (they do not give talks).
// Every mentor currently points at the shared tbd.svg placeholder. Swap an
// individual `avatarUrl` to a real file as each headshot arrives.
// TODO: confirm each mentor's position, organisation and years of experience.
export type MentorProfile = {
  name: string;
  experience: string;
  position: string;
  /** Company or university the mentor is currently with. */
  organization: string;
  avatarUrl: string;
};

export const MENTOR_PROFILES: MentorProfile[] = [
  {
    name: "Mentor - 01",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/mentors/tbd.svg",
  },
  {
    name: "Mentor - 02",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/mentors/tbd.svg",
  },
  {
    name: "Mentor - 03",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/mentors/tbd.svg",
  },
  {
    name: "Mentor - 04",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/mentors/tbd.svg",
  },
  {
    name: "Mentor - 05",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: "/static/images/events/cwa-ship-karachi-2026/mentors/tbd.svg",
  },
];

/** Name-only list consumed by the host/presenter deck. */
export const MENTORS: string[] = MENTOR_PROFILES.map((mentor) => mentor.name);

// ─── Organisers ──────────────────────────────────────────────────────────────
// Social handles are stored WITHOUT the leading "@"; an empty string hides that
// link on the card. Drop headshots into
// public/static/images/events/cwa-ship-karachi-2026/organizers/ using the
// filename in `avatarUrl` — the card falls back to initials until then.
// TODO: confirm each organiser's role, handles and email.
export type Organizer = {
  name: string;
  title: string;
  linkedin: string;
  instagram: string;
  email: string;
  avatarUrl: string;
};

export const ORGANIZER_PROFILES: Organizer[] = [
  {
    name: "Organizer - 01",
    title: "TODO",
    linkedin: "",
    instagram: "",
    email: "",
    avatarUrl: `${ORGANIZER_IMG}/tbd.svg`,
  },
  {
    name: "Organizer - 02",
    title: "TODO",
    linkedin: "",
    instagram: "",
    email: "",
    avatarUrl: `${ORGANIZER_IMG}/tbd.svg`,
  },
  {
    name: "Organizer - 03",
    title: "TODO",
    linkedin: "",
    instagram: "",
    email: "",
    avatarUrl: `${ORGANIZER_IMG}/tbd.svg`,
  },
  {
    name: "Organizer - 04",
    title: "TODO",
    linkedin: "",
    instagram: "",
    email: "",
    avatarUrl: `${ORGANIZER_IMG}/tbd.svg`,
  },
  {
    name: "Organizer - 05",
    title: "TODO",
    linkedin: "",
    instagram: "",
    email: "",
    avatarUrl: `${ORGANIZER_IMG}/tbd.svg`,
  },
];

/** Name-only list consumed by the host/presenter deck. */
export const ORGANIZERS: string[] = ORGANIZER_PROFILES.map((organizer) => organizer.name);

// ─── Contacts ────────────────────────────────────────────────────────────────
// TODO: confirm Maham's role title and add both headshots.
export type ContactPerson = {
  role: string;
  name: string;
  title: string;
  email: string;
  avatarUrl: string;
};

const CONTACT_IMG = "/static/images/events/cwa-ship-karachi-2026/contacts";

export const CONTACTS: ContactPerson[] = [
  {
    role: "Primary Contact",
    name: "Maham Tahir",
    title: "Community Manager",
    email: "maham.tahir@visionwise.solutions",
    avatarUrl: `${CONTACT_IMG}/maham-tahir.jpeg`,
  },
  {
    role: "Secondary Contact",
    name: "Muhammad Ahsan Ayaz",
    title: "Founder, Code With Ahsan",
    email: "ahsan.ubitian@gmail.com",
    avatarUrl: `${CONTACT_IMG}/ahsan-ayaz.jpeg`,
  },
];

export const SPONSOR_STATS: StatItem[] = [
  { value: "5,200+", label: "Discord Members" },
  { value: "130,000+", label: "Social Followers" },
  { value: "50", label: "Participants" }, // TODO: confirm the participant cap
  { value: String(JUDGES.length), label: "Confirmed Judges" },
  { value: "GDE", label: "Founder" },
];

export type ConfirmedSponsor = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: string;
};

const SPONSOR_IMG = "/static/images/events/cwa-ship-karachi-2026/sponsors";

export const CONFIRMED_SPONSORS: ConfirmedSponsor[] = [
  {
    name: "SP - 01",
    logoUrl: `${SPONSOR_IMG}/tbd.svg`,
    websiteUrl: "https://example.com",
    tier: "TODO",
  },
  {
    name: "SP - 02",
    logoUrl: `${SPONSOR_IMG}/tbd.svg`,
    websiteUrl: "https://example.com",
    tier: "TODO",
  },
];

export type SponsorLogoPlaceholder = {
  tierHint: string;
};

export const SPONSOR_PLACEHOLDERS: SponsorLogoPlaceholder[] = [];

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

export const HACKATHON_TEAMS: string[] = [
  "Team 01",
  "Team 02",
  "Team 03",
  "Team 04",
  "Team 05",
  "Team 06",
  "Team 07",
  "Team 08",
  "Team 09",
  "Team 10",
];

export const HACKATHON_TWIST: HackathonTwist = {
  title: "TBD — The Hackathon Twist",
  description:
    "A surprise element that will be revealed at the start of the hackathon. It will challenge teams to adapt their projects in real-time, testing their creativity and problem-solving skills.",
  perThemeExamples: [
    {
      theme: "TBD - 01",
      example:
        "Teams must integrate a specific AI API into their project, which will be revealed at the start of the hackathon.",
    },
    {
      theme: "TBD - 02",
      example:
        "Teams must integrate a specific AI API into their project, which will be revealed at the start of the hackathon.",
    },
    {
      theme: "TBD - 03",
      example:
        "Teams must integrate a specific AI API into their project, which will be revealed at the start of the hackathon.",
    },
  ],
};

// ─── The single track ────────────────────────────────────────────────────────
// One day, one hackathon. Kept as a small structure so the section stays
// data-driven if a second track is ever added back.
export type EventTrack = {
  id: "hackathon";
  label: string;
  title: string;
  tagline: string;
  timeLabel: string;
  points: string[];
};

export const TRACK: EventTrack = {
  id: "hackathon",
  label: "One Track",
  title: "The Hackathon",
  tagline:
    "A single-day, on-site build sprint. Form a team in the morning, ship a working demo by 4 PM, and pitch it to the judges the same evening.",
  timeLabel: EVENT.timeLabel,
  points: [
    "Team formation and theme reveal at kick-off",
    "Five hours of heads-down build time across two sessions",
    "Mentors on the floor all day to unblock your team",
    "Same-day judging with prizes for the top three teams",
  ],
};

// ─── Day-of schedule ─────────────────────────────────────────────────────────
export type ScheduleKind =
  | "registration"
  | "kickoff"
  | "build"
  | "break"
  | "submission"
  | "judging"
  | "closing";

export type ScheduleItem = {
  time: string;
  title: string;
  kind: ScheduleKind;
  description: string;
};

export const DAY_SCHEDULE: ScheduleItem[] = [
  {
    time: "9:00 – 9:30 AM",
    title: "Registration",
    kind: "registration",
    description: "Check in, collect your badge, grab coffee, and find your team.",
  },
  {
    time: "9:30 – 10:00 AM",
    title: "Kick-off & Community Intro",
    kind: "kickoff",
    description:
      "Ahsan Ayaz opens the day live — introducing the community, the theme, and how the hackathon will run.",
  },
  {
    time: "10:00 AM – 1:00 PM",
    title: "Development Session 1",
    kind: "build",
    description: "Three hours of heads-down building, with mentors circulating to unblock teams.",
  },
  {
    time: "1:00 – 2:00 PM",
    title: "Lunch Break",
    kind: "break",
    description: "Refuel and network with fellow builders, mentors, and sponsors.",
  },
  {
    time: "2:00 – 4:00 PM",
    title: "Development Session 2",
    kind: "build",
    description: "Two more hours to finish the build and get your demo ready to show.",
  },
  {
    time: "4:00 – 4:30 PM",
    title: "Project Submissions",
    kind: "submission",
    description: "Tools down. Every team submits its project for judging.",
  },
  {
    time: "4:30 – 5:30 PM",
    title: "Judging & Evaluation",
    kind: "judging",
    description: "Teams present to the panel while the judges score each submission.",
  },
  {
    time: "5:30 – 6:00 PM",
    title: "Closing Remarks & Winner Announcement",
    kind: "closing",
    description: "Top three teams announced, prizes handed out, and a group send-off.",
  },
];

// ─── Venue (on-site) ─────────────────────────────────────────────────────────
// The venue is not confirmed yet — everything here reads as TBD on the page.
// TODO: add name, addressLines and mapUrl once the venue is locked in.
export const VENUE = {
  name: "To Be Announced",
  note: "We are finalising the venue. The full address and directions will be shared here — and emailed to everyone who registers — as soon as it is confirmed.",
  mapUrl: "",
  highlights: [
    "On-site, in-person only",
    "Somewhere central and easy to reach",
    "Power and Wi-Fi for every team",
  ],
} as const;
