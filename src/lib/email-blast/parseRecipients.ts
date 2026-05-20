const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export interface Recipient {
  name: string; // never empty — falls back to email-local-part
  email: string; // lowercased, trimmed
}

export interface ParseResult {
  recipients: Recipient[];
  skipped: { line: number; raw: string; reason: string }[];
  duplicatesRemoved: number;
}

/**
 * Title-case a string derived from the local-part of an email address.
 * Splits on `.`, `_`, `-`, capitalizes first letter of each segment, joins with space.
 * e.g. "john.doe" → "John Doe", "alice_b" → "Alice B"
 */
function titleCaseLocalPart(localPart: string): string {
  return localPart
    .split(/[._-]/)
    .filter((segment) => segment.length > 0)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(" ");
}

/**
 * Strip outer quotes from a CSV/TSV cell value.
 * Handles both single-quoted and double-quoted values.
 */
function stripQuotes(cell: string): string {
  const trimmed = cell.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

/**
 * Parse a single row into its cells based on separator detection.
 * Separator priority: tab if line contains \t, else comma if line contains comma,
 * else treat as single-column.
 *
 * For comma-separated rows, handles quoted fields that may contain commas.
 */
function parseRow(line: string): string[] {
  if (line.includes("\t")) {
    return line.split("\t").map(stripQuotes);
  }

  if (line.includes(",")) {
    // Handle quoted CSV fields that may contain commas
    const cells: string[] = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
        current += char;
      } else if (char === "," && !inQuotes) {
        cells.push(stripQuotes(current.trim()));
        current = "";
      } else {
        current += char;
      }
    }
    cells.push(stripQuotes(current.trim()));
    return cells;
  }

  // Single column
  return [line.trim()];
}

/**
 * Parse a pasted blob of TSV/CSV text into a deduplicated, normalized recipient list.
 *
 * Supports:
 * - Google Sheets TSV copy (tab-separated)
 * - Google Form CSV export (comma-separated, possibly quoted)
 * - Hand-typed newline-separated email lists
 *
 * Auto-detects which column is email, which is name.
 * Deduplicates by lowercased email (first occurrence wins).
 */
export function parseRecipients(input: string): ParseResult {
  const recipients: Recipient[] = [];
  const skipped: { line: number; raw: string; reason: string }[] = [];
  let duplicatesRemoved = 0;

  if (!input || !input.trim()) {
    return { recipients, skipped, duplicatesRemoved };
  }

  const lines = input.split(/\r?\n/).map((l) => l.trim());
  const seenEmails = new Set<string>();
  let firstContentLine = true;

  for (let i = 0; i < lines.length; i++) {
    const lineNum = i + 1;
    const raw = lines[i];

    // Drop empty lines
    if (!raw) continue;

    const cells = parseRow(raw);

    // First-row header detection: if line contains "email" (case-insensitive)
    // AND no cell contains "@" → treat as header, skip without recording in skipped[]
    if (firstContentLine) {
      firstContentLine = false;
      const hasEmail = cells.some((cell) =>
        cell.toLowerCase().trim() === "email" || cell.toLowerCase().trim() === "e-mail"
      );
      const hasAt = cells.some((cell) => cell.includes("@"));
      if (hasEmail && !hasAt) {
        // Header row — silently skip
        continue;
      }
    }

    let emailCell: string | undefined;
    let nameCell: string | undefined;

    if (cells.length === 1) {
      const cell = cells[0];
      if (EMAIL_RE.test(cell)) {
        // Pure email address
        emailCell = cell;
      } else if (cell.includes("@")) {
        // Space-delimited: "Full Name user@example.com" — scan tokens
        const tokens = cell.split(/\s+/);
        const emailToken = tokens.find((t) => EMAIL_RE.test(t));
        if (emailToken) {
          emailCell = emailToken;
          const nameParts = tokens.filter((t) => t !== emailToken).join(" ").trim();
          if (nameParts) nameCell = nameParts;
        } else {
          skipped.push({ line: lineNum, raw, reason: "no valid email" });
          continue;
        }
      } else {
        skipped.push({ line: lineNum, raw, reason: "no valid email" });
        continue;
      }
    } else {
      // Multi-column: detect which cell is the email
      for (const cell of cells) {
        if (EMAIL_RE.test(cell)) {
          emailCell = cell;
        } else if (cell.length > 0) {
          nameCell = cell;
        }
      }

      if (!emailCell) {
        skipped.push({ line: lineNum, raw, reason: "no valid email" });
        continue;
      }
    }

    const email = emailCell.toLowerCase().trim();

    // Dedupe: first occurrence wins
    if (seenEmails.has(email)) {
      duplicatesRemoved++;
      continue;
    }
    seenEmails.add(email);

    // Name fallback: if name is empty/whitespace, derive from email local-part
    let name = nameCell ? nameCell.trim() : "";
    if (!name) {
      const localPart = email.split("@")[0];
      name = titleCaseLocalPart(localPart);
    }

    recipients.push({ name, email });
  }

  return { recipients, skipped, duplicatesRemoved };
}
