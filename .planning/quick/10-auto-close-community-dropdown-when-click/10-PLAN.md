---
phase: quick
plan: 10
type: execute
wave: 1
depends_on: []
files_modified:
  - src/components/LayoutWrapper.tsx
  - src/components/MobileNav.tsx
  - src/data/headerNavLinks.js
autonomous: true
must_haves:
  truths:
    - "Clicking any Community dropdown item on desktop closes the dropdown immediately"
    - "Projects and My Projects items show appropriate emojis in both desktop and mobile"
    - "Dropdown still opens correctly on hover or click"
    - "Mobile nav Community section still works (already closes nav on item click)"
  artifacts:
    - path: "src/components/LayoutWrapper.tsx"
      provides: "Desktop Community dropdown with auto-close behavior and project emoji rendering"
    - path: "src/components/MobileNav.tsx"
      provides: "Mobile Community section with project emoji rendering"
    - path: "src/data/headerNavLinks.js"
      provides: "Community links data with icon identifiers"
  key_links:
    - from: "src/components/LayoutWrapper.tsx"
      to: "src/data/headerNavLinks.js"
      via: "COMMUNITY_LINKS import, icon field rendering"
      pattern: "item\\.icon === .projects."
---

<objective>
Fix Community dropdown UX: auto-close when clicking menu items, and add emojis to Projects/My Projects items.

Purpose: Currently the desktop Community dropdown stays open after clicking a menu item, requiring users to manually click outside. This is poor UX. Additionally, the Projects and My Projects items are missing emojis while other items (Mentorship, Discord, Logic Buddy) already have them.

Output: Updated LayoutWrapper.tsx with click-to-close dropdown behavior, and emoji rendering for project icons in both desktop and mobile nav.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/components/LayoutWrapper.tsx
@src/components/MobileNav.tsx
@src/data/headerNavLinks.js
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add emojis for Projects and My Projects icons</name>
  <files>src/data/headerNavLinks.js</files>
  <action>
Update the COMMUNITY_LINKS array in headerNavLinks.js to use distinct icon identifiers for Projects and My Projects:

- Change the "Projects" entry icon from "projects" to "projects" (keep same, we will add rendering)
- Change the "My Projects" entry icon from "projects" to "my-projects" (distinct from Projects)

Actually, keep them both as "projects" and "my-projects" respectively for more targeted emoji selection:
- Projects (discover page): use icon "projects"
- My Projects: use icon "my-projects"

Emoji choices to match the existing style:
- Projects (discover): use rocket emoji to convey launching/building projects together
- My Projects: use folder/briefcase emoji to convey your personal project collection

Final COMMUNITY_LINKS should be:
```js
export const COMMUNITY_LINKS = [
  { href: "/mentorship", title: "Mentorship", icon: "mentorship" },
  { href: "/projects/discover", title: "Projects", icon: "projects" },
  { href: "/projects/my", title: "My Projects", icon: "my-projects" },
  { href: LINKS.DISCORD, title: "Discord", icon: "discord", external: true },
  { href: "/logic-buddy", title: "Logic Buddy", icon: "brain" },
];
```
  </action>
  <verify>File saved without syntax errors. The icon fields are "projects" and "my-projects".</verify>
  <done>COMMUNITY_LINKS has distinct icon identifiers for Projects and My Projects items.</done>
</task>

<task type="auto">
  <name>Task 2: Auto-close desktop dropdown on item click and render project emojis</name>
  <files>src/components/LayoutWrapper.tsx, src/components/MobileNav.tsx</files>
  <action>
**LayoutWrapper.tsx — Desktop dropdown fix:**

The current desktop Community dropdown uses DaisyUI's `dropdown dropdown-hover` CSS-only pattern (line 84). This does not close on item click. Replace it with a controlled React state approach:

