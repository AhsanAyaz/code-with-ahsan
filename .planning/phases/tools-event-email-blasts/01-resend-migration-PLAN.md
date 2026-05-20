---
phase: tools-event-email-blasts
plan: 01
title: Resend migration — swap Mailgun for Resend in src/lib/email.ts
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - package.json
  - package-lock.json
  - src/lib/email.ts
  - .env.example
---

<objective>
Swap the email transport in `src/lib/email.ts` from Mailgun to Resend. All 14+ callers of `sendEmail()` (mentorship, ambassador, project emails) keep their existing imports and signatures. Drop `mailgun.js` + `form-data` deps, add `resend`. Update `.env.example` to replace the `MAILGUN_*` / `EMAIL_FROM_*` block with `RESEND_*` env vars.

Why: Mailgun account unsubscribed → email sends currently fail in prod. Resend is the replacement. Single chokepoint refactor keeps blast radius to one file.
</objective>

<context>
- `src/lib/email.ts` lines 1-141 contain the Mailgun client + `sendEmail()` core. Everything below line 141 is template/export functions that use `sendEmail()` and stay unchanged.
- `.env.example` lines 58-65 contain the Mailgun block + EMAIL_FROM_* vars to be replaced.
- Resend SDK docs: https://resend.com/docs/send-with-nodejs
- Env vars already in `.env.local`: `RESEND_API_KEY`, `RESEND_FROM_EMAIL="Code With Ahsan <notifications@codewithahsan.dev>"`, `RESEND_REPLY_TO=no-reply@codewithahsan.dev`.
</context>

<tasks>

### Task 1 — Dependencies

```bash
npm uninstall mailgun.js form-data
npm install resend
```

Verify package.json no longer lists `mailgun.js` or `form-data`. Verify `resend` is present.

### Task 2 — Rewrite `sendEmail()` core

Replace lines 1-141 of `src/lib/email.ts` (everything up through `sendEmail()` close) with Resend equivalent:

- Replace `import Mailgun from "mailgun.js"` + `import formData from "form-data"` with `import { Resend } from "resend"`.
- Replace lazy `getMailgunClient()` with lazy `getResendClient()` returning `Resend | null`. Key from `process.env.RESEND_API_KEY`. Return null if unset; log warn and return false from sendEmail (same shape as current Mailgun warn path).
- Rewrite `sendEmail(to, subject, html, cc?)`:
  - Honor `DISABLE_EMAILS=true` early return (same as today).
  - `from`: `process.env.RESEND_FROM_EMAIL ?? "Code With Ahsan <notifications@codewithahsan.dev>"`.
  - `replyTo`: `process.env.RESEND_REPLY_TO ?? "no-reply@codewithahsan.dev"`.
  - Call `client.emails.send({ from, to: [to], cc: cc ? [cc] : undefined, replyTo, subject, html })`.
  - On Resend SDK error (rejected promise OR `result.error`), log error + return false.
  - On success, log info + return true.
- Keep `emailStyles`, `wrapEmailHtml()`, and all exported template functions (lines 142+) unchanged.

### Task 3 — Update `.env.example`

Replace block at lines 58-65 (Mailgun + EMAIL_FROM_*) with:

```
# Email — Resend transactional email
# Get API key from: https://resend.com/api-keys
RESEND_API_KEY=
RESEND_FROM_EMAIL="Code With Ahsan <notifications@codewithahsan.dev>"
RESEND_REPLY_TO=no-reply@codewithahsan.dev
```

Remove `EMAIL_FROM_ADDRESS` and `EMAIL_FROM_NAME` from `.env.example` (no longer read by `email.ts`). Keep `DISABLE_EMAILS` if present elsewhere.

### Task 4 — Sanity check + commit

```bash
npx tsc --noEmit  # type-check passes
grep -rn "mailgun\|MAILGUN\|EMAIL_FROM_ADDRESS\|EMAIL_FROM_NAME" src/ scripts/ agent/ 2>/dev/null
```

The grep should return zero hits (or only test fixtures explicitly unrelated). If hits exist in source, remove or replace.

Commit: `refactor(email): swap Mailgun for Resend in src/lib/email.ts core`

</tasks>

<verification>
- `package.json` lists `resend`, NOT `mailgun.js` or `form-data`.
- `src/lib/email.ts` first 141 lines use Resend SDK exclusively.
- `npx tsc --noEmit` exits 0.
- All template functions (sendAdminMentorPendingEmail, sendRegistrationStatusEmail, etc) compile unchanged — signature preserved.
- `.env.example` Mailgun block replaced with Resend block.
- Smoke (manual, optional): set `DISABLE_EMAILS=false`, run one mentor-pending email path locally — Resend dashboard shows delivery.
</verification>
