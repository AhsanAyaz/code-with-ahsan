---
phase: quick-055
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/app/privacy/page.tsx
  - src/app/terms/page.tsx
  - src/components/Footer.tsx
autonomous: true

must_haves:
  truths:
    - Privacy Policy page accessible at /privacy with comprehensive content
    - Terms of Service page accessible at /terms with comprehensive content
    - Footer contains links to both policy pages
    - Pages meet Google Calendar OAuth compliance requirements
  artifacts:
    - path: src/app/privacy/page.tsx
      provides: Privacy Policy page with Google Calendar data usage disclosure
      min_lines: 150
    - path: src/app/terms/page.tsx
      provides: Terms of Service page with platform usage terms
      min_lines: 150
    - path: src/components/Footer.tsx
      provides: Footer links to legal pages
      contains: /privacy
  key_links:
    - from: src/components/Footer.tsx
      to: /privacy
      via: Link component
      pattern: href=\"/privacy\"
    - from: src/components/Footer.tsx
      to: /terms
      via: Link component
      pattern: href=\"/terms\"
---

<objective>
Create comprehensive Privacy Policy and Terms of Service pages to meet Google Calendar OAuth compliance requirements.

Purpose: Google's OAuth verification requires published Privacy Policy and Terms of Service pages that disclose how user data (especially Google Calendar data) is collected, used, and protected.

Output: Two professionally formatted legal pages accessible via /privacy and /terms routes, linked from the footer.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/components/Footer.tsx
@src/data/siteMetadata.js
</context>

<tasks>

<task type="auto">
  <name>Create Privacy Policy and Terms of Service pages</name>
  <files>
    src/app/privacy/page.tsx
    src/app/terms/page.tsx
  </files>
  <action>
Create two Next.js pages with professional legal content and consistent styling:

**Privacy Policy (src/app/privacy/page.tsx):**
- Page metadata: title "Privacy Policy - CodeWithAhsan", description about data handling
- Container layout: `container mx-auto px-4 py-8 max-w-4xl` for readable width
- Content sections covering:
  1. Introduction and effective date (use current date: February 16, 2026)
  2. Information We Collect (Firebase auth, profile data, mentorship data, booking data)
  3. Google Calendar Integration (CRITICAL for OAuth):
     - Explicitly state that we access Google Calendar API to create/update events
     - Data accessed: calendar events for mentor session bookings
     - How we use it: Creating calendar events when bookings are made
     - Data storage: Refresh tokens stored encrypted in Firestore
     - User control: Can disconnect calendar integration at any time
  4. Discord Integration (username collection, DM notifications, channel access)
  5. How We Use Your Information (platform functionality, communication)
  6. Data Sharing and Third Parties (Firebase, Google Calendar API, Discord)
  7. Data Security (encryption, secure storage)
  8. Your Rights (access, deletion, data portability)
  9. Cookies and Analytics (Google Analytics ID from siteMetadata: G-GXQ6YGD3WM)
  10. Children's Privacy (not directed at children under 13)
  11. Changes to Privacy Policy (notify via platform)
  12. Contact Information (email from siteMetadata: muhd.ahsanayaz@gmail.com)
- Use semantic HTML: h1 for title, h2 for sections, p for content, ul/li for lists
- Tailwind classes for typography: `prose prose-lg max-w-none` wrapper for automatic formatting

**Terms of Service (src/app/terms/page.tsx):**
- Page metadata: title "Terms of Service - CodeWithAhsan", description about usage terms
- Same container layout pattern
- Content sections covering:
  1. Acceptance of Terms and effective date
  2. Description of Service (mentorship platform, project collaboration, learning roadmaps)
  3. User Accounts and Responsibilities (accurate information, account security)
  4. Mentorship Program Terms:
     - Mentor/mentee matching process
     - Session booking and cancellation policies
     - Code of conduct expectations
  5. Project Collaboration Terms:
     - Project creation and approval process
     - Team member responsibilities
     - Intellectual property (users retain ownership)
  6. Content Guidelines (respectful communication, no harassment)
  7. Discord Community Rules (follow Discord ToS, moderator authority)
  8. Google Calendar Integration Terms:
     - Optional feature requiring user consent
     - Users can disconnect at any time
     - We follow Google API Services User Data Policy
  9. Prohibited Activities (spam, abuse, unauthorized access)
  10. Limitation of Liability (platform provided "as is")
  11. Termination Rights (can terminate accounts for violations)
  12. Changes to Terms (notify users of updates)
  13. Governing Law (mention jurisdiction if applicable, or state "applicable laws")
  14. Contact Information (same email)
