---
phase: tools-event-email-blasts
plan: 04
title: Admin blast page UI — /admin/events/email
type: execute
wave: 3
depends_on: [02, 03]
autonomous: true
files_modified:
  - src/app/admin/events/email/page.tsx
  - src/app/admin/events/email/EmailBlastClient.tsx
  - src/app/admin/events/email/PreviewIframe.tsx
---

<objective>
Build the admin-facing UI that ties Ghost drafts + recipient paste + preview + send confirmation together. Live recipient count, draft picker dropdown, sandboxed HTML preview, subject input (auto-filled from Ghost post title, editable), confirm modal before send, post-send results table.

Why: This is the human surface for the whole feature. Everything else is plumbing.
</objective>

<context>
- Existing admin page pattern: `src/app/admin/raffle/page.tsx` + `AdminRaffleClient.tsx`. AdminAuthGate wrapper, client component does fetch + state, `x-admin-token` header on every API call.
- `parseRecipients` from Plan 03 — `src/lib/email-blast/parseRecipients.ts`.
- Draft picker fetches `GET /api/admin/email-blast/drafts` (defined in Plan 05).
- Send POSTs to `/api/admin/email-blast` (defined in Plan 05).
- DaisyUI components: `input`, `textarea`, `select`, `btn`, `modal`, `alert`, `loading`, `stats`.
- Forced dark theme (next-themes `forcedTheme="dark"`).
</context>

<tasks>

### Task 1 — Page shell

Create `src/app/admin/events/email/page.tsx`:

```typescript
import { AdminAuthGate } from "@/components/admin/AdminAuthGate";
import { EmailBlastClient } from "./EmailBlastClient";

export default function EmailBlastPage() {
  return (
    <AdminAuthGate>
      <EmailBlastClient />
    </AdminAuthGate>
  );
}
```

### Task 2 — Client component skeleton

Create `src/app/admin/events/email/EmailBlastClient.tsx`. State shape:

```typescript
type Draft = { id: string; title: string; html: string; updatedAt: string };
type Recipient = { name: string; email: string };
type SendResult = { name: string; email: string; ok: boolean; error?: string };

const [drafts, setDrafts] = useState<Draft[]>([]);
const [draftsLoading, setDraftsLoading] = useState(false);
const [selectedDraftId, setSelectedDraftId] = useState<string>("");
const [subject, setSubject] = useState<string>("");
const [recipientsRaw, setRecipientsRaw] = useState<string>("");
const [parseResult, setParseResult] = useState<ParseResult | null>(null);
const [showConfirm, setShowConfirm] = useState(false);
const [sending, setSending] = useState(false);
const [results, setResults] = useState<SendResult[] | null>(null);
const [error, setError] = useState("");
```

### Task 3 — Draft fetch + picker

- On mount: GET `/api/admin/email-blast/drafts` with `x-admin-token` header. Populate `drafts`.
- "Refresh drafts" button re-fetches.
- `<select>` of draft titles + `(updated <relative>)`. Default empty.
- On selection: auto-populate `subject` with draft title (only if subject empty or user hasn't edited — use a `subjectTouchedRef` like raffle's `titleHydratedRef` pattern).

### Task 4 — Recipient textarea + live parse

- `<textarea>` bound to `recipientsRaw`, monospace font, 8 rows minimum.
- On every keystroke (debounced 150ms): run `parseRecipients(recipientsRaw)` → `parseResult`.
- Live count badge: "X recipients · Y duplicates removed · Z skipped" (color-coded — skipped > 0 = warning).
- Skipped rows shown in collapsible `<details>` block with line numbers + reason.

### Task 5 — Preview iframe

Create `src/app/admin/events/email/PreviewIframe.tsx`:

- Takes `html: string` prop.
- Renders `<iframe srcDoc={html} sandbox="allow-same-origin" title="Email preview" />`.
- Fixed 600px width container, height grows with content (use `iframe.contentDocument.body.scrollHeight` measurement on load).
- Shows placeholder text when `html === ""`.

In client: `selectedDraft?.html` feeds the iframe. Substitute literal `{{name}}` with the first parsed recipient's name OR `[Recipient Name]` as a placeholder so admin sees how personalization renders.

### Task 6 — Confirm modal + send

- "Send to N recipients" button — disabled unless: draft selected, subject non-empty, ≥1 valid recipient, not sending.
- Click → open DaisyUI modal showing:
  - Subject (final)
  - Recipient count
  - First 5 recipient names + emails (full list in collapsible `<details>`)
  - Two buttons: "Send now" (btn-primary), "Cancel" (btn-ghost)
- "Send now" → POST `/api/admin/email-blast`:

```typescript
{
  ghostPostId: selectedDraftId,
  subject: subject.trim(),
  recipients: parseResult.recipients,
}
```

- During send: disable form, show spinner with "Sending X/Y" indicator (server returns results in single response, so spinner is indeterminate — text is "Sending…").
- On response: render `results` table (name, email, ok ✓ / fail ✗ + error tooltip).

### Task 7 — Results table

After send, show:

- Summary stats: `X sent · Y failed`.
- Sortable-ish table: rows colored green (ok) or red (failed). Failed rows show error inline.
- "Reset" button clears form for next blast (keeps drafts loaded).
- Link: "View audit log" → `/admin/events/email/history` (out of scope for this plan, link non-functional placeholder).

### Task 8 — A11y + visual pass

- All inputs labeled with `<label htmlFor>`.
- Live count region: `aria-live="polite"`.
- Send button: `aria-busy={sending}`.
- Confirm modal: focus trap, ESC to close.
- Use opacity ≥ 0.7 for secondary text on dark theme (avoid 0.5 contrast trap — same lesson as raffle audience pass).

### Task 9 — Commit

Commit: `feat(admin): add email blast composer UI at /admin/events/email`

</tasks>

<verification>
- Visit `/admin/events/email` after entering admin token: page renders, drafts load (or "No drafts found" state if Ghost has none tagged).
- Paste 3-line TSV: live count updates.
- Pick a draft: subject auto-fills with draft title, preview renders draft HTML in iframe.
- Click send → confirm modal shows recipient count + first 5 → cancel button closes; send button posts to API.
- `npx tsc --noEmit` passes.
- Manual: keyboard-only flow works (Tab through inputs, Enter to submit form).
</verification>
