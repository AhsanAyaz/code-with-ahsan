/**
 * Duplicate an existing booking as pending_approval for testing.
 *
 * Usage:
 *   npx tsx scripts/duplicate-booking.ts <sourceBookingId>
 *
 * Example:
 *   npx tsx scripts/duplicate-booking.ts 0fG5e0n176dxTuqZ8SXP
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

async function main() {
  const sourceId = process.argv[2] || "0fG5e0n176dxTuqZ8SXP";

  console.log(`Reading booking: ${sourceId}`);
  const sourceDoc = await db.collection("mentorship_bookings").doc(sourceId).get();

  if (!sourceDoc.exists) {
    console.error(`Booking ${sourceId} not found`);
    process.exit(1);
  }

  const data = sourceDoc.data()!;
  console.log(`Found booking: ${data.menteeProfile?.displayName} → ${data.mentorProfile?.displayName}`);
  console.log(`  Status: ${data.status}`);
  console.log(`  Start: ${data.startTime?.toDate?.()}`);
  console.log(`  End: ${data.endTime?.toDate?.()}`);

  // Create a duplicate with pending_approval status
  const newRef = db.collection("mentorship_bookings").doc();
  await newRef.set({
    mentorId: data.mentorId,
    menteeId: data.menteeId,
    mentorProfile: data.mentorProfile,
    menteeProfile: data.menteeProfile,
    startTime: data.startTime,
    endTime: data.endTime,
    timezone: data.timezone,
    status: "pending_approval",
    calendarEventId: null,
    calendarSyncStatus: "not_connected",
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  console.log(`\nCreated duplicate booking: ${newRef.id}`);
  console.log(`  Status: pending_approval`);
  console.log(`  Same time slot as ${sourceId}`);
  console.log(`\nTest: approve the original, then try approving this duplicate — it should 409.`);
}

main().catch(console.error);
