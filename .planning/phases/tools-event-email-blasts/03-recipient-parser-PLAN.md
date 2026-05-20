---
phase: tools-event-email-blasts
plan: 03
title: Recipient parser — TSV/CSV paste → {name, email}[] with dedupe
type: execute
wave: 1
depends_on: []
autonomous: true
files_modified:
  - src/lib/email-blast/parseRecipients.ts
  - src/lib/email-blast/__tests__/parseRecipients.test.ts
---

<objective>
Pure parsing lib that takes a pasted blob (from Google Form CSV export, sheet copy, or hand-typed list) and returns a deduplicated, normalized recipient list. Used by the admin blast UI (Plan 04) for live preview and by the send API (Plan 05) for validation.

Why: Non-tech assistant exports workshop registrations from Google Form. Sheet columns are `Timestamp | Full Name | Email | Country/City | …`. They'll copy the Name + Email columns (or just Email) and paste. Parser auto-detects which column is which — no per-paste UI configuration.
</objective>

<context>
- Google Sheets copy → clipboard format is TSV (tab-separated, one row per line).
- Google Form CSV export uses comma separators with quoted fields.
- Hand-typed emails may be newline-separated, single column.
- Email regex pattern already used elsewhere: `src/app/api/raffle/entries/route.ts` line 6: `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`.
</context>

<tasks>

### Task 1 — Implementation

Create `src/lib/email-blast/parseRecipients.ts`:

```typescript
export interface Recipient {
  name: string;   // never empty — falls back to email-local-part
  email: string;  // lowercased, trimmed
}

export interface ParseResult {
  recipients: Recipient[];
  skipped: { line: number; raw: string; reason: string }[];
  duplicatesRemoved: number;
}

export function parseRecipients(input: string): ParseResult;
```

Algorithm:

1. Split input on `\n` or `\r\n`. Trim each line. Drop empty lines.
2. For each line: detect separator — tab if line contains `\t`, else comma if line contains `,`, else single-column.
3. Split row by separator. Strip outer quotes from each cell.
4. **Detect email column:** the cell matching `EMAIL_RE` is the email. The other cell (if present) is the name. If neither cell matches → skip with reason "no valid email".
5. **Single-column row:** if only one cell and it matches `EMAIL_RE` → email = that cell, name = "" (filled in step 7).
6. **First-row header detection:** if line 1 contains "email" (case-insensitive) AND no `@` → treat as header, skip without recording in `skipped[]`.
7. **Name fallback:** if name empty/whitespace → use `email.split("@")[0]`. Title-case the fallback (split on `.`, `_`, `-`, capitalize each, join with space).
8. **Dedupe:** lowercase email is the key. First occurrence wins. Track count in `duplicatesRemoved`.

Where:
```typescript
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
```

### Task 2 — Tests

Create `src/lib/email-blast/__tests__/parseRecipients.test.ts`. Cover:

- **TSV happy path:** `"Alice\talice@example.com\nBob\tbob@example.com"` → 2 recipients.
- **CSV happy path:** `"Alice,alice@example.com\nBob,bob@example.com"` → 2 recipients.
- **Email first column (TSV):** `"alice@example.com\tAlice"` → recipient `{name: "Alice", email: "alice@example.com"}`.
- **Single-column emails:** `"alice@example.com\nbob@example.com"` → 2 recipients, names auto-derived (`"Alice"`, `"Bob"`).
- **Header row skipped:** `"Full Name,Email\nAlice,alice@example.com"` → 1 recipient (header not counted in skipped).
- **Quoted CSV cells:** `'"Alice, PhD","alice@example.com"'` → name `"Alice, PhD"`, email correct.
- **Invalid row:** `"not an email\tno @ here"` → recorded in `skipped[]` with reason.
- **Dedupe:** `"alice@example.com\nalice@example.com\nALICE@EXAMPLE.COM"` → 1 recipient, `duplicatesRemoved: 2`.
- **Name fallback title-case:** `"john.doe@example.com"` (single col) → name `"John Doe"`.
- **Trim whitespace:** `"  Alice  \t  alice@example.com  "` → name `"Alice"`, email `"alice@example.com"`.
- **Empty input:** `""` → `{ recipients: [], skipped: [], duplicatesRemoved: 0 }`.
- **Mixed separators across rows:** parser detects per-row, not globally.

Run: `npx vitest run src/lib/email-blast`

### Task 3 — Commit

Commit: `feat(email-blast): add recipient parser with TSV/CSV auto-detection`

</tasks>

<verification>
- `npx vitest run src/lib/email-blast` passes all tests (≥11 cases).
- `npx tsc --noEmit` passes.
- No external deps added (pure TS).
</verification>
