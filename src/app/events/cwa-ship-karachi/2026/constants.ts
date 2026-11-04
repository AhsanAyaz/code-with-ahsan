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
  outreachPartners: "outreach-partners",
  social: "social",
} as const;

// ─── Event meta ──────────────────────────────────────────────────────────────
// CWA Ship Karachi 2026 is a single-day, ON-SITE hackathon. A short community
// kick-off opens the day, but the whole event is one hackathon track.
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
  timeLabel: "8:30 AM – 7:00 PM",
  /** Countdown target (local time). Keep in sync with dateLabel/timeLabel. */
  isoStart: "2026-09-12T08:30:00",
  locationShort: "Folio3 · Karachi, PK",
  registerUrl: "https://forms.gle/davuSPGjiDxTLkte6",
  /** Where teams submit on the day — rendered as a QR on the submission slide. */
  submitUrl: "https://forms.gle/KouwAgyFDW6Aq36S7",
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
  /** Column accent on the deck slide. */
  accent: string;
  /** "Karachi" or "Pakistan-wide". */
  scope: string;
  title: string;
  /** The problem, as rendered on the public event page. */
  description: string;
  /** The one-line "build this" ask, shown on the deck. */
  brief: string;
  /** Why the AI has to do real work here — maps to judging criterion 3. */
  loadBearing: string;
  /** Optional caution rendered under the column; empty hides it. */
  note: string;
};

/** Three tracks — teams pick exactly one and state it on the submission form. */
export const THEME_RULE = "Three tracks. Pick exactly one and state it on the submission form.";

export const HACKATHON_THEMES: ThemeItem[] = [
  {
    accent: "#1FB2A6",
    scope: "Karachi",
    title: "The City Around You",
    description:
      "When something breaks in Karachi (a burst main, uncollected rubbish, sewage on the road), the hard part is knowing who is responsible. KMC, KWSB, SSWMB, town administrations and cantonment boards each own a different piece, and nothing tells a resident which one to approach.",
    brief:
      "Take a citizen's raw report (photo, voice note or text), work out what the issue is, who owns it, and produce a complaint ready to send.",
    loadBearing:
      "Classification from image and free text, routing across overlapping authorities, formal document generation.",
    note: "",
  },
  {
    accent: "#00F0FF",
    scope: "Karachi",
    title: "Getting Around",
    description:
      "Karachi's transport knowledge lives in people's heads, not in any system. Routes are informal and unpublished, fares are negotiated rather than metered, and a strike or a flooded underpass can invalidate all of it overnight.",
    brief:
      "Turn scattered, unstructured local knowledge about getting around Karachi into a clear answer for someone who needs to travel now.",
    loadBearing:
      "Retrieval over unstructured local knowledge, messy natural-language input, reasoning under incomplete information.",
    note: "",
  },
  {
    accent: "#D926A9",
    scope: "Pakistan-wide",
    title: "Earning from Pakistan",
    description:
      "Over 2.3 million Pakistani freelancers earned $856 million in the first nine months of FY2025-26. PayPal and Stripe are unavailable to residents, the spread between the best and worst payment route runs 3–5% of every invoice, and FBR, PSEB and SBP obligations are genuinely hard to parse.",
    brief:
      "Help a Pakistani freelancer or small agency win work, get paid efficiently, or stay compliant by reasoning over their actual situation, not handing them a generic guide.",
    loadBearing:
      "Fee arithmetic over real constraints, plain-language regulation for a specific case, contract risk analysis.",
    note: "Anything touching tax or regulation must tell users to verify with a qualified professional.",
  },
];

const JUDGE_IMG = "/static/images/events/cwa-ship-karachi-2026/judges";
const MENTOR_IMG = "/static/images/events/cwa-ship-karachi-2026/mentors";

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
  /** Empty string hides the email link on the card. */
  email: string;
  avatarUrl: string;
};

export const JUDGES: JudgeProfile[] = [
  {
    name: "Mohammad Taha Mohsini",
    position: "Senior Product Engineer",
    company: "Ezra AI",
    experience: "",
    quote: "",
    linkedinUrl: "https://www.linkedin.com/in/tahamohsini",
    email: "taha2000mohammad@gmail.com",
    avatarUrl: `${JUDGE_IMG}/taha-mohsini.jpg`,
  },
  {
    name: "Sakina Abbas",
    position: "Co-Founder · Google Developer Expert, Flutter & Dart",
    company: "Reactree Pvt. Ltd.",
    experience: "",
    quote: "",
    linkedinUrl: "https://pk.linkedin.com/in/sakina-abbas",
    email: "sakina.abbas.3014@gmail.com",
    avatarUrl: `${JUDGE_IMG}/sakina-abbas.jpg`,
  },
  {
    name: "Muhammad Shahab Ejaz",
    position: "Software Architect",
    company: "Folio3",
    experience: "",
    quote: "",
    linkedinUrl: "https://www.linkedin.com/in/shahabejaz/",
    email: "sejaz@folio3.com",
    avatarUrl: `${JUDGE_IMG}/shahab-ejaz.jpg`,
  },
];

