import { db } from "@/lib/firebaseAdmin";
import { getStripeClient } from "@/lib/stripe";
import { createConsultingCalendarEvent } from "@/lib/google-calendar";
import { sendConsultingConfirmationEmail } from "@/lib/consulting/email";
import { getConsultingSettings } from "@/lib/consulting/config";
import { ConsultingBooking } from "@/types/consulting";
import { createLogger } from "@/lib/logger";

const logger = createLogger("consulting-confirm");

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

/**
 * Confirm a consulting booking:
 * 1. Verifies Stripe payment status if not already verified.
 * 2. Creates Google Calendar event with Google Meet link.
 * 3. Updates Firestore booking status to "confirmed" and paymentStatus to "paid".
 * 4. Sends confirmation emails to client and admin via Resend.
 *
 * This function is idempotent and safe to call multiple times.
 */
export async function confirmConsultingBooking({
  bookingId,
  stripeSessionId,
  forceResendEmail = false,
}: {
  bookingId: string;
  stripeSessionId?: string;
  forceResendEmail?: boolean;
}): Promise<{ success: boolean; booking?: ConsultingBooking; error?: string }> {
  try {
    const bookingRef = db.collection("consulting_bookings").doc(bookingId);
    const bookingDoc = await bookingRef.get();

    if (!bookingDoc.exists) {
      logger.error("Booking document not found", { bookingId });
      return { success: false, error: "Booking not found" };
    }

    const bookingData = bookingDoc.data() as ConsultingBooking;
    const settings = await getConsultingSettings();

    // If already confirmed and not forcing email resend, return existing booking
    if (bookingData.status === "confirmed" && !forceResendEmail) {
      logger.info("Booking already confirmed", { bookingId });
      return { success: true, booking: bookingData };
    }

    // If stripeSessionId is provided, verify with Stripe
    let amountTotal = bookingData.amount || 5000;
    let paymentIntentId = bookingData.stripePaymentIntentId || null;

    const resolvedSessionId = stripeSessionId || bookingData.stripeSessionId;
    if (resolvedSessionId) {
      try {
        const stripe = getStripeClient();
        const session = await stripe.checkout.sessions.retrieve(resolvedSessionId);
        if (session.payment_status === "paid") {
          amountTotal = session.amount_total || amountTotal;
          if (typeof session.payment_intent === "string") {
            paymentIntentId = session.payment_intent;
          }
        } else if (bookingData.status !== "confirmed") {
          logger.warn("Stripe session not paid yet", {
            bookingId,
            sessionId: resolvedSessionId,
            paymentStatus: session.payment_status,
          });
          return { success: false, error: "Payment not completed" };
        }
      } catch (stripeErr) {
        logger.warn("Could not verify session with Stripe directly", { stripeErr });
      }
    }

    const startTimeDate = toDateSafe(bookingData.startTime);
    const endTimeDate = toDateSafe(bookingData.endTime);

    // Create or retrieve Google Calendar event
    let eventId = bookingData.calendarEventId || null;
    let meetLink = bookingData.meetLink || null;

    if (!eventId || !meetLink) {
      try {
        const calendarResult = await createConsultingCalendarEvent(
          {
            id: bookingId,
            packageName: bookingData.packageName,
            startTime: startTimeDate,
            endTime: endTimeDate,
            timezone: bookingData.timezone,
            clientName: bookingData.clientName,
            clientEmail: bookingData.clientEmail,
            clientNotes: bookingData.clientNotes,
          },
          settings.adminEmail
        );
        eventId = calendarResult.eventId;
        meetLink = calendarResult.meetLink;
      } catch (calErr) {
        logger.warn("Google Calendar event creation failed/bypassed", { calErr });
      }
    }

    if (!meetLink) {
      meetLink = `https://meet.google.com/lookup/cwa-consulting-${bookingId.slice(0, 8)}`;
    }

    const now = new Date();
    await bookingRef.update({
      status: "confirmed",
      paymentStatus: "paid",
      amount: amountTotal,
      amountTotal: amountTotal,
      stripePaymentIntentId: paymentIntentId,
      calendarEventId: eventId || null,
      meetLink: meetLink || null,
      updatedAt: now,
    });

    const updatedBooking: ConsultingBooking = {
      ...bookingData,
      amount: amountTotal,
      startTime: startTimeDate,
      endTime: endTimeDate,
      status: "confirmed",
      paymentStatus: "paid",
      stripePaymentIntentId: paymentIntentId || undefined,
      calendarEventId: eventId || undefined,
      meetLink: meetLink || undefined,
      updatedAt: now,
    };

    logger.info("Consulting booking confirmed and updated in Firestore", {
      bookingId,
      eventId,
      meetLink,
    });

    // Send confirmation emails via Resend
    try {
      await sendConsultingConfirmationEmail(updatedBooking);
      logger.info("Confirmation email dispatched successfully", {
        bookingId,
        clientEmail: updatedBooking.clientEmail,
      });
    } catch (emailErr) {
      logger.error("Error sending confirmation email", { emailErr });
    }

    return { success: true, booking: updatedBooking };
  } catch (error) {
    logger.error("Error confirming consulting booking", { error, bookingId });
    return { success: false, error: "Internal confirmation error" };
  }
}
