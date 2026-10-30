// CWA Tech Summit 2027: all page content lives here. Components only render it.
// Anything still to be confirmed is a single constant, so the update is one edit.

import type { CSSProperties } from "react";

// ─── Design tokens ───────────────────────────────────────────────────────────
// The only place these hexes appear. Components read them through the CSS
// variables set on the page root (see SUMMIT_THEME_VARS), e.g. bg-(--sm-ink).
export const COLORS = {
  /** Page background: deep indigo, intentionally not near-black. */
  ink: "#15102E",
  /** Raised surfaces. */
  dusk: "#221A47",
  /** CWA brand: primary buttons, rules. */
  violet: "#8F27E0",
  /** Secondary text, hairlines, outlines. */
  lilac: "#C9B6FF",
  /** Kinetic accent: active states, progress, the marquee band. Use sparingly. */
  amber: "#FFB23F",
  /** Body text. */
  paper: "#F3EEFF",
} as const;

export const SUMMIT_THEME_VARS = {
  "--sm-ink": COLORS.ink,
  "--sm-dusk": COLORS.dusk,
  "--sm-violet": COLORS.violet,
  "--sm-lilac": COLORS.lilac,
  "--sm-amber": COLORS.amber,
  "--sm-paper": COLORS.paper,
} as CSSProperties;

/**
 * Restyles the global site footer (src/components/Footer.tsx, rendered by the
 * root layout) while this page is mounted. Only applies under
 * body[data-summit], which SummitFooterScope sets and removes. The footer sits
 * outside the page root, so it reads the hexes rather than the --sm-* vars.
 */
export const SUMMIT_FOOTER_CSS = `
body[data-summit] footer.footer {
  /* The page's fixed, opaque AnimatedBackground (z-0) would otherwise paint
     over this static footer. Stays below the progress bar and site header. */
  position: relative;
  z-index: 1;
  margin-top: 0;
  border-radius: 0;
  border-top: 1px solid color-mix(in srgb, ${COLORS.lilac} 15%, transparent);
  background: color-mix(in srgb, ${COLORS.dusk} 55%, ${COLORS.ink});
  color: ${COLORS.lilac};
}
body[data-summit] footer.footer * {
  color: inherit;
}
body[data-summit] footer.footer aside {
  color: color-mix(in srgb, ${COLORS.lilac} 75%, transparent);
}
body[data-summit] footer.footer a {
  color: ${COLORS.lilac};
  transition: color 150ms ease;
}
body[data-summit] footer.footer a:hover,
body[data-summit] footer.footer a:focus-visible {
  color: ${COLORS.amber};
}
body[data-summit] footer.footer a:focus-visible {
  outline: 2px solid ${COLORS.amber};
  outline-offset: 4px;
}
`;

// ─── Section anchors ─────────────────────────────────────────────────────────
export const SECTION_IDS = {
  about: "about",
  agenda: "agenda",
  pitch: "pitch-competition",
  speakers: "speakers",
  judges: "judges",
  pastEvents: "past-events",
  sponsors: "sponsors",
  sponsorshipTiers: "sponsorship-tiers",
  inKind: "in-kind",
  organizers: "organisers",
  venue: "venue",
  contact: "contact",
  community: "community",
} as const;

// ─── Event meta ──────────────────────────────────────────────────────────────
const EVENT_PATH = "/events/cwa-tech-summit/2027";

export const EVENT = {
  slug: "cwa-tech-summit-2027",
  path: EVENT_PATH,
  name: "CWA Tech Summit 2027",
  presenter: "Code with Ahsan presents",
  /** The hero wordmark. Each word is set on its own line on narrow screens. */
  wordmark: "TECH SUMMIT",
  year: "2027",
  // TODO: replace with the confirmed date once the venue is booked.
  dateLabel: "Late March 2027",
  timeLabel: "9:00 AM – 6:00 PM",
  city: "Karachi",
  intro:
    "One day in Karachi for developers, founders and students: tech talks from people shipping real products, a panel discussion, and a pitch final where three teams take the stage.",
} as const;

export const COMMUNITY_DISCORD_URL = "https://discord.gg/KSPpuxD8SG";