// ─── Mentors ─────────────────────────────────────────────────────────────────
// Mentors guide the teams through the build sprint (they do not give talks).
// Every mentor has a headshot under public/static/images/events/
// cwa-ship-karachi-2026/mentors/.
export type MentorProfile = {
  name: string;
  experience: string;
  position: string;
  /** Company or university the mentor is currently with. */
  organization: string;
  /** Empty string hides the LinkedIn link on the card. */
  linkedinUrl: string;
  /** Empty string hides the email link on the card. */
  email: string;
  avatarUrl: string;
};

export const MENTOR_PROFILES: MentorProfile[] = [
  {
    name: "Adnan Sameer",
    experience: "",
    position: "Software Engineer II",
    organization: "Snoonu",
    linkedinUrl: "https://www.linkedin.com/in/adnan-sameer/",
    email: "adnansameer62@gmail.com",
    avatarUrl: `${MENTOR_IMG}/adnan-sameer.jpg`,
  },
  {
    name: "Muhammad Maaz",
    experience: "",
    position: "Senior Software Engineer",
    organization: "Folio3",
    linkedinUrl: "https://pk.linkedin.com/in/muhammadmaaz22",
    email: "muhammadmaaz@folio3.com",
    avatarUrl: `${MENTOR_IMG}/muhammad-maaz.jpg`,
  },
  {
    name: "Muzammil Jethwa",
    experience: "",
    position: "Senior Solutions Engineer",
    organization: "Mazik Global",
    linkedinUrl: "https://www.linkedin.com/in/muzammiljethwa",
    email: "muzammiljethwa104@gmail.com",
    avatarUrl: `${MENTOR_IMG}/muzammil-jethwa.jpg`,
  },
  {
    name: "Muhammad Sami Ullah",
    experience: "",
    position: "AI Transformation Lead · Founder, MLSA Karachi",
    organization: "Mazik Global & MLSA Karachi",
    linkedinUrl: "https://www.linkedin.com/in/msamiullah-dev/",
    email: "samimunir63@gmail.com",
    avatarUrl: `${MENTOR_IMG}/sami-ullah.jpg`,
  },
  {
    name: "Muhammad Shaharyar Naeem",
    experience: "",
    position: "Staff Software Engineer",
    organization: "Auriga Solutions",
    linkedinUrl: "https://www.linkedin.com/in/muhammad-shaharyar-252158b5/",
    email: "shaharyar.naeem@gorelo.io",
    avatarUrl: `${MENTOR_IMG}/shaharyar-naeem.jpg`,
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
    title: "Organiser",
    linkedin: "arsalan-paracha-4b034a38",
    instagram: "arsalanparacha81",
    email: "arsalanparacha81@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/arsalan.jpg`,
  },
  {
    name: "Javeria Kamran",
    title: "Organiser",
    linkedin: "javeria-kamran-613833417",
    instagram: "ozge.belle_",
    email: "javeriakamran668@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/javeria.jpg`,
  },
  {
    name: "Kinza",
    title: "Organiser",
    linkedin: "kinza-pervez",
    instagram: "kp_mallick",
    email: "kp.visionwise@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/kinza.jpg`,
  },
  {
    name: "Muhammad Noman",
    title: "Organiser",
    linkedin: "mnomanmemon",
    instagram: "m_nomanmemon",
    email: "muhammadnoumanmemon@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/noman.jpg`,
  },
  {
    name: "Muhammad Saad",
    title: "Organiser",
    linkedin: "saadbandukada",
    instagram: "saadbandukada",
    email: "saadbandukada@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/saad.jpg`,
  },
  {
    name: "Warisha Sheikh",
    title: "Organiser",
    linkedin: "warishasheikh",
    instagram: "warisha_sh_",
    email: "warishasheikh007@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/warisha.jpg`,
  },
  {
    name: "Hafsa Shahid",
    title: "Organiser",
    linkedin: "hafsashahid03",
    instagram: "",
    email: "hafsahere01@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/hafsa-shahid.jpg`,
  },
  {
    name: "Ali Hassan",
    title: "Organiser",
    linkedin: "alihassancode",
    instagram: "",
    email: "alihassan.code@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/ali-hassan.jpg`,
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
  /** Empty string hides the LinkedIn link on the card. */
  linkedinUrl: string;
  avatarUrl: string;
};

const CONTACT_IMG = "/static/images/events/cwa-ship-karachi-2026/contacts";

export const CONTACTS: ContactPerson[] = [
  {
    role: "Primary Contact",
    name: "Maham Tahir",
    title: "Content Strategist & Community Manager",
    email: "maham.visionwiseab@gmail.com",
    linkedinUrl: "https://www.linkedin.com/in/maham-tahir-225606431/",
    avatarUrl: `${CONTACT_IMG}/maham-tahir.jpeg`,
  },
  {
    role: "Secondary Contact",
    name: "Muhammad Ahsan Ayaz",
    title:
      "Founder, Code With Ahsan, \n GDE in AI & Angular | Software Architect at Scania Group, Sweden",
    email: "ahsan.ubitian@gmail.com",
    linkedinUrl: "https://www.linkedin.com/in/ahsanayaz/",
    avatarUrl: `${CONTACT_IMG}/ahsan-ayaz.jpeg`,
  },
];

export type ConfirmedSponsor = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
  tier: string;
};

