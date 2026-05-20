---
phase: tools-event-email-blasts
plan: 06
title: Sidebar entry + E2E smoke + SUMMARY
type: execute
wave: 4
depends_on: [04, 05]
autonomous: false
files_modified:
  - src/components/admin/AdminSidebar.tsx
  - .planning/phases/tools-event-email-blasts/SUMMARY.md
---

<objective>
Add sidebar navigation entry, run end-to-end manual smoke against a live Ghost draft + small recipient list with `DISABLE_EMAILS=true` first then a real one-recipient blast, and write the phase SUMMARY.

Why: Until it's reachable from the sidebar, only people who know the URL can find it. Smoke proves the wiring (Ghost auth, Resend delivery, audit log persistence) end-to-end before this gets handed to the non-tech assistant.
</objective>

<context>
- Existing AdminSidebar at `src/components/admin/AdminSidebar.tsx` — Tools section currently has `Raffle` only.
- The phase has no separate UI-SPEC; sidebar entry is a single-line addition.
</context>

<tasks>

### Task 1 — Add sidebar entry

Edit `src/components/admin/AdminSidebar.tsx` Tools section. Add after the Raffle entry:

```typescript
{ label: "Email Blasts", href: "/admin/events/email" },
```

Verify visually: sidebar renders the new link, active-state highlighting works when on `/admin/events/email`.

### Task 2 — E2E smoke (manual checkpoint — autonomous=false)

User must perform these steps and confirm before plan is marked complete:

**Pre-flight:**
1. Confirm `.env.local` has `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `RESEND_REPLY_TO`, `GHOST_ADMIN_API_KEY`.
2. Restart dev server to pick up env changes if not already restarted.
3. In Ghost admin (https://blog.codewithahsan.dev/ghost/), create a draft post:
   - Title: "Test Blast — DELETE ME"
   - Body: Two short paragraphs with one inline image + `{{name}}` placeholder somewhere
   - Tag: `#email-blast` (internal tag)
   - Status: draft (do NOT publish)

**Dry-run smoke (DISABLE_EMAILS=true):**
4. Set `DISABLE_EMAILS=true` temporarily in `.env.local`.
5. Visit `/admin/events/email`. Authenticate.
6. Click "Refresh drafts" → "Test Blast — DELETE ME" appears in dropdown.
7. Select it. Subject auto-fills.
8. Paste 2-recipient TSV (one real personal email, one fake):
   ```
   Test User	your-email@example.com
   Fake Person	fake@example.com
   ```
9. Verify preview renders the Ghost HTML with `{{name}}` substituted for "Test User".
10. Click "Send to 2 recipients" → confirm → expect success result for both (sendEmail returns true under DISABLE_EMAILS).
11. Check Firestore console — `email-blasts/{id}` doc exists with `status: "completed"`, both recipients logged.

**Live one-recipient smoke (DISABLE_EMAILS=false):**
12. Unset `DISABLE_EMAILS` (or set to `false`). Restart dev.
13. Repeat steps 5-10 but with ONLY your real email in the recipient list.
14. Check inbox — email arrives within ~30s.
15. Verify: subject correct, `{{name}}` replaced with your name, body HTML matches Ghost preview, "From" shows `Code With Ahsan <notifications@codewithahsan.dev>`, "Reply-To" shows `no-reply@codewithahsan.dev`.

**Cleanup:**
16. Delete the test Ghost draft.
17. (Optional) Delete the test Firestore docs from `email-blasts` collection.

### Task 3 — Write SUMMARY

Create `.planning/phases/tools-event-email-blasts/SUMMARY.md` covering:

- What shipped (one paragraph per plan, with commit hashes).
- Files added / removed (Mailgun deps gone, Resend added, Ghost Admin SDK added).
- New env vars + which ones are required vs optional.
- Known limitations: 500 recipient hard cap, sequential send (slow for large lists — ~4min for 1000), no scheduled sends, no unsubscribe handling beyond Resend defaults, no retry on Resend failure.
- Operating runbook for the non-tech assistant:
  1. Write copy in Ghost as draft, tag `#email-blast`, save.
  2. Export Google Form responses to CSV, copy Name + Email columns.
  3. Open `/admin/events/email`, paste, pick draft, preview, send.
- Cost-of-change notes: Resend free tier is 100/day, 3000/month — bump to paid before any cohort > 100.

### Task 4 — Commit

Commit: `feat(admin): wire email-blast sidebar entry + close tools-event-email-blasts phase`

</tasks>

<verification>
- Sidebar shows "Email Blasts" link under Tools.
- Visiting `/admin/events/email` from the link works.
- Dry-run smoke (DISABLE_EMAILS=true) completes — Firestore audit doc exists.
- Live one-recipient send (DISABLE_EMAILS=false) delivers — email received with correct content.
- SUMMARY.md committed and includes operating runbook.
</verification>
