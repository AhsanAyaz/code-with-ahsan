import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getStripeClient } from "@/lib/stripe";
import { confirmConsultingBooking } from "@/lib/consulting/confirmBooking";
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

    let bookingId: string | null = null;
    let data: FirebaseFirestore.DocumentData | null = null;

    if (!snapshot.empty) {
      bookingId = snapshot.docs[0].id;
      data = snapshot.docs[0].data();
    } else {
      // Fallback: check Stripe directly
      try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        bookingId = session.client_reference_id || session.metadata?.bookingId || null;

        if (bookingId) {
          const bookingDoc = await db.collection("consulting_bookings").doc(bookingId).get();
          if (bookingDoc.exists) {
            data = bookingDoc.data() || null;
          }
        }
      } catch (err) {
        logger.error("Error retrieving Stripe session fallback", { err });
      }
    }

    if (!bookingId || !data) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    // Self-healing confirmation: If booking is still pending_payment, trigger confirmation check
    if (data.status === "pending_payment") {
      logger.info("Triggering self-healing confirmation for pending booking", {
        bookingId,
        sessionId,
      });
      const confirmResult = await confirmConsultingBooking({
        bookingId,
        stripeSessionId: sessionId,
      });

      if (confirmResult.success && confirmResult.booking) {
        return NextResponse.json({
          booking: {
            ...confirmResult.booking,
            startTime: toISOStringSafe(confirmResult.booking.startTime),
            endTime: toISOStringSafe(confirmResult.booking.endTime),
          },
        });
      }
    }

    return NextResponse.json({
      booking: {
        ...data,
        startTime: toISOStringSafe(data.startTime),
        endTime: toISOStringSafe(data.endTime),
      },
    });
  } catch (error) {
    logger.error("Error fetching booking status", { error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
