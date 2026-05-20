import { describe, it, expect } from "vitest";
import { parseRecipients } from "../parseRecipients";

describe("parseRecipients", () => {
  it("returns empty result for empty input", () => {
    expect(parseRecipients("")).toEqual({ recipients: [], skipped: [], duplicatesRemoved: 0 });
    expect(parseRecipients("   ")).toEqual({ recipients: [], skipped: [], duplicatesRemoved: 0 });
  });

  it("parses TSV with name first", () => {
    const input = "Alice\talice@example.com\nBob\tbob@example.com";
    const { recipients, skipped, duplicatesRemoved } = parseRecipients(input);
    expect(recipients).toHaveLength(2);
    expect(recipients[0]).toEqual({ name: "Alice", email: "alice@example.com" });
    expect(recipients[1]).toEqual({ name: "Bob", email: "bob@example.com" });
    expect(skipped).toHaveLength(0);
    expect(duplicatesRemoved).toBe(0);
  });

  it("parses TSV with email first", () => {
    const input = "alice@example.com\tAlice";
    const { recipients } = parseRecipients(input);
    expect(recipients).toHaveLength(1);
    expect(recipients[0]).toEqual({ name: "Alice", email: "alice@example.com" });
  });

  it("parses CSV with name first", () => {
    const input = "Alice,alice@example.com\nBob,bob@example.com";
    const { recipients } = parseRecipients(input);
    expect(recipients).toHaveLength(2);
    expect(recipients[0]).toEqual({ name: "Alice", email: "alice@example.com" });
  });

  it("parses single-column email list with auto-derived names", () => {
    const input = "alice@example.com\nbob@example.com";
    const { recipients } = parseRecipients(input);
    expect(recipients).toHaveLength(2);
    expect(recipients[0].email).toBe("alice@example.com");
    expect(recipients[0].name).toBe("Alice");
    expect(recipients[1].email).toBe("bob@example.com");
    expect(recipients[1].name).toBe("Bob");
  });

  it("skips header row containing 'email' with no @ sign", () => {
    const input = "Full Name,Email\nAlice,alice@example.com\nBob,bob@example.com";
    const { recipients, skipped } = parseRecipients(input);
    expect(recipients).toHaveLength(2);
    expect(skipped).toHaveLength(0);
  });

  it("handles quoted CSV cells including commas in name", () => {
    const input = '"Alice, PhD","alice@example.com"';
    const { recipients } = parseRecipients(input);
    expect(recipients).toHaveLength(1);
    expect(recipients[0].name).toBe("Alice, PhD");
    expect(recipients[0].email).toBe("alice@example.com");
  });

  it("records invalid rows in skipped[]", () => {
    const input = "not an email\tno at sign\nalice@example.com";
    const { recipients, skipped } = parseRecipients(input);
    expect(recipients).toHaveLength(1);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe("no valid email");
    expect(skipped[0].line).toBe(1);
  });

  it("deduplicates by lowercased email, first occurrence wins", () => {
    const input = "Alice\talice@example.com\nALICE\tALICE@EXAMPLE.COM\nalice2\talice@example.com";
    const { recipients, duplicatesRemoved } = parseRecipients(input);
    expect(recipients).toHaveLength(1);
    expect(recipients[0].name).toBe("Alice");
    expect(duplicatesRemoved).toBe(2);
  });

  it("title-cases email local-part for name fallback with dots", () => {
    const { recipients } = parseRecipients("john.doe@example.com");
    expect(recipients[0].name).toBe("John Doe");
  });

  it("title-cases email local-part for name fallback with underscores", () => {
    const { recipients } = parseRecipients("alice_b@example.com");
    expect(recipients[0].name).toBe("Alice B");
  });

  it("title-cases email local-part for name fallback with hyphens", () => {
    const { recipients } = parseRecipients("mary-jane@example.com");
    expect(recipients[0].name).toBe("Mary Jane");
  });

  it("trims whitespace from name and email cells", () => {
    const input = "  Alice  \t  ALICE@EXAMPLE.COM  ";
    const { recipients } = parseRecipients(input);
    expect(recipients[0].name).toBe("Alice");
    expect(recipients[0].email).toBe("alice@example.com");
  });

  it("skips blank lines silently", () => {
    const input = "Alice\talice@example.com\n\n\nBob\tbob@example.com";
    const { recipients } = parseRecipients(input);
    expect(recipients).toHaveLength(2);
  });

  it("lowercases all emails in output", () => {
    const { recipients } = parseRecipients("Alice\tALICE@EXAMPLE.COM");
    expect(recipients[0].email).toBe("alice@example.com");
  });
});
