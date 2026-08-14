import type { HackathonTwist } from "@/types/events";

// ─── Font switch ─────────────────────────────────────────────────────────────
// Set to false to use Rubik (site default) for all headings instead of Bebas Neue.
const USE_BEBAS_HEADINGS = true;
export const headingFont = USE_BEBAS_HEADINGS
  ? "var(--font-bebas, 'Bebas Neue', sans-serif)"
  : "var(--font-rubik, 'Rubik', sans-serif)";

/** Single shared placeholder for any person whose photo isn't in yet. */
export const TBD_AVATAR = "/static/images/placeholders/tbd.svg";

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
  collaborationPartners: "collaboration-partners",
} as const;

// ─── Event meta ──────────────────────────────────────────────────────────────
// CWA Ship Karachi 2026 is a single-day, ON-SITE hackathon. A short community
// kick-off opens the day, but the whole event is one hackathon track.
// TODO: confirm the venue and lock the exact day (17 vs 18 September).
const EVENT_PATH = "/events/cwa-ship-karachi/2026";

export const EVENT = {
  /** Firestore document id — events/{eventId}/winners/data */
  eventId: "cwa-ship-karachi-2026",
  path: EVENT_PATH,
  name: "CWA Ship Karachi 2026",
  kicker: "One-Day Hackathon",
  tagline: "One day. One track. On-site.",
  theme: "Build & Ship AI Product in One Day",
  dateLabel: "Saturday, 12 September 2026",
  timeLabel: "9:00 AM – 7:15 PM",
  /** Countdown target (local time). Keep in sync with dateLabel/timeLabel. */
  isoStart: "2026-09-12T09:00:00",
  locationShort: "Folio3 · Karachi, PK",
  registerUrl: "https://forms.gle/davuSPGjiDxTLkte6",
  /** Sponsorship tiers live in the deck, not on the page. */
  sponsorshipDeckUrl:
    "https://drive.google.com/file/d/1txC2OjlRwuCHi-uAmt_dYhR4m7DNxC9S/view?usp=sharing",
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
    title: "Build & Ship AI Product in One Day",
    description:
      "Ship a production-ready AI product before the day ends — not a prototype, not a vibe-coded demo, but something real enough to put in front of users and keep running after the event.",
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
    name: "TBD",
    position: "------------",
    company: "-------------",
    experience: "",
    quote: "",
    linkedinUrl: "",
    avatarUrl: TBD_AVATAR,
  },
];

// ─── Mentors ─────────────────────────────────────────────────────────────────
// Mentors guide the teams through the build sprint (they do not give talks).
// Every mentor points at the shared TBD_AVATAR. Swap an individual `avatarUrl`
// to a real file as each headshot arrives.
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
    name: "Mentor",
    experience: "TODO",
    position: "TODO",
    organization: "TODO",
    avatarUrl: TBD_AVATAR,
  },
];

/** Name-only list consumed by the host/presenter deck. */
export const MENTORS: string[] = MENTOR_PROFILES.map((mentor) => mentor.name);

// ─── Organisers ──────────────────────────────────────────────────────────────
// Social handles are stored WITHOUT the leading "@"; an empty string hides that
// link on the card. Everyone points at the shared TBD_AVATAR until a real
// headshot is added under public/static/images/events/cwa-ship-karachi-2026/.
// TODO: confirm each organiser's role, handles and email.
export type Organizer = {
  name: string;
  title: string;
  linkedin: string;
  instagram: string;
  email: string;
  avatarUrl: string;
};