1. Add `useState` import (React) at the top. The component is already `"use client"`.
2. Add state: `const [communityOpen, setCommunityOpen] = useState(false)` inside the LayoutWrapper component.
3. Add a `ref` using `useRef<HTMLDivElement>(null)` for the dropdown container.
4. Add a `useEffect` that listens for clicks outside the dropdown to close it:
   ```tsx
   useEffect(() => {
     const handleClickOutside = (e: MouseEvent) => {
       if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
         setCommunityOpen(false);
       }
     };
     document.addEventListener('mousedown', handleClickOutside);
     return () => document.removeEventListener('mousedown', handleClickOutside);
   }, []);
   ```
5. Replace the `<div className="dropdown dropdown-hover">` with a controlled dropdown:
   ```tsx
   <div className="relative" ref={dropdownRef}>
     <button
       className="btn btn-ghost"
       onClick={() => setCommunityOpen(!communityOpen)}
     >
       Community
       <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
       </svg>
     </button>
     {communityOpen && (
       <ul className="absolute top-full left-0 z-[100] menu p-2 shadow-lg bg-base-100 rounded-box w-52">
         {COMMUNITY_LINKS.map((item) => (
           <li key={item.title}>
             <Link
               href={item.href}
               className="flex items-center gap-2"
               onClick={() => setCommunityOpen(false)}
               {...(item.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
             >
               {item.icon === "discord" && <DiscordIcon />}
               {item.icon === "mentorship" && <span>🤝</span>}
               {item.icon === "projects" && <span>🚀</span>}
               {item.icon === "my-projects" && <span>📂</span>}
               {item.icon === "brain" && <span>🧠</span>}
               {item.title}
               {item.external && (
                 <svg className="w-3 h-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                 </svg>
               )}
             </Link>
           </li>
         ))}
       </ul>
     )}
   </div>
   ```
6. Add `useState`, `useRef`, `useEffect` to the React import.

**MobileNav.tsx — Add project emoji rendering:**

The mobile nav already closes on item click (line 144: `onClick={onToggleNav}`). Only need to add emoji rendering for the project icons.

In the COMMUNITY_LINKS.map section (around line 147-149), add rendering for the new icon types:
```tsx
{item.icon === "discord" && <DiscordIcon />}
{item.icon === "mentorship" && <span className="text-xl">🤝</span>}
{item.icon === "projects" && <span className="text-xl">🚀</span>}
{item.icon === "my-projects" && <span className="text-xl">📂</span>}
{item.icon === "brain" && <span className="text-xl">🧠</span>}
```
  </action>
  <verify>
1. Run `npx next build` or `npx next lint` to confirm no TypeScript/JSX errors.
2. Visual check: start dev server (`npm run dev`), navigate to site, hover/click Community dropdown on desktop — items show emojis, clicking any item closes dropdown. On mobile, Community section shows emojis for all items.
  </verify>
  <done>
Desktop Community dropdown closes when any menu item is clicked. Projects shows rocket emoji, My Projects shows folder emoji. Mobile nav also shows both emojis. No regressions to existing dropdown items (Mentorship, Discord, Logic Buddy).
  </done>
</task>

</tasks>

<verification>
1. Desktop: Click "Community" button — dropdown opens. Click "Projects" — dropdown closes and navigates. Repeat for each item.
2. Desktop: Click outside dropdown — it closes.
3. Desktop: All 5 community items show their respective icons/emojis.
4. Mobile: Tap hamburger, expand Community, tap any item — mobile nav closes. All items show icons/emojis.
5. No console errors or build warnings.
</verification>

<success_criteria>
- Community dropdown on desktop auto-closes when any menu item is clicked
- Community dropdown closes when clicking outside of it
- Projects item shows rocket emoji in both desktop and mobile
- My Projects item shows folder emoji in both desktop and mobile
- Existing items (Mentorship, Discord, Logic Buddy) still show their icons correctly
- No build errors or regressions
</success_criteria>

<output>
After completion, create `.planning/quick/10-auto-close-community-dropdown-when-click/10-SUMMARY.md`
</output>
