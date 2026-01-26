import {
  randUserName,
  randEmail,
  randFullName,
} from "@ngneat/falso";

// Cache to ensure consistent fake data for the same ID within a session
const cache: Record<string, { name?: string; email?: string; discord?: string }> = {};

/**
 * Get an anonymized display name for a user.
 * Returns a consistent fake name based on the UID if streamer mode is on.
 */
export function getAnonymizedDisplayName(
  original: string | undefined | null,
  uid: string,
  isStreamerMode: boolean
): string {
  if (!isStreamerMode || !original) return original || "Unknown";
  
  if (!cache[uid]) cache[uid] = {};
  if (!cache[uid].name) {
    // We can't easily seed with a string in falso to get deterministic results without resetting global seed.
    // So we just generate once and cache it.
    cache[uid].name = randFullName();
  }
  
  return cache[uid].name!;
}

/**
 * Get an anonymized email for a user.
 */
export function getAnonymizedEmail(
  original: string | undefined | null,
  uid: string,
  isStreamerMode: boolean
): string {
  if (!isStreamerMode || !original) return original || "N/A";

  if (!cache[uid]) cache[uid] = {};
  if (!cache[uid].email) {
    cache[uid].email = randEmail();
  }

  return cache[uid].email!;
}

/**
 * Get an anonymized Discord username for a user.
 */
export function getAnonymizedDiscord(
  original: string | undefined | null,
  uid: string,
  isStreamerMode: boolean
): string | undefined {
  if (!isStreamerMode) return original || undefined;
  if (!original) return undefined;

  if (!cache[uid]) cache[uid] = {};
  if (!cache[uid].discord) {
    cache[uid].discord = randUserName().toLowerCase();
  }

  return cache[uid].discord!;
}