// ─── Hero photos ─────────────────────────────────────────────────────────────
// drop photos in public/static/images/events/cwa-tech-summit-2027/hero/
// and list them here (src is the public path, alt describes the scene). The
// cluster shows the first four on large screens and the first three below
// that; an empty array renders striped placeholder frames.
export type HeroPhoto = {
  src: string;
  alt: string;
};

export const HERO_PHOTOS: HeroPhoto[] = [];

// ─── Marquee band ────────────────────────────────────────────────────────────
export const MARQUEE_ITEMS: string[] = [
  "Tech talks",
  "Panel discussion",
  "Pitch final",
  "Karachi",
  "March 2027",
];

// ─── About the day ───────────────────────────────────────────────────────────
export type Pillar = {
  key: "talks" | "panel" | "pitch";
  title: string;
  body: string;
};

export const ABOUT_INTRO =
  "The day runs as a single track: talks in the morning, a panel after lunch, then the pitch final and the results before we close.";

export const PILLARS: Pillar[] = [
  {
    key: "pitch",
    title: "The pitch final",
    body: "Teams submit their idea, its architecture and a short video walkthrough before the day. Judges shortlist three, and those three pitch live on stage in the afternoon. First, second and third are announced before the close.",
  },
  {
    key: "talks",
    title: "Tech talks",
    body: "Practical sessions from engineers and founders on what they built and how, with keynotes from our sponsors.",
  },
  {
    key: "panel",
    title: "Panel discussion",
    body: "An hour on stage with engineers, founders and sponsors, with time for questions from the floor.",
  },
];

// ─── Agenda (draft) ──────────────────────────────────────────────────────────
export type AgendaItem = {
  time: string;
  title: string;
  /** Highlights the pitch competition sessions. */
  isPitch?: boolean;
};

export const AGENDA_NOTE = "Draft agenda. Times are confirmed closer to the day.";

export const AGENDA: AgendaItem[] = [
  { time: "9:00 – 9:45 AM", title: "Registration and breakfast" },
  { time: "9:45 – 10:00 AM", title: "Opening, Ahsan Ayaz" },
  { time: "10:00 AM – 12:30 PM", title: "Tech talks (including sponsor keynotes)" },
  { time: "12:30 – 1:30 PM", title: "Lunch and networking" },
  { time: "1:30 – 2:30 PM", title: "Panel discussion" },
  { time: "2:30 – 3:45 PM", title: "Pitch final: the top three teams pitch live", isPitch: true },
  { time: "3:45 – 5:15 PM", title: "Afternoon talks (judges deliberate)" },
  { time: "5:15 – 5:45 PM", title: "Pitch results and prizes", isPitch: true },
  { time: "5:45 – 6:00 PM", title: "Closing and group photo" },
];

// ─── Pitch competition ───────────────────────────────────────────────────────
export type PitchStep = {
  title: string;
  body: string;
};

export type PitchInfo = {
  /** Empty string renders "Submissions open soon" instead of a link. */
  submitUrl: string;
  opensLabel: string;
  closesLabel: string;
  whatToSubmit: string[];
  steps: PitchStep[];
};

// TODO: set submitUrl and both dates once the submission form is live.
export const PITCH: PitchInfo = {
  submitUrl: "",
  opensLabel: "12:00 PM, date to be announced",
  closesLabel: "Before event day, date to be announced",
  whatToSubmit: [
    "Your idea: the problem, who has it, and what you are building",
    "Its architecture: the components, the data flow and the stack",
    "A short Loom video walking through both",
  ],
  steps: [
    {
      title: "Submissions open",
      body: "The form opens at 12:00 PM on a date we announce ahead of time. Send your idea, its architecture and a short Loom walkthrough.",
    },
    {
      title: "Submissions close",
      body: "The form closes before event day. Late entries are not judged, so submit early and edit if you need to.",
    },
    {
      title: "Judges shortlist three",
      body: "The judges review every submission ahead of the day and pick the top three teams.",
    },
    {
      title: "Three teams pitch live",
      body: "On the day, the top three pitch on stage. First, second and third are announced at the close.",
    },
  ],
};

// ─── Speakers and judges ─────────────────────────────────────────────────────
// Empty arrays render a "line-up reveal" state. Add people here as they confirm.
export type Speaker = {
  name: string;
  role: string;
  company: string;
  talkTitle: string;
  avatarUrl: string;
  /** Empty string hides the LinkedIn link. */
  linkedinUrl: string;
};