const ORGANIZER_IMG = "/static/images/events/cwa-ship-karachi-2026/organizers";
export const ORGANIZER_PROFILES: Organizer[] = [
  {
    name: "Arsalan Paracha",
    title: "Organizer",
    linkedin: "arsalan-paracha-4b034a38",
    instagram: "arsalanparacha81",
    email: "arsalanparacha81@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/arsalan.jpg`,
  },
  {
    name: "Javeria",
    title: "Organizer",
    linkedin: "javeria-kamran-613833417",
    instagram: "ozge.belle_",
    email: "javeriakamran668@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/javeria.jpg`,
  },
  {
    name: "Kinza",
    title: "Organizer",
    linkedin: "kinza-pervez",
    instagram: "kp_mallick",
    email: "kp.visionwise@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/kinza.jpg`,
  },
  {
    name: "Muhammad Noman",
    title: "Organizer",
    linkedin: "mnomanmemon",
    instagram: "m_nomanmemon",
    email: "muhammadnoumanmemon@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/noman.jpg`,
  },
  {
    name: "Muhammad Saad",
    title: "Organizer",
    linkedin: "saadbandukada",
    instagram: "saadbandukada",
    email: "saadbandukada@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/saad.jpg`,
  },
  {
    name: "Warisha",
    title: "Organizer",
    linkedin: "warishasheikh",
    instagram: "warisha_sh_",
    email: "warishasheikh007@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/warisha.jpg`,
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
    title: "Content Strategist & Community Manager",
    email: "maham.visionwiseab@gmail.com",
    avatarUrl: `${CONTACT_IMG}/maham-tahir.jpeg`,
  },
  {
    role: "Secondary Contact",
    name: "Muhammad Ahsan Ayaz",
    title:
      "Founder, Code With Ahsan, \n GDE in AI & Angular | Software Architect at Scania Group, Sweden",
    email: "ahsan.ubitian@gmail.com",
    avatarUrl: `${CONTACT_IMG}/ahsan-ayaz.jpeg`,
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
    name: "SPONSOR NAME",
    logoUrl: TBD_AVATAR,
    websiteUrl: "https://example.com",
    tier: "TODO",
  },
];

// ─── Collaboration partners ──────────────────────────────────────────────────
// Communities, spaces and organisations collaborating on the event — distinct
// from paid sponsorship tiers. An empty `websiteUrl` renders a non-clickable
// tile, so a partner can be listed before its link is confirmed.
// TODO: replace the placeholders with real names, logos and links.
export type CollaborationPartner = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
};

const COLLABORATION_PARTNER_IMG =
  "/static/images/events/cwa-ship-karachi-2026/collaboration-partners";

export const COLLABORATION_PARTNERS: CollaborationPartner[] = [
  { name: "MSA KHI", logoUrl: `${COLLABORATION_PARTNER_IMG}/msa-khi.png`, websiteUrl: "" },
];

export type SponsorLogoPlaceholder = {
  tierHint: string;
};

export const SPONSOR_PLACEHOLDERS: SponsorLogoPlaceholder[] = [];

export const HACKATHON_TEAMS: string[] = ["Team 01"];

export const HACKATHON_TWIST: HackathonTwist = {
  title: "TBD — The Hackathon Twist",
  description:
    "A surprise element that will be revealed at the start of the hackathon. It will challenge teams to adapt their projects in real-time, testing their creativity and problem-solving skills.",
  perThemeExamples: [
    {
      theme: "TBD",
      example:
        "------ TO BE DECIDED ------. The twist will be designed to push teams to think outside the box and innovate under pressure.",
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
    time: "4:30 – 6:45 PM",
    title: "Judging & Evaluation",
    kind: "judging",
    description: "Teams present to the panel while the judges score each submission.",
  },
  {
    time: "6:45 – 7:15 PM",
    title: "Closing Remarks & Winner Announcement",
    kind: "closing",
    description: "Top three teams announced, prizes handed out, and a group send-off.",
  },
];

// ─── Venue (on-site) ─────────────────────────────────────────────────────────
// TODO: add the street address line once confirmed — `addressLines` renders
// only when non-empty, so the section is correct without it.
export type VenueInfo = {
  name: string;
  addressLines: string[];
  note: string;
  mapUrl: string;
  logoUrl: string;
  highlights: string[];
};

export const VENUE: VenueInfo = {
  name: "Folio3",
  addressLines: ["Folio3 Tower, Plot 26 Shahra-e-Faisal", "(SMCHS), Karachi, 75100"],
  note: "We are hosted at Folio3 in Karachi — one floor, one room, the whole day. Full directions are a tap away, and joining instructions go out by email once you register.",
  mapUrl: "https://share.google/ZkHTOmQToc8dgbfEO",
  logoUrl: "/static/images/events/cwa-ship-karachi-2026/venue/folio3.webp",
  highlights: [
    "On-site, in-person only",
    "Power and Wi-Fi for every team",
    "Food and refreshments through the day",
  ],
};