const COLLABORATION_PARTNER_IMG =
  "/static/images/events/cwa-ship-karachi-2026/collaboration-partners";

const SPONSOR_IMG = "/static/images/events/cwa-ship-karachi-2026/sponsors";

export const CONFIRMED_SPONSORS: ConfirmedSponsor[] = [
  {
    name: "Gorelo",
    logoUrl: `${SPONSOR_IMG}/gorelo.png`,
    websiteUrl: "",
    tier: "Startup Sponsor",
  },
  {
    name: "Command Code",
    logoUrl: `${SPONSOR_IMG}/commandcode.svg`,
    websiteUrl: "https://commandcode.ai",
    tier: "Gold Sponsor",
  },
  {
    name: "MSA KHI",
    logoUrl: `${COLLABORATION_PARTNER_IMG}/msa-khi.png`,
    websiteUrl: "",
    tier: "Community Sponsor",
  },
];

// ─── Collaboration partners ──────────────────────────────────────────────────
// Communities, spaces and organisations collaborating on the event — distinct
// from paid sponsorship tiers. An empty `websiteUrl` renders a non-clickable
// tile, so a partner can be listed before its link is confirmed.
// TODO: replace the placeholders with real names, logos and links.
export type PartnerLogo = {
  name: string;
  logoUrl: string;
  websiteUrl: string;
};

export const COLLABORATION_PARTNERS: PartnerLogo[] = [
  { name: "MSA KHI", logoUrl: `${COLLABORATION_PARTNER_IMG}/msa-khi.png`, websiteUrl: "" },
];

// Named representatives from a collaboration partner. LinkedIn only — personal
// emails from the planning sheet are deliberately not published here.
// TODO: drop headshots into
// public/static/images/events/cwa-ship-karachi-2026/collaboration-partners/reps/
// using the filename in `avatarUrl`; the card falls back to initials until then.
export type PartnerRepresentative = {
  name: string;
  role: string;
  linkedinUrl: string;
  avatarUrl: string;
};

const PARTNER_REP_IMG = `${COLLABORATION_PARTNER_IMG}/reps`;

export const COLLABORATION_REPRESENTATIVES: PartnerRepresentative[] = [
  {
    name: "Areesha Siddiqui",
    role: "Lead, MSA KHI",
    linkedinUrl: "https://www.linkedin.com/in/areeshah-siddiqui/",
    avatarUrl: `${PARTNER_REP_IMG}/areesha-siddiqui.jpg`,
  },
  {
    name: "Muhammad Habib",
    role: "Co-Lead, MSA KHI",
    linkedinUrl: "https://www.linkedin.com/in/muhammad-habib-986a89215/",
    avatarUrl: `${PARTNER_REP_IMG}/muhammad-habib.jpg`,
  },
];

