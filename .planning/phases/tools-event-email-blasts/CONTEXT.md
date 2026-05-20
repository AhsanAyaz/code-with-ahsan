---
phase: tools-event-email-blasts
gathered: 2026-05-20
status: ready
---

# Phase: Tools — Event Email Blasts

## Boundary

Build admin tool to broadcast emails to event/workshop participants. Non-tech assistant authors copy in Ghost (draft + internal tag `#email-blast`), admin pastes recipients from Google Form CSV/TSV, previews rendered HTML, sends via Resend, audit log to Firestore.

**Out of scope:** Recipient CRM / list management UI, scheduled sends, A/B testing, click tracking, unsubscribe management beyond Resend defaults, MDX-event-system integration (events stay markdown for now).

## Locked Decisions

- **D-01 Email provider:** Resend (Mailgun unsubscribed). Single chokepoint `sendEmail()` in `src/lib/email.ts` — 14+ callers untouched.
- **D-02 Env vars:** `RESEND_API_KEY`, `RESEND_FROM_EMAIL` (e.g. `Code With Ahsan <notifications@codewithahsan.dev>`), `RESEND_REPLY_TO=no-reply@codewithahsan.dev`. Replace existing `MAILGUN_*` / `EMAIL_FROM_ADDRESS` / `EMAIL_FROM_NAME` block in `.env.example`.
- **D-03 Authoring tool:** Ghost (already in use for blog). Draft post + internal tag `#email-blast`. Drafts not public. Admin API required for draft fetch — Content API skips drafts.
- **D-04 Ghost env:** `GHOST_ADMIN_API_KEY` (set in .env.local). Admin API URL is the same blog host as Content API (`https://blog.codewithahsan.dev`).
- **D-05 Recipient input:** Paste textarea (TSV/CSV from Google Sheet export). Parser auto-detects email column (column containing `@`). Other column → name. Single column = email-only, name falls back to email-local-part. Dedupe by lowercased email.
- **D-06 Personalization:** `{{name}}` placeholder replaced per recipient in HTML body. No `{{firstName}}` — keep simple.
- **D-07 Rate limit:** Sequential send with 250ms gap (4/sec — Resend free tier safe). No retry. Per-recipient status returned to UI.
- **D-08 Audit log:** Firestore `email-blasts/{auto-id}` — `{subject, ghostPostId, ghostPostTitle, sentBy, sentAt, recipients: [{name, email, ok, error?}]}`. Admin-only read/write rules.
- **D-09 Auth:** Admin-token gate (`x-admin-token` header, ADMIN_TOKEN_KEY pattern — same as raffle admin).
- **D-10 Route:** `/admin/events/email`. API: `GET /api/admin/email-blast/drafts`, `POST /api/admin/email-blast`.
- **D-11 Branding:** Email HTML comes verbatim from Ghost (post body HTML). No `wrapEmailHtml()` wrapping for blasts — Ghost handles styling. Existing `wrapEmailHtml` callers unchanged.

## Canonical Refs

- `src/lib/email.ts` — single email chokepoint (14+ callers)
- `src/app/api/content/blog/search/route.ts` — existing Ghost Content API pattern (env name + filter syntax reference)
- `src/components/admin/AdminAuthGate.tsx` + `ADMIN_TOKEN_KEY` — admin auth pattern
- `src/app/api/raffle/spin/route.ts` — admin-token API pattern reference
- `src/components/admin/AdminSidebar.tsx` — Tools section for nav entry

## Phase Plans

| # | Title | Wave | Depends |
|---|-------|------|---------|
| 01 | Resend migration | 1 | — |
| 02 | Ghost Admin API client | 2 | — |
| 03 | Recipient parser | 1 | — |
| 04 | Admin blast page UI | 3 | 02, 03 |
| 05 | Send API + audit log | 3 | 01, 03 |
| 06 | Sidebar entry + smoke | 4 | 04, 05 |
