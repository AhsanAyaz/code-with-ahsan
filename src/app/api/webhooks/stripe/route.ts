import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getStripeClient } from "@/lib/stripe";
import { createConsultingCalendarEvent, deleteCalendarEvent } from "@/lib/google-calendar";
import { sendConsultingConfirmationEmail } from "@/lib/consulting/email";
import { CONSULTING_CONFIG } from "@/lib/consulting/constants";
import { ConsultingBooking } from "@/types/consulting";
import { createLogger } from "@/lib/logger";
import Stripe from "stripe";

const logger = createLogger("stripe-webhook");

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
    return new Date(val);
  }
  return new Date();
}

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    logger.error("STRIPE_WEBHOOK_SECRET is not configured");
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let event: Stripe.Event;

  try {
    const rawBody = await request.text();
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : "Unknown webhook error";
    logger.error("Webhook signature verification failed", { error: errorMessage });
    return NextResponse.json({ error: `Webhook Error: ${errorMessage}` }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const bookingId = session.client_reference_id || session.metadata?.bookingId;

        if (!bookingId) {
          logger.warn("Checkout session missing bookingId", { sessionId: session.id });
          break;
        }

        const bookingRef = db.collection("consulting_bookings").doc(bookingId);
        const bookingDoc = await bookingRef.get();

        if (!bookingDoc.exists) {
          logger.error("Booking doc not found for checkout session", {
            bookingId,
            sessionId: session.id,
          });
          break;
        }

        const bookingData = bookingDoc.data() as ConsultingBooking;

        if (bookingData.status === "confirmed") {
          logger.info("Booking already confirmed (idempotent)", { bookingId });
          break;
        }

        const startTimeDate = toDateSafe(bookingData.startTime);
        const endTimeDate = toDateSafe(bookingData.endTime);

        // Create Google Calendar event with Google Meet link
        const { eventId, meetLink } = await createConsultingCalendarEvent(
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
          CONSULTING_CONFIG.adminEmail
        );

        // Update Firestore booking record
        const now = new Date();
        const updatedBooking: ConsultingBooking = {
          ...bookingData,
          status: "confirmed",
          paymentStatus: "paid",
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          calendarEventId: eventId,
          meetLink: meetLink || undefined,
          updatedAt: now,
        };

        await bookingRef.update({
          status: "confirmed",
          paymentStatus: "paid",
          stripePaymentIntentId:
            typeof session.payment_intent === "string" ? session.payment_intent : null,
          calendarEventId: eventId,
          meetLink: meetLink || null,
          updatedAt: now,
        });

        logger.info("Consulting booking confirmed and updated", {
          bookingId,
          eventId,
          meetLink,
        });

        // Send confirmation emails
        await sendConsultingConfirmationEmail(updatedBooking);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId = charge.payment_intent;

        if (paymentIntentId) {
          const snapshot = await db
            .collection("consulting_bookings")
            .where("stripePaymentIntentId", "==", paymentIntentId)
            .limit(1)
            .get();

          if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const data = doc.data() as ConsultingBooking;

            // Delete calendar event if exists
            if (data.calendarEventId) {
              try {
                // Find admin profile
                const adminSnap = await db
                  .collection("mentorship_profiles")
                  .where("email", "==", CONSULTING_CONFIG.adminEmail)
                  .limit(1)
                  .get();

                if (!adminSnap.empty) {
                  const mentorId = adminSnap.docs[0].data().uid || adminSnap.docs[0].id;
                  await deleteCalendarEvent(mentorId, data.calendarEventId);
                }
              } catch (delErr) {
                logger.error("Failed to delete calendar event for refunded booking", { delErr });
              }
            }

            await doc.ref.update({
              paymentStatus: "refunded",
              status: "cancelled",
              updatedAt: new Date(),
            });

            logger.info("Updated booking to refunded/cancelled", { bookingId: doc.id });
          }
        }
        break;
      }

      default:
        logger.info("Unhandled Stripe event type", { type: event.type });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    logger.error("Error processing Stripe webhook event", { error, eventType: event.type });
    return NextResponse.json({ error: "Webhook processing error" }, { status: 500 });
  }
}
