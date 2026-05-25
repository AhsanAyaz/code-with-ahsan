#!/usr/bin/env npx tsx
/**
 * Phase 5 (DASH-07): Daily leaderboard snapshot writer.
 *
 * Triggered by .github/workflows/ambassador-activity-checks.yml
 * (cron '0 7 * * *' daily or workflow_dispatch).
 *
 * Cadence history: originally specified as hourly ('0 * * * *') in Plan 02; restored
 * at DAILY cadence (07:00 UTC, before the 08:00 report-flag job) per architectural
 * decision 2026-05-22 (quick 260522-b08 — "small ambassador cohort; daily cadence
 * is sufficient. Hourly was over-engineered for current scale.").
 *
 * Reads:  cohorts (current), public_ambassadors (active==true), referrals,
 *         ambassador_events (hidden==false), monthly_reports
 * Writes: leaderboard_snapshots/{cohortId} (single doc, set/merge=false)
 *
 * Idempotent: re-running produces the same content (other than updatedAt).
 * Dry-run flag (--dry-run) skips the Firestore write but still computes + logs.
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { LEADERBOARD_SNAPSHOTS_COLLECTION } from "../src/lib/ambassador/constants";
import { buildLeaderboardSnapshot } from "../src/lib/ambassador/leaderboard";
import { getCurrentCohortId } from "../src/lib/ambassador/currentCohort";

const DRY_RUN = process.argv.includes("--dry-run");

async function main() {
  console.log(
    `[ambassador-leaderboard-snapshot] starting at ${new Date().toISOString()} (dry-run=${DRY_RUN})`,
  );

  const cohortId = await getCurrentCohortId();
  if (!cohortId) {
    console.log(
      "[ambassador-leaderboard-snapshot] no current cohort — nothing to snapshot. Exiting cleanly.",
    );
    return;
  }
  console.log(`[ambassador-leaderboard-snapshot] cohortId=${cohortId}`);

  const snapshot = await buildLeaderboardSnapshot(cohortId);

  console.log(
    `[ambassador-leaderboard-snapshot] built — ` +
      `cumulative ranks: ${Object.keys(snapshot.cumulative.ambassadorRanks).length} ambassadors, ` +
      `top3 referrals: ${snapshot.cumulative.referrals.length}, ` +
      `top3 events: ${snapshot.cumulative.events.length}, ` +
      `top3 reportsOnTime: ${snapshot.cumulative.reportsOnTime.length}, ` +
      `month=${snapshot.thisMonth.month}, graceEnd=${snapshot.graceEndDate}`,
  );

  if (DRY_RUN) {
    console.log("[ambassador-leaderboard-snapshot] DRY-RUN — no Firestore write.");
    return;
  }

  // Replace serializable updatedAt with FieldValue.serverTimestamp on write.
  // (The buildLeaderboardSnapshot return ships a string; we overwrite for storage.)
  const docRef = db.collection(LEADERBOARD_SNAPSHOTS_COLLECTION).doc(cohortId);
  await docRef.set(
    {
      ...snapshot,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: false },
  );

  console.log(
    `[ambassador-leaderboard-snapshot] wrote ${LEADERBOARD_SNAPSHOTS_COLLECTION}/${cohortId} successfully.`,
  );
}

main().catch((e) => {
  console.error("[ambassador-leaderboard-snapshot] FATAL", e);
  process.exit(1);
});