- Same prose styling for consistent formatting

Both pages should use the same container structure as other content pages (rates, about). Typography should be professional and readable with proper spacing.
  </action>
  <verify>
Visit http://localhost:3000/privacy and http://localhost:3000/terms to verify:
- Both pages render without errors
- Content is comprehensive and well-formatted
- Google Calendar data usage is clearly disclosed in Privacy Policy
- Professional appearance with proper spacing and typography
- Pages are responsive on mobile
  </verify>
  <done>
Privacy Policy and Terms of Service pages created with comprehensive legal content covering all platform features (Firebase auth, mentorship, projects, roadmaps, Google Calendar integration, Discord integration), professional formatting, and clear disclosure of data handling practices.
  </done>
</task>

<task type="auto">
  <name>Add legal page links to footer</name>
  <files>
    src/components/Footer.tsx
  </files>
  <action>
Update the Footer component to include links to Privacy Policy and Terms of Service pages.

Current footer structure has two sections:
1. `<nav>` with social icons
2. `<aside>` with author/copyright/site title text

Add a new navigation section between them with legal links:

```tsx
<nav className="grid grid-flow-col gap-4">
  <Link href="/privacy" className="link link-hover text-sm">
    Privacy Policy
  </Link>
  <Link href="/terms" className="link link-hover text-sm">
    Terms of Service
  </Link>
</nav>
```

This creates a centered row of legal links with consistent styling using DaisyUI's link-hover class. Position it after the social icons nav and before the copyright aside.

The footer already has flex-col on md:flex-row, so the new nav will stack vertically on mobile and flow horizontally on desktop, matching the existing responsive pattern.
  </action>
  <verify>
Visit any page on http://localhost:3000 and check the footer:
- Privacy Policy and Terms of Service links are visible
- Links are properly styled and hover states work
- Clicking links navigates to /privacy and /terms respectively
- Footer layout remains clean and organized on both mobile and desktop
  </verify>
  <done>
Footer updated with Privacy Policy and Terms of Service links that are accessible from every page, properly styled, and responsive across devices.
  </done>
</task>

</tasks>

<verification>
**Manual checks:**
1. Navigate to /privacy - comprehensive policy with Google Calendar section
2. Navigate to /terms - clear terms covering platform features
3. Check footer on homepage - legal links present and functional
4. Mobile responsiveness - pages and footer work on narrow screens

**Google OAuth compliance:**
- Privacy Policy explicitly mentions Google Calendar API data access
- Clear disclosure of what calendar data is accessed and why
- User control options documented
- Both pages publicly accessible without authentication
</verification>

<success_criteria>
- [ ] /privacy page renders with comprehensive Privacy Policy
- [ ] /terms page renders with comprehensive Terms of Service
- [ ] Both pages include current effective date (Feb 16, 2026)
- [ ] Privacy Policy has dedicated Google Calendar section with data usage disclosure
- [ ] Both pages use professional formatting with prose typography
- [ ] Footer contains working links to both legal pages
- [ ] Pages are publicly accessible and responsive
- [ ] Contact email (muhd.ahsanayaz@gmail.com) included in both pages
- [ ] Ready for Google Calendar OAuth verification submission
</success_criteria>

<output>
After completion, create `.planning/quick/55-create-privacy-policy-and-terms-of-servi/055-SUMMARY.md` documenting the legal pages created and footer modifications.
</output>
