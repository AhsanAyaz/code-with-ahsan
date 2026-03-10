export const LINKS = {
  ANGULAR_COOKBOOK: "https://ng-cookbook.com",
  DISCORD: "https://discord.gg/KSPpuxD8SG",
};

// Primary flat nav items — shown directly in the top bar
// Order: community sections first (promoted), then content, then about
const headerNavLinks = [
  { href: "/mentorship", title: "Mentorship" },
  { href: "/projects", title: "Projects" },
  { href: "/roadmaps", title: "Roadmaps" },
  { href: "/courses", title: "Courses" },
  { href: "/books", title: "Books" },
  { href: "https://blog.codewithahsan.dev/", title: "Blog", external: true },
  { href: "/about", title: "About" },
];

// Secondary items — accessible via "More" dropdown or footer
export const MORE_LINKS = [
  { href: "/events", title: "Events" },
  { href: "/logic-buddy", title: "Logic Buddy" },
  { href: "/community", title: "Community Hub" },
  { href: LINKS.DISCORD, title: "Discord", external: true },
];

export default headerNavLinks;
