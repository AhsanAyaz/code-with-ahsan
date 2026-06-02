import type {
  Challenge,
  ChallengeDifficulty,
  ChallengeResource,
  ChallengeStatus,
  LeaderboardEntry,
  Submission,
} from "@/types/challenges";

// Shared constants for UI forms and logic fallback values
export const CHALLENGE_STATUSES = ["upcoming", "active", "past"] as const;
export const CHALLENGE_DIFFICULTIES = [
  "beginner",
  "intermediate",
  "advanced",
] as const;

export const DEFAULT_CHALLENGE_STATUS: ChallengeStatus = "upcoming";
export const DEFAULT_CHALLENGE_DIFFICULTY: ChallengeDifficulty = "intermediate";
export const DEFAULT_CHALLENGE_TOPIC = "General";
export const ANONYMOUS_CHALLENGE_PARTICIPANT = "Anonymous Participant";
export const CHALLENGE_SUBMISSION_SCORE = 10;

/**
 * Centralized mapping for rendering DaisyUI badge classes based on ChallengeStatus.
 * Used consistently across all Challenge cards and detail views.
 */
export const CHALLENGE_STATUS_BADGE_CLASSES: Record<ChallengeStatus, string> = {
  upcoming: "badge-info",
  active: "badge-success",
  past: "badge-ghost",
};

/**
 * Centralized mapping for rendering DaisyUI badge classes based on ChallengeDifficulty.
 */
export const CHALLENGE_DIFFICULTY_BADGE_CLASSES: Record<
  ChallengeDifficulty,
  string
> = {
  beginner: "badge-success",
  intermediate: "badge-warning",
  advanced: "badge-error",
};

export type ChallengePayload = Omit<Challenge, "id" | "createdAt" | "updatedAt">;
export type ChallengePayloadResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string };

export type ParsedLeaderboardQuery =
  | { ok: true; limit: number; month?: string }
  | { ok: false; error: string };

/**
 * Type guard for ChallengeStatus
 */
export function isChallengeStatus(value: unknown): value is ChallengeStatus {
  return (
    typeof value === "string" &&
    CHALLENGE_STATUSES.includes(value as ChallengeStatus)
  );
}

/**
 * Type guard for ChallengeDifficulty
 */
export function isChallengeDifficulty(
  value: unknown,
): value is ChallengeDifficulty {
  return (
    typeof value === "string" &&
    CHALLENGE_DIFFICULTIES.includes(value as ChallengeDifficulty)
  );
}

/**
 * Utility to parse a block of text into a clean string array.
 * Splits by newline, trims each line, and drops empty lines.
 */
export function parseStringLines(value: string) {
  return value
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

/**
 * Parses user input for challenge resources.
 * Expects lines formatted as "Title | URL" or just "URL".
 * Automatically handles trimming and malformed lines gracefully.
 */
export function parseChallengeResourcesText(value: string) {
  return parseStringLines(value).map((line) => {
    const [titlePart, ...urlParts] = line.split("|");
    const title = titlePart.trim();
    const url = urlParts.join("|").trim();

    return url ? { title, url } : { title, url: title };
  });
}

export function parseChallengeStringArray(value: unknown) {
  return Array.isArray(value)
    ? value
        .filter(
          (item): item is string =>
            typeof item === "string" && item.trim().length > 0,
        )
        .map((item) => item.trim())
    : [];
}

export function parseChallengeResources(value: unknown): ChallengeResource[] {
  if (!Array.isArray(value)) return [];

  return value
    .filter(
      (item): item is { title: string; url: string } =>
        typeof item === "object" &&
        item !== null &&
        "title" in item &&
        "url" in item &&
        typeof item.title === "string" &&
        typeof item.url === "string",
    )
    .map((item) => ({ title: item.title.trim(), url: item.url.trim() }))
    .filter((item) => item.title.length > 0 && item.url.length > 0);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getTrimmedString(
  body: Record<string, unknown>,
  key: string,
): string | undefined {
  const value = body[key];
  return typeof value === "string" ? value.trim() : undefined;
}

function hasField(body: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(body, key);
}

/**
 * Parses and validates an incoming raw JSON payload for Challenge Creation.
 * Ensures all required fields are present and strings are properly trimmed.
 * Falls back to default values for optional metadata (status, difficulty).
 * 
 * @param body The raw request payload, typically from a POST request.
 * @returns A strictly-typed payload ready for Firestore, or an error message.
 */
export function parseChallengeCreatePayload(
  body: unknown,
): ChallengePayloadResult<ChallengePayload> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid challenge payload" };
  }

  const title = getTrimmedString(body, "title");
  const description = getTrimmedString(body, "description");
  const startDate = getTrimmedString(body, "startDate");
  const endDate = getTrimmedString(body, "endDate");
  const difficulty = body.difficulty;
  const status = body.status;

  if (!title || !description || !startDate || !endDate) {
    return { ok: false, error: "Missing required fields" };
  }

  if (difficulty && !isChallengeDifficulty(difficulty)) {
    return { ok: false, error: "Invalid challenge difficulty" };
  }

  if (status && !isChallengeStatus(status)) {
    return { ok: false, error: "Invalid challenge status" };
  }

  return {
    ok: true,
    data: {
      title,
      description,
      topic: getTrimmedString(body, "topic") || DEFAULT_CHALLENGE_TOPIC,
      difficulty: (difficulty as ChallengeDifficulty) || DEFAULT_CHALLENGE_DIFFICULTY,
      startDate,
      endDate,
      status: (status as ChallengeStatus) || DEFAULT_CHALLENGE_STATUS,
      brief: getTrimmedString(body, "brief") || "",
      deliverables: parseChallengeStringArray(body.deliverables),
      resources: parseChallengeResources(body.resources),
    },
  };
}