export type Judge = {
  name: string;
  position: string;
  company: string;
  /** Empty string hides the LinkedIn link. */
  linkedinUrl: string;
  avatarUrl: string;
};

export const SPEAKERS: Speaker[] = [];
export const JUDGES: Judge[] = [];

export const SPEAKERS_PENDING_COPY =
  "Speakers announced soon. Title and Platinum sponsors get a keynote.";
export const JUDGES_PENDING_COPY =
  "Judges announced soon. Title and Platinum sponsors get a seat on the panel.";

// ─── Glimpses from past events ───────────────────────────────────────────────
// Drop photos into
//   public/static/images/events/cwa-tech-summit-2027/past-events/ship-karachi/
//   public/static/images/events/cwa-tech-summit-2027/past-events/promptathon/
// and list them in `photos` (src is the public path, alt describes the scene).
// Six per event fills the strip; landscape and portrait shots can be mixed.
// An empty `photos` array renders placeholder tiles and "Photos coming soon".
export type PastEventPhoto = {
  src: string;
  alt: string;
};

export type PastEvent = {
  key: string;
  name: string;
  /** Short mark shown on placeholder tiles, e.g. "SK". */
  mark: string;
  date: string;
  where: string;
  summary: string;
  /** One real, checkable fact. Empty string hides it. */
  stat: string;
  url: string;
  photos: PastEventPhoto[];
};

const PAST_EVENT_IMG = "/static/images/events/cwa-tech-summit-2027/past-events";

/** Folder per event, for when photos are added. */
export const PAST_EVENT_PHOTO_DIRS = {
  shipKarachi: `${PAST_EVENT_IMG}/ship-karachi`,
  promptathon: `${PAST_EVENT_IMG}/promptathon`,
} as const;

export const PAST_EVENTS_INTRO =
  "The Code with Ahsan community has run two hackathons this year, one on-site in Karachi and one online.";

export const PAST_EVENTS: PastEvent[] = [
  {
    key: "ship-karachi",
    name: "CWA Ship Karachi 2026",
    mark: "SK",
    date: "12 September 2026",
    where: "Folio3, Karachi",
    summary:
      "A one-day, on-site hackathon: teams built and shipped an AI product in a day and demoed it to the judges that evening.",
    // HACKATHON_TEAMS in events/cwa-ship-karachi/2026/constants.ts lists 15 teams.
    stat: "15 teams",
    url: "/events/cwa-ship-karachi/2026",
    photos: [],
  },
  {
    key: "promptathon",
    name: "CWA Prompt-a-thon 2026",
    mark: "PT",
    date: "28 March – 10 April 2026",
    where: "Online",
    summary: "A two-week online generative AI hackathon, open to every skill level.",
    // HACKATHON_TEAMS in events/cwa-promptathon/2026/constants.ts lists 10 teams.
    stat: "10 teams",
    url: "/events/cwa-promptathon/2026",
    photos: [],
  },
];

// ─── Sponsorship tiers ───────────────────────────────────────────────────────
export type TierKey = "title" | "platinum" | "gold" | "silver" | "bronze";

/** true renders a tick, false renders "Not included". */
export type BenefitValue = string | boolean;

/** Small pill under the tier name. Amber is reserved for Title. */
export type TierBadge = {
  label: string;
  tone: "amber" | "lilac";
};

export type SponsorTier = {
  key: TierKey;
  name: string;
  /** Pill under the name; null renders none. */
  badge: TierBadge | null;
  pricePkr: string;
  priceUsd: string;
  /** Internal planning only: how many of this tier we can take. Never rendered. */
  slots: number;
  benefits: Record<BenefitKey, BenefitValue>;
};

export type BenefitKey = "logo" | "speaking" | "panel" | "booth" | "pitch" | "passes" | "social";

export const BENEFIT_ROWS: { key: BenefitKey; label: string }[] = [
  { key: "logo", label: "Logo placement" },
  { key: "speaking", label: "Stage time" },
  { key: "panel", label: "Panel seat" },
  { key: "booth", label: "Booth" },
  { key: "pitch", label: "Pitch competition" },
  { key: "passes", label: "Attendee passes" },
  { key: "social", label: "Social media posts" },
];