// Communities amplifying the event to their own members — distinct from the
// partners helping run the day itself.
export const OUTREACH_PARTNERS: PartnerLogo[] = [
  {
    name: "GDG On Campus · DHA Suffa University",
    logoUrl: `${COLLABORATION_PARTNER_IMG}/gdg-dha-suffa.png`,
    websiteUrl: "",
  },
  {
    name: "GDG On Campus · University of Karachi",
    logoUrl: `${COLLABORATION_PARTNER_IMG}/gdg-uok.png`,
    websiteUrl: "",
  },
  {
    name: "IlmCode",
    logoUrl: `${COLLABORATION_PARTNER_IMG}/ilmcode.png`,
    websiteUrl: "",
  },
];

export type SponsorLogoPlaceholder = {
  tierHint: string;
};

export const SPONSOR_PLACEHOLDERS: SponsorLogoPlaceholder[] = [];

/** Registered teams, alphabetical. Feeds the roll-call slide and the admin
 *  winners dropdown. */
export const HACKATHON_TEAMS: string[] = [
  "Asteroid",
  "Comet",
  "Eris",
  "Flare",
  "Jupiter",
  "Mars",
  "Neptune",
  "Orion",
  "Pegasus",
  "Pluto",
  "Saturn",
  "Titan",
  "Uranus",
  "Venus",
  "Vesta",
];

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
    "A single-day, on-site build sprint. Register with your team, ship a working demo by 4 PM, and pitch it to the judges the same evening.",
  timeLabel: EVENT.timeLabel,
  points: [
    "Teams register in advance; theme revealed at kick-off",
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
    time: "8:30 – 9:30 AM",
    title: "Registration & Verification",
    kind: "registration",
    description:
      "Doors open at 8:30. Please arrive on time. Check in with your team, collect your badges, and grab tea or coffee before we start.",
  },
  {
    time: "9:30 – 9:45 AM",
    title: "Community Introduction",
    kind: "kickoff",
    description:
      "Ahsan Ayaz opens the day live, introducing the community, the theme, and how the hackathon will run.",
  },
  {
    time: "9:45 – 10:00 AM",
    title: "MSA KHI Leads Session",
    kind: "kickoff",
    description:
      "Our collaboration partners from MSA Karachi introduce the chapter and how students in the room can get involved.",
  },
  {
    time: "10:00 AM – 1:00 PM",
    title: "Development Phase 1",
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
    time: "2:00 – 3:30 PM",
    title: "Development Phase 2",
    kind: "build",
    description: "Ninety minutes to finish the build and get your demo ready to show.",
  },
  {
    time: "3:30 – 4:00 PM",
    title: "Hackathon Submission",
    kind: "submission",
    description: "Tools down. Every team submits its project for judging.",
  },
  {
    time: "4:00 – 4:30 PM",
    title: "Judging Setup & Breather",
    kind: "judging",
    description:
      "Submissions close and the panel sets up. Grab tea, and get your demo machine ready to present.",
  },
  {
    time: "4:30 – 6:00 PM",
    title: "Judging & Evaluation",
    kind: "judging",
    description: "Teams present to the panel while the judges score each submission.",
  },
  {
    time: "6:00 – 6:30 PM",
    title: "Judges' Deliberation",
    kind: "judging",
    description: "The panel scores and agrees the top three while the room takes a break.",
  },
  {
    time: "6:30 – 7:00 PM",
    title: "Closing & Winner Announcement",
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
  note: "We are hosted at Folio3 in Karachi: one floor, one room, the whole day. Full directions are a tap away, and joining instructions go out by email once you register.",
  mapUrl: "https://share.google/ZkHTOmQToc8dgbfEO",
  logoUrl: "/static/images/events/cwa-ship-karachi-2026/venue/folio3.webp",
  highlights: [
    "On-site, in-person only",
    "Power and Wi-Fi for every team",
    "Food and Tea/Coffee throughout the day",
  ],
};

// ─── Host deck ───────────────────────────────────────────────────────────────
// Everything below drives the presenter deck at {EVENT.path}/host — the slide
// list itself lives in SECTION_NAMES (ControlBar.tsx).
// The deck is content-driven on purpose: edit the copy here, never in the slide
// components, so a last-minute change on the day is a one-line edit.

/** CWA community Discord — the QR shown on every slide of the deck. */
export const COMMUNITY_DISCORD_URL = "https://discord.gg/KSPpuxD8SG";

/** Pre-rendered QR for COMMUNITY_DISCORD_URL. Regenerate if that URL changes. */
export const SUBMISSION_QR_SRC = "/static/images/events/cwa-ship-karachi-2026/qr/submission.svg";
export const DISCORD_QR_SRC = "/static/images/events/cwa-ship-karachi-2026/qr/discord.svg";
export const CWA_LOGO_SRC = "/images/logo-cwa.png";
/** The hexagon badge on its own, without the CWA wordmark. */
export const CWA_MARK_SRC = "/static/images/events/cwa-ship-karachi-2026/brand/logo-cwa-mark.png";