/**
 * Parses and validates an incoming raw JSON payload for Challenge Updates.
 * Works similarly to creation but allows partial updates.
 * Only includes fields that are actually present in the request body.
 */
export function parseChallengeUpdatePayload(
  body: unknown,
): ChallengePayloadResult<Partial<ChallengePayload>> {
  if (!isRecord(body)) {
    return { ok: false, error: "Invalid challenge payload" };
  }

  if (hasField(body, "difficulty") && !isChallengeDifficulty(body.difficulty)) {
    return { ok: false, error: "Invalid challenge difficulty" };
  }

  if (hasField(body, "status") && !isChallengeStatus(body.status)) {
    return { ok: false, error: "Invalid challenge status" };
  }

  const updates: Partial<ChallengePayload> = {};
  const stringFields = [
    "title",
    "description",
    "topic",
    "startDate",
    "endDate",
    "brief",
  ] as const;

  stringFields.forEach((field) => {
    if (hasField(body, field)) {
      const value = getTrimmedString(body, field);
      if (value !== undefined) {
        updates[field] = value;
      }
    }
  });

  if (hasField(body, "difficulty")) {
    updates.difficulty = body.difficulty as ChallengeDifficulty;
  }

  if (hasField(body, "status")) {
    updates.status = body.status as ChallengeStatus;
  }

  if (hasField(body, "deliverables")) {
    updates.deliverables = parseChallengeStringArray(body.deliverables);
  }

  if (hasField(body, "resources")) {
    updates.resources = parseChallengeResources(body.resources);
  }

  return { ok: true, data: updates };
}

/**
 * Parses standard query parameters for Leaderboard endpoints.
 * Validates 'limit' constraints (1-100) and 'month' format (YYYY-MM).
 */
export function parseLeaderboardQuery(
  searchParams: URLSearchParams,
): ParsedLeaderboardQuery {
  const limitParam = searchParams.get("limit");
  const month = searchParams.get("month") || undefined;

  if (limitParam && !/^\d+$/.test(limitParam)) {
    return { ok: false, error: "Limit must be an integer between 1 and 100" };
  }

  const limit = limitParam ? Number(limitParam) : 50;

  if (limit < 1 || limit > 100) {
    return { ok: false, error: "Limit must be an integer between 1 and 100" };
  }

  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    return { ok: false, error: "Month must use YYYY-MM format" };
  }

  return { ok: true, limit, month };
}

/**
 * Shared utility for formatting challenge timelines (e.g. "Jan 1, 2024 - Jan 31, 2024").
 */
export function formatChallengeDateRange(
  startDate: string,
  endDate: string,
  variant: "short" | "long" = "short",
) {
  const formatter = new Intl.DateTimeFormat("en", {
    month: variant === "long" ? "long" : "short",
    day: "numeric",
    year: "numeric",
  });

  return `${formatter.format(new Date(startDate))} - ${formatter.format(new Date(endDate))}`;
}

/**
 * Shared utility for formatting leaderboard month buckets (e.g. "January 2024").
 */
export function formatLeaderboardMonth(month: string) {
  return new Intl.DateTimeFormat("en", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${month}-01T00:00:00.000Z`));
}

/**
 * Performs in-memory aggregation of individual submissions into a leaderboard.
 * 
 * Features:
 * - Sums scores across multiple challenges.
 * - Counts unique challenges completed by a user.
 * - Deduplicates user entries by keeping the latest profile information.
 * - Sorts by total points descending, returning up to `limit` entries.
 */
export function buildLeaderboardFromSubmissions(
  submissions: Submission[],
  limit = 50,
): LeaderboardEntry[] {
  const entryMap = new Map<
    string,
    LeaderboardEntry & { challengeIds: Set<string> }
  >();

  submissions.forEach((submission) => {
    const existing = entryMap.get(submission.userId);
    const score = submission.score || CHALLENGE_SUBMISSION_SCORE;

    if (!existing) {
      entryMap.set(submission.userId, {
        userId: submission.userId,
        username: submission.userName,
        userAvatar: submission.userAvatar,
        totalPoints: score,
        challengesCompleted: 1,
        challengeIds: new Set([submission.challengeId]),
      });
      return;
    }

    existing.totalPoints += score;
    existing.challengeIds.add(submission.challengeId);
    existing.challengesCompleted = existing.challengeIds.size;
    existing.username = submission.userName;
    existing.userAvatar = submission.userAvatar;
  });

  return Array.from(entryMap.values())
    .sort((first, second) => second.totalPoints - first.totalPoints)
    .slice(0, limit)
    .map((entry) => ({
      userId: entry.userId,
      username: entry.username,
      userAvatar: entry.userAvatar,
      totalPoints: entry.totalPoints,
      challengesCompleted: entry.challengesCompleted,
    }));
}
