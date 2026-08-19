import { ConsultingPackage } from "@/types/consulting";

export const CONSULTING_PACKAGES: ConsultingPackage[] = [
  {
    id: "rapid-guidance",
    name: "30-Min 1:1 Mentorship & Career Advisory",
    badge: "Fast & Focused",
    durationMinutes: 30,
    priceInCents: 5000, // $50.00 USD
    currency: "usd",
    description:
      "Targeted 1:1 guidance for specific technical questions, career roadmapping, resume feedback, or project unblocking.",
    features: [
      "30-minute private video call via Google Meet",
      "Direct answers on Angular, Web Architecture, or Career Growth",
      "Resume review or portfolio critique if desired",
      "Actionable recommendations & next steps",
    ],
  },
  {
    id: "architecture-review",
    name: "60-Min Architecture & Code Review",
    badge: "Most Popular",
    durationMinutes: 60,
    priceInCents: 9000, // $90.00 USD
    currency: "usd",
    description:
      "Deep dive into your system architecture, state management, scalability bottlenecks, or codebase refactoring strategy.",
    features: [
      "60-minute in-depth video consultation",
      "Pre-session review of your questions / architecture diagrams",
      "Tailored best practices for Angular, TypeScript, & Full-Stack",
      "Written summary of action items & code patterns",
      "Session recording included",
    ],
  },
  {
    id: "deep-dive-coaching",
    name: "60-Min Comprehensive Mock Interview & GDE Prep",
    badge: "Comprehensive",
    durationMinutes: 60,
    priceInCents: 11000, // $110.00 USD
    currency: "usd",
    description:
      "Real-world technical/system design interview simulation, direct rubric grading, GDE guidance, and actionable prep plan.",
    features: [
      "60-minute intensive 1:1 strategy & mock interview",
      "Real-world coding or system design problem walkthrough",
      "Direct rubric critique and improvement scorecard",
      "Follow-up async Q&A via email for 7 days post-session",
      "Session recording included",
    ],
  },
];

/**
 * Default availability schedule (UTC / local hour blocks).
 * Days: 0 (Sun), 1 (Mon), 2 (Tue), 3 (Wed), 4 (Thu), 5 (Fri), 6 (Sat)
 * Times in "HH:mm" 24-hour format.
 */
export const DEFAULT_WEEKLY_AVAILABILITY: Record<number, { start: string; end: string }[]> = {
  1: [{ start: "14:30", end: "18:30" }], // Monday (2:30 PM - 6:30 PM Stockholm)
  2: [], // Tuesday (Closed)
  3: [{ start: "14:30", end: "18:30" }], // Wednesday (2:30 PM - 6:30 PM Stockholm)
  4: [{ start: "14:30", end: "18:30" }], // Thursday (2:30 PM - 6:30 PM Stockholm)
  5: [], // Friday (Closed)
  6: [], // Saturday (Closed)
  0: [], // Sunday (Closed)
};

export const CONSULTING_CONFIG = {
  adminEmail: process.env.ADMIN_EMAIL || "ahsan.ubitian@gmail.com",
  adminName: "Mohammed S. N. Ayaz",
  adminTimezone: "Europe/Stockholm",
  slotDurationStepMinutes: 30, // 30-min start time intervals (2:30 PM, 3:00 PM, 3:30 PM, ...)
  bufferBetweenSessionsMinutes: 15, // 15-min gap after sessions
  minBookingNoticeHours: 4, // 4-hour advance notice
  maxBookingDaysInAdvance: 30, // Up to 30 days ahead
  slotLockExpirationMinutes: 15, // 15-min lock during Stripe checkout
};
