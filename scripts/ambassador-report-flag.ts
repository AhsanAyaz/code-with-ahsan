#!/usr/bin/env npx tsx
/**
 * Phase 4 (REPORT-04 + REPORT-05): Daily missing-report flagger.
 *
 * For each active ambassador:
 *   1. Compute the PREVIOUS calendar month key (`YYYY-MM`) in their timezone.
 *   2. If no `monthly_reports/{ambassadorId}_{prevMonth}` doc exists AND the deadline
 *      has passed, write a `ambassador_cron_flags` doc with type=missing_report.
 *   3. For the CURRENT calendar month, send a Discord DM reminder:
 *        - 3 days before deadline (REPORT-05)
 *        - On deadline day (REPORT-05)
 *
 * D-06 INVARIANT: NEVER mutate strikes, roles, or any field on the ambassador
 * subdoc. The only Firestore write this script performs is to `ambassador_cron_flags`.
 *
 * Run: npx tsx scripts/ambassador-report-flag.ts [--dry-run]
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendDirectMessage } from "../src/lib/discord";
import {
  AMBASSADOR_CRON_FLAGS_COLLECTION,
  MONTHLY_REPORTS_COLLECTION,
} from "../src/lib/ambassador/constants";
import { PUBLIC_AMBASSADORS_COLLECTION } from "../src/types/ambassador";
import {
  getAmbassadorMonthKey,
  getCurrentMonthKey,
  getDeadlineUTC,
} from "../src/lib/ambassador/reportDeadline";

const DRY_RUN = process.argv.includes("--dry-run");
const DM_REMINDER_LEAD_DAYS = 3;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

interface ActiveAmbassador {
  uid: string;
  discordHandle?: string;
  displayName?: string;
  timezone: string;
}

async function loadActiveAmbassadors(): Promise<ActiveAmbassador[]> {
  // Use public_ambassadors projection (already filtered to active ambassadors in Phase 3)
  // Join with subdoc for timezone + Discord info.
  const snap = await db
    .collection(PUBLIC_AMBASSADORS_COLLECTION)
    .where("active", "==", true)
    .get();

  const results: ActiveAmbassador[] = [];
  for (const doc of snap.docs) {
    const uid = doc.id;
    // Read subdoc for timezone
    const subdocSnap = await db
      .collection("mentorship_profiles")
      .doc(uid)
      .collection("ambassador")
      .doc("v1")
      .get();
    const subdoc = subdocSnap.data() ?? {};
    const profileSnap = await db.collection("mentorship_profiles").doc(uid).get();
    const profile = profileSnap.data() ?? {};

    results.push({
      uid,
      discordHandle:
        typeof profile.discordUsername === "string" ? profile.discordUsername : undefined,
      displayName:
        typeof profile.displayName === "string" ? profile.displayName : uid,
      timezone:
        typeof subdoc.timezone === "string" && subdoc.timezone.length > 0
          ? subdoc.timezone
          : "UTC",
    });
  }
  return results;
}

async function hasReportForMonth(uid: string, monthKey: string): Promise<boolean> {
  const docId = `${uid}_${monthKey}`;
  const snap = await db.collection(MONTHLY_REPORTS_COLLECTION).doc(docId).get();
  return snap.exists;
}

async function writeFlag(ambassadorId: string, period: string): Promise<void> {
  // Deterministic doc id — re-runs do not duplicate unresolved flags.
  const flagId = `${ambassadorId}_missing_report_${period}`;
  if (DRY_RUN) {
    console.log(`[DRY-RUN] would write flag: ${flagId}`);
    return;
  }
  await db.collection(AMBASSADOR_CRON_FLAGS_COLLECTION).doc(flagId).set(
    {
      ambassadorId,
      type: "missing_report",
      period,
      flaggedAt: FieldValue.serverTimestamp(),
      resolved: false,
    },
    { merge: true }
  );
}

function shouldRemind(
  currentMonthKey: string,
  timezone: string,
  nowMs: number
): "three_days" | "today" | null {
  const [yearStr, monthStr] = currentMonthKey.split("-");
  const year = Number(yearStr);
  const month = Number(monthStr);
  const deadlineMs = getDeadlineUTC(year, month, timezone);
  const diffMs = deadlineMs - nowMs;
  if (diffMs < 0) return null;
  const diffDays = diffMs / MS_PER_DAY;
  if (diffDays <= 0.5) return "today"; // within last 12h of deadline
  if (
    diffDays >= DM_REMINDER_LEAD_DAYS - 0.5 &&
    diffDays <= DM_REMINDER_LEAD_DAYS + 0.5
  ) {
    return "three_days";
  }
  return null;
}

function reminderMessage(
  kind: "three_days" | "today",
  displayName: string,
  monthLabel: string
): string {
  if (kind === "three_days") {
    return (
      `Hi ${displayName} — just a heads-up, your ${monthLabel} ambassador self-report ` +
      `is due in 3 days. It takes about 3-5 minutes: https://codewithahsan.dev/ambassadors/report`
    );
  }
  return (
    `Hi ${displayName} — your ${monthLabel} ambassador self-report is due today. ` +
    `https://codewithahsan.dev/ambassadors/report`
  );
}

async function main() {
  console.log(
    `[ambassador-report-flag] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`
  );
  const nowMs = Date.now();
  const ambassadors = await loadActiveAmbassadors();
  console.log(
    `[ambassador-report-flag] loaded ${ambassadors.length} active ambassadors`
  );

  let flagsWritten = 0;
  let remindersSent = 0;
  let errors = 0;

  for (const amb of ambassadors) {
    try {
      // 1. Missing-report flag for PREVIOUS month
      const prevMonthKey = getAmbassadorMonthKey(amb.timezone);
      const hasReport = await hasReportForMonth(amb.uid, prevMonthKey);
      if (!hasReport) {
        // Only flag once the deadline for the previous month has actually passed
        // in the ambassador's timezone. Without this guard, ambassadors in UTC-behind
        // timezones (e.g. America/Los_Angeles) can be falsely flagged on the first day
        // of a new month while they still have time to submit (CR-01).
        const [yearStr, monthStr] = prevMonthKey.split("-");
        const deadlineMs = getDeadlineUTC(Number(yearStr), Number(monthStr), amb.timezone);
        if (nowMs > deadlineMs) {
          await writeFlag(amb.uid, prevMonthKey);
          flagsWritten++;
          console.log(
            `[flag] ${amb.uid} (${amb.displayName}) missing ${prevMonthKey}`
          );
        }
      }

      // 2. DM reminder for CURRENT month (if within reminder window)
      const currMonthKey = getCurrentMonthKey(amb.timezone);
      const hasCurrReport = await hasReportForMonth(amb.uid, currMonthKey);
      if (!hasCurrReport && amb.discordHandle) {
        const reminderKind = shouldRemind(currMonthKey, amb.timezone, nowMs);
        if (reminderKind) {
          const monthLabel = new Intl.DateTimeFormat("en-US", {
            month: "long",
            year: "numeric",
            timeZone: amb.timezone,
          }).format(new Date(nowMs));
          const msg = reminderMessage(
            reminderKind,
            amb.displayName ?? amb.uid,
            monthLabel
          );
          if (DRY_RUN) {
            console.log(`[DRY-RUN] would DM ${amb.discordHandle}: ${msg}`);
          } else {
            const sent = await sendDirectMessage(amb.discordHandle, msg);
            if (sent) {
              remindersSent++;
              console.log(
                `[dm] ${amb.uid} (${amb.discordHandle}) ${reminderKind}`
              );
            } else {
              console.warn(
                `[dm-failed] ${amb.uid} (${amb.discordHandle}) — non-fatal`
              );
            }
          }
        }
      }
    } catch (err) {
      errors++;
      console.error(`[error] ${amb.uid}:`, err);
      // Continue — do NOT fail the whole run on one bad ambassador
    }
  }

  console.log(
    `[ambassador-report-flag] done. flags=${flagsWritten} reminders=${remindersSent} errors=${errors}`
  );
  // Exit 0 even with per-ambassador errors; exit 1 only on fatal initialization failure.
}

main().catch((err) => {
  console.error("[ambassador-report-flag] fatal:", err);
  process.exit(1);
});