export type FounderIntro = {
  name: string;
  title: string;
  avatarUrl: string;
  bio: string;
  highlights: string[];
};

export const FOUNDER: FounderIntro = {
  name: "Ahsan Ayaz",
  title: "Founder, Code With Ahsan",
  avatarUrl: `${CONTACT_IMG}/ahsan-ayaz.jpeg`,
  bio: "Google Developer Expert in AI and Angular, and the founder of Code With Ahsan, a community built to get developers in Pakistan shipping real software, not just watching tutorials.",
  highlights: [
    "Google Developer Expert · AI & Angular",
    "Building developer community since 2019",
    "Mentored hundreds of engineers into their first roles",
  ],
};

export const COMMUNITY_VISION: string[] = [
  "Create an engaging community of developers",
  "Collaboration on building projects",
  "Giving back to the community",
  "Active participation in all of our activities & programmes",
];

/** Current programmes — keep in step with what is actually live on the site. */
export const COMMUNITY_PROGRAMS: string[] = [
  "Project Collaboration Program",
  "Mentorship Program",
  "Student Ambassador Program",
  "Monthly Learning Challenges",
  "Weekly Meetups (QnA with Ahsan Ayaz)",
];

export const PAST_EVENTS: string[] = [
  "Tech Talks by International Speakers",
  "Career Growth Sessions",
  "Bootcamps",
  "Workshops",
  "Hackathons",
];

export type PartnerSession = {
  title: string;
  /** Scheduled slot, shown on the deck slide. */
  window: string;
  presenter: string;
  organization: string;
  description: string;
  logoUrl: string;
};

// Title matches the DAY_SCHEDULE entry for the same slot — they used to disagree.
export const MSA_SESSION: PartnerSession = {
  title: "MSA KHI Leads Session",
  window: "9:45 – 10:00 AM",
  presenter: "MSA KHI Team",
  organization: "MSA Karachi",
  description:
    "Our collaboration partners take the stage to introduce MSA Karachi, what the chapter is building, and how students in the room can get involved.",
  logoUrl: `${COLLABORATION_PARTNER_IMG}/msa-khi.png`,
};

export type JudgingCriterion = {
  name: string;
  points: number;
  description: string;
};

/** Points must total JUDGING_TOTAL — the slide renders the sum so a mistake is visible. */
export const JUDGING_TOTAL = 10;
export const JUDGING_NOTE =
  "Total score: 10 points. Scored by 3 judges independently. The final score is the average across all judges.";

export const JUDGING_CRITERIA: JudgingCriterion[] = [
  {
    name: "Ships & works",
    points: 2,
    description:
      "Is there a public URL? Does the core flow function live, without the team explaining around it?",
  },
  {
    name: "Solves the stated problem",
    points: 3,
    description:
      "Does it match what they pitched at the mentor checkpoint? No unexplained drift into something else.",
  },
  {
    name: "AI is load-bearing, not decorative",
    points: 3,
    description:
      "Is the AI doing real work (generation, retrieval, decisioning), not just a wrapper around a static form?",
  },
  {
    name: "Execution quality for one day",
    points: 2,
    description:
      "Was the scope realistic and well-executed, not an ambitious mess that's 20% working?",
  },
];

export const ALLOWED: string[] = [
  "Any programming language",
  "Any framework or library",
  "Public APIs",
  "Open-source libraries",
  "AI tools and models",
  "No-code tools",
  "Figma for UI design",
  "Pre-built UI component libraries",
];

export const NOT_ALLOWED: string[] = [
  "Pre-built projects",
  "Submitting a project started before today",
  "Copying another team's project",
  "Private repositories (must be public by 4 PM)",
  "Submissions after 4:00 PM PKT",
  "Presentations over 3 minutes",
  "Projects without main functionality",
];

export type DisqualificationCondition = {
  condition: string;
  type: string;
};

export const DISQUALIFICATIONS: DisqualificationCondition[] = [
  { condition: "No project showcased", type: "Hard: automatic" },
  { condition: "Project presentation exceeds 3 minutes", type: "Hard: automatic" },
  {
    condition: "Main functionality not implemented",
    type: "Hard: Step 1 gate, no score assigned",
  },
  { condition: "Source code not provided", type: "Hard: automatic" },
  { condition: "Submission after 4:00 PM PKT", type: "Hard: form closes at deadline" },
  {
    condition: "Pre-built or recycled project detected",
    type: "Hard: judge discretion, reviewed by all judges",
  },
  { condition: "Copied from another team", type: "Hard: both teams disqualified" },
];

