import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getStripeClient } from "@/lib/stripe";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-consulting-booking-status");

function toISOStringSafe(val: unknown): string {
  if (!val) return "";
  if (
    typeof val === "object" &&
    val !== null &&
    "toDate" in val &&
    typeof (val as { toDate: () => Date }).toDate === "function"
  ) {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (val instanceof Date) return val.toISOString();
  return String(val);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId parameter is required" }, { status: 400 });
    }

    // Query booking by stripeSessionId
    const snapshot = await db
      .collection("consulting_bookings")
      .where("stripeSessionId", "==", sessionId)
      .limit(1)
      .get();

    if (snapshot.empty) {
      // Fallback: check Stripe directly to see if booking metadata exists
      try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        const bookingId = session.client_reference_id || session.metadata?.bookingId;

        if (bookingId) {
          const bookingDoc = await db.collection("consulting_bookings").doc(bookingId).get();
          if (bookingDoc.exists) {
            const data = bookingDoc.data();
            return NextResponse.json({
              booking: {
                ...data,
                startTime: toISOStringSafe(data?.startTime),
                endTime: toISOStringSafe(data?.endTime),
              },
            });
          }
        }
      } catch (err) {
        logger.error("Error retrieving Stripe session fallback", { err });
      }

      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    const data = snapshot.docs[0].data();

    return NextResponse.json({
      booking: {
        ...data,
        startTime: toISOStringSafe(data?.startTime),
        endTime: toISOStringSafe(data?.endTime),
      },
    });
  } catch (error) {
    logger.error("Error fetching booking status", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