export const TIERS_NOTE =
  "Prices in PKR, US dollars approximate. Final scope confirmed on booking.";

export const SPONSOR_TIERS: SponsorTier[] = [
  {
    key: "title",
    name: "Title",
    badge: { label: "By application", tone: "amber" },
    pricePkr: "300,000",
    priceUsd: "~$1,080",
    slots: 1,
    benefits: {
      logo: "Website, banners, flyers, swag, cards, shields and every social post",
      speaking: "25-minute keynote",
      panel: true,
      booth: true,
      pitch: "Naming rights and a judge seat",
      passes: "10",
      social: "3 dedicated posts",
    },
  },
  {
    key: "platinum",
    name: "Platinum",
    badge: null,
    pricePkr: "250,000",
    priceUsd: "~$900",
    slots: 1,
    benefits: {
      logo: "Website, banners, flyers, swag, cards",
      speaking: "10-minute keynote",
      panel: true,
      booth: true,
      pitch: "Judge seat",
      passes: "5",
      social: "2",
    },
  },
  {
    key: "gold",
    name: "Gold",
    badge: null,
    pricePkr: "150,000",
    priceUsd: "~$540",
    slots: 1,
    benefits: {
      logo: "Website, banners, flyers, cards",
      speaking: "5-minute keynote",
      panel: true,
      booth: true,
      pitch: "Shoutout",
      passes: "4",
      social: "1",
    },
  },
  {
    key: "silver",
    name: "Silver",
    badge: null,
    pricePkr: "75,000",
    priceUsd: "~$270",
    slots: 2,
    benefits: {
      logo: "Website, shields, cards",
      speaking: false,
      panel: false,
      booth: false,
      pitch: "Shoutout",
      passes: "4",
      social: "1",
    },
  },
  {
    key: "bronze",
    name: "Bronze",
    badge: { label: "Startup friendly", tone: "lilac" },
    pricePkr: "25,000",
    priceUsd: "~$90",
    slots: 2,
    benefits: {
      logo: "Website",
      speaking: false,
      panel: false,
      booth: false,
      pitch: false,
      passes: "2",
      social: "1",
    },
  },
];

// ─── Confirmed sponsors ──────────────────────────────────────────────────────
// Empty hides the sponsors section entirely. Logos render grouped by tier, in
// tier order (Title first).
export type ConfirmedSponsor = {
  name: string;
  logoUrl: string;
  /** Empty string renders a non-clickable logo. */
  websiteUrl: string;
  tier: TierKey;
};

export const CONFIRMED_SPONSORS: ConfirmedSponsor[] = [];

// ─── In-kind and next steps ──────────────────────────────────────────────────
export type InKindOption = {
  title: string;
  body: string;
};

export const IN_KIND_INTRO =
  "Not every sponsor pays in cash. Logo placement scales with the value of what you bring.";

export const IN_KIND: InKindOption[] = [
  {
    title: "Food and venue",
    body: "Catering, snacks, or hosting the venue. Counts as Gold-equivalent.",
  },
  {
    title: "Prizes and swag",
    body: "Cash prizes, hardware, subscriptions or branded merch for the pitch winners and attendees.",
  },
  {
    title: "Tools and credits",
    body: "API credits, cloud credits or tool access for participants.",
  },
];

export const SPONSOR_NEXT_STEPS: string[] = [
  "Pick a tier, or ask us about Title.",
  "Send your logo and brand assets.",
  "Confirm payment and we lock in your place.",
];

// ─── Venue ───────────────────────────────────────────────────────────────────
// TODO: fill in once the venue is booked. An empty name renders
// "Venue announced soon"; an empty mapUrl hides the directions link.
export type VenueInfo = {
  name: string;
  city: string;
  addressLines: string[];
  mapUrl: string;
};

export const VENUE: VenueInfo = {
  name: "",
  city: "Karachi",
  addressLines: [],
  mapUrl: "",
};

// ─── Contacts ────────────────────────────────────────────────────────────────
// Email and LinkedIn only. Phone numbers are deliberately not published.
export type ContactPerson = {
  role: string;
  name: string;
  title: string;
  email: string;
  /** Empty string hides the LinkedIn link on the card. */
  linkedinUrl: string;
  avatarUrl: string;
};

