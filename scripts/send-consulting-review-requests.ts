#!/usr/bin/env npx tsx
/**
 * Send Consulting Testimonial / Review Request Emails
 *
 * This script runs daily via GitHub Actions to find completed 1:1 consulting sessions
 * that have not yet received a review invitation email.
 *
 * Usage:
 *   npx tsx scripts/send-consulting-review-requests.ts
 */

import { config } from "dotenv";
config({ path: ".env.local" });

import { db } from "../src/lib/firebaseAdmin";
import { sendConsultingReviewRequestEmail } from "../src/lib/consulting/reviewEmail";
import { ConsultingBooking } from "../src/types/consulting";

function toDateSafe(val: unknown): Date {
  if (val instanceof Date) return val;
  if (
    typeof val === "object" &&
    val !== null &&
    "toDate" in val &&
    typeof (val as { toDate: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate();
  }
  if (typeof val === "string" || typeof val === "number") {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return new Date();
}

async function runReviewRequests() {
  console.log("🔍 Scanning for completed consulting sessions awaiting review emails...");
  const now = new Date();

  // Query confirmed bookings
  const bookingsSnap = await db
    .collection("consulting_bookings")
    .where("status", "==", "confirmed")
    .get();

  console.log(`📊 Found ${bookingsSnap.size} total confirmed booking(s).`);

  let sentCount = 0;
  let skippedCount = 0;

  for (const doc of bookingsSnap.docs) {
    const data = doc.data() as ConsultingBooking;
    const bookingId = doc.id;
    const endTime = toDateSafe(data.endTime);

    // Check if session has concluded
    if (endTime > now) {
      console.log(
        `⏳ Session for ${data.clientName} (${bookingId}) is in the future (${endTime.toISOString()}). Skipping.`
      );
      skippedCount++;
      continue;
    }

    // Check if review email has already been sent
    if (data.reviewEmailSentAt) {
      console.log(
        `✅ Review email already sent to ${data.clientName} (${bookingId}) on ${new Date(toDateSafe(data.reviewEmailSentAt)).toISOString()}. Skipping.`
      );
      skippedCount++;
      continue;
    }

    // Check if client already submitted a review
    if (data.reviewId) {
      console.log(
        `⭐ Client ${data.clientName} (${bookingId}) has already submitted review ${data.reviewId}. Skipping email.`
      );
      skippedCount++;
      continue;
    }

    console.log(
      `📧 Sending review request email to ${data.clientName} (${data.clientEmail}) for session ${data.packageName}...`
    );

    const booking: ConsultingBooking = {
      ...data,
      id: bookingId,
    };

    const success = await sendConsultingReviewRequestEmail(booking);

    if (success) {
      const sentTime = new Date();
      await doc.ref.update({
        reviewEmailSentAt: sentTime,
        updatedAt: sentTime,
      });
      console.log(
        `🎉 Successfully sent and recorded review email for ${data.clientName} (${bookingId})!`
      );
      sentCount++;
    } else {
      console.error(`❌ Failed to send review email to ${data.clientName} (${bookingId}).`);
    }
  }

  console.log("\n=================================");
  console.log(
    `🏁 Done! Sent: ${sentCount} | Skipped: ${skippedCount} | Total checked: ${bookingsSnap.size}`
  );
  console.log("=================================\n");
}

runReviewRequests()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal error running review requests:", err);
    process.exit(1);
  });