export const DISQUALIFICATION_NOTE =
  "Disqualification decisions made by organisers or judges are final. Disqualification of one team member does not automatically disqualify the rest of the team unless the violation affects the entire submission.";

export type SubmissionRule = { text: string };

export const SUBMISSION_RULES: SubmissionRule[] = [
  { text: "One submission per team. The team lead submits." },
  { text: "Include a public repo link and a live demo URL." },
  { text: "Add a short README: what it does, how to run it, who built it." },
  { text: "List every AI tool you used and what you used it for." },
  { text: "The form closes at the end of this timer. No late entries." },
];

export type Perk = {
  title: string;
  description: string;
};

/** What every team walks away with, regardless of placement. */
export const WINNER_PERKS: Perk[] = [
  {
    title: "Swag",
    description: "Code With Ahsan and sponsor swag for participants: stickers, tees and more.",
  },
  {
    title: "Certificates",
    description: "Digital certificates of participation for everyone who submits a project.",
  },
  {
    title: "Community Access",
    description: "A standing invite into the Mentorship Program and the wider CWA community.",
  },
];

export type Prize = {
  /** "1st", "2nd", "3rd" — used as the column heading. */
  place: string;
  prize: string;
  swag: string;
  recognition: string;
  /** Accent colour for the column. */
  accent: string;
};

export const PRIZES: Prize[] = [
  {
    place: "1st Place",
    prize: "Command Code GOAT plan, 1 month each for up to 5 team members",
    swag: "Sponsor swag pack",
    recognition: "Featured in community post + social coverage",
    accent: "#FFD600",
  },
  {
    place: "2nd Place",
    prize: "Command Code Go plan, 1 month",
    swag: "Sponsor swag pack",
    recognition: "Featured in community post",
    accent: "#C9D1E8",
  },
  {
    place: "3rd Place",
    prize: "Kimi premium membership, 1 month",
    swag: "Sponsor swag pack",
    recognition: "Honourable mention",
    accent: "#E08A4B",
  },
];

// ─── Deck timers ─────────────────────────────────────────────────────────────
// Durations in minutes. The deck's timers are host-controlled: they sit at the
// full duration until started, so a late start does not eat into the clock.
export type DeckPhase = {
  /** Slide heading. */
  title: string;
  /** Scheduled wall-clock window, shown under the title for orientation. */
  window: string;
  minutes: number;
  blurb: string;
  points: string[];
};

export const PHASE_ONE: DeckPhase = {
  title: "Phase 1",
  window: "10:00 AM – 1:00 PM",
  minutes: 180,
  blurb: "Heads down. Mentors are circulating. Flag them the moment you're blocked.",
  points: [
    "Lock your idea in the first 20 minutes",
    "Get something deployed before lunch, however rough",
    "Commit as you go",
  ],
};

export const LUNCH_BREAK: DeckPhase = {
  title: "Lunch Break",
  window: "1:00 – 2:00 PM",
  minutes: 60,
  blurb: "Food, tea and coffee are served. Be back at your table when the timer hits zero.",
  points: ["Eat, stretch, talk to a mentor", "Meet the sponsors", "Back in the room on time"],
};

export const PHASE_TWO: DeckPhase = {
  title: "Phase 2",
  window: "2:00 – 3:30 PM",
  minutes: 90,
  blurb: "Final build stretch. Stop adding features and start finishing the one you have.",
  points: [
    "Feature freeze with 20 minutes left",
    "Test your demo path end to end",
    "Write the README before you run out of time",
  ],
};

export const SUBMISSION_WINDOW: DeckPhase = {
  title: "Project Submission",
  window: "3:30 – 4:00 PM",
  minutes: 30,
  blurb: "Tools down. Every team submits now. The form closes when this timer ends.",
  points: [],
};

export const PRESENTATION_WINDOW: DeckPhase = {
  title: "Presentation Time",
  window: "4:30 – 6:00 PM",
  minutes: 90,
  blurb: "Teams present to the panel. Keep to your slot. The timer is on the screen.",
  points: [
    "Show the product running, not slides about it",
    "Say what's real and what's still a stub",
    "Judges get the last two minutes for questions",
  ],
};