const CONTACT_IMG = "/static/images/events/cwa-tech-summit-2027/contacts";

export const CONTACTS: ContactPerson[] = [
  {
    role: "Primary contact",
    name: "Maham Tahir",
    title: "Content Strategist & Community Manager",
    email: "maham.visionwiseab@gmail.com",
    linkedinUrl: "https://www.linkedin.com/in/maham-tahir-225606431/",
    avatarUrl: `${CONTACT_IMG}/maham-tahir.jpeg`,
  },
  {
    role: "Secondary contact",
    name: "Muhammad Ahsan Ayaz",
    title:
      "Founder, Code With Ahsan, \n GDE in AI & Angular | Software Architect at Scania Group, Sweden",
    email: "ahsan.ubitian@gmail.com",
    linkedinUrl: "https://www.linkedin.com/in/ahsanayaz/",
    avatarUrl: `${CONTACT_IMG}/ahsan-ayaz.jpeg`,
  },
];

/** Sponsorship enquiries go to the primary contact. */
export const SPONSOR_CONTACT = CONTACTS[0];

// TODO: Google Form for sponsor applications; paste the link here. While it is
// empty, every tier button falls back to an email to SPONSOR_CONTACT.
export const SPONSOR_FORM_URL = "";

export const sponsorMailto = (subject: string) =>
  `mailto:${SPONSOR_CONTACT.email}?subject=${encodeURIComponent(subject)}`;

// ─── Organisers ──────────────────────────────────────────────────────────────
// The "Meet the team" section shows these team leads, in this order. Social
// handles are stored WITHOUT the leading "@". For linkedin, instagram and
// email: an empty string hides that link on the card, and SOCIAL_TBD ("TBD")
// shows the platform as a dimmed, non-clickable "coming soon" placeholder. A
// missing headshot falls back to initials (PersonAvatar).
export type Organizer = {
  name: string;
  /** e.g. "Marketing", shown as "Marketing lead". */
  team: string;
  linkedin: string;
  instagram: string;
  email: string;
  avatarUrl: string;
};

const ORGANIZER_IMG = "/static/images/events/cwa-tech-summit-2027/organizers";

/** Sentinel for a social field we know exists but don't have yet. */
export const SOCIAL_TBD = "TBD";

export const ORGANIZERS_INTRO = "Six team leads, each running one part of the summit.";

export const ORGANIZER_PROFILES: Organizer[] = [
  {
    name: "Arsalan Paracha",
    team: "Management",
    linkedin: "arsalan-paracha-4b034a38",
    instagram: "arsalanparacha81",
    email: "arsalanparacha81@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/arsalan.jpg`,
  },
  {
    name: "Saad Jawaid",
    team: "Technical",
    linkedin: "saadbandukada",
    instagram: "saadbandukada",
    email: "saadbandukada@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/saad.jpg`,
  },
  {
    name: "Javeria Kamran",
    team: "Outreach",
    linkedin: "javeria-kamran-613833417",
    instagram: "ozge.belle_",
    email: "javeriakamran668@gmail.com",
    // TODO: add headshot as organizers/javeria-kamran.jpg. Initials render until then.
    avatarUrl: "",
  },
  {
    name: "Hashir Afzal",
    team: "Community Moderation",
    // TODO: add headshot as organizers/hashir-afzal.jpg, plus real LinkedIn,
    // Instagram and email. Initials render until then, and "TBD" shows each
    // platform as a dimmed placeholder icon.
    linkedin: SOCIAL_TBD,
    instagram: SOCIAL_TBD,
    email: SOCIAL_TBD,
    avatarUrl: "",
  },
  {
    name: "Warisha Sheikh",
    team: "Marketing",
    linkedin: "warishasheikh",
    instagram: "warisha_sh_",
    email: "warishasheikh007@gmail.com",
    // TODO: add headshot as organizers/warisha.jpg (missing in Ship Karachi too).
    avatarUrl: "",
  },
  {
    name: "Kinza Pervez",
    team: "Designs & Content",
    linkedin: "kinza-pervez",
    instagram: "kp_mallick",
    email: "kp.visionwise@gmail.com",
    avatarUrl: `${ORGANIZER_IMG}/kinza.jpg`,
  },
];
