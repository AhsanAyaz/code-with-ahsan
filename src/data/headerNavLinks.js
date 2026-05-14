export const LINKS = {
  ANGULAR_COOKBOOK: "https://ng-cookbook.com",
  DISCORD: "https://discord.gg/KSPpuxD8SG",
};

// Base nav items — always visible
const baseNavLinks = [
  { href: "/mentorship", title: "Mentorship" },
  { href: "/projects", title: "Projects" },
  { href: "/roadmaps", title: "Roadmaps" },
  { href: "/courses", title: "Courses" },
  { href: "/books", title: "Books" },
  { href: "https://blog.codewithahsan.dev/", title: "Blog", external: true },
  { href: "/about", title: "About" },
];

// Feature-flag-gated insertions (per D-11 in .planning/phases/01-foundation-roles-array-migration/01-CONTEXT.md).
// NEXT_PUBLIC_* is inlined by Next.js at build time, so this evaluates at bundle time.
const AMBASSADORS_ENABLED = process.env.NEXT_PUBLIC_FEATURE_AMBASSADOR_PROGRAM === "true";

const headerNavLinks = AMBASSADORS_ENABLED
  ? [
      ...baseNavLinks.slice(0, 3), // Mentorship, Projects, Roadmaps
      { href: "/ambassadors", title: "Ambassadors" },
      ...baseNavLinks.slice(3),    // Courses, Books, Blog, About
    ]
  : baseNavLinks;

// Secondary items — accessible via "More" dropdown or footer
export const MORE_LINKS = [
  { href: "/events", title: "Events" },
  { href: "/logic-buddy", title: "Logic Buddy" },
  { href: "/community", title: "Community Hub" },
  { href: LINKS.DISCORD, title: "Discord", external: true },
];

export default headerNavLinks;
