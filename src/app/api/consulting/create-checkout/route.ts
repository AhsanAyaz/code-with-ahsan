import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { getStripeClient } from "@/lib/stripe";
import { getConsultingSettings } from "@/lib/consulting/config";
import { CreateCheckoutSchema } from "@/types/consulting";
import { addMinutes, parseISO } from "date-fns";
import { createLogger } from "@/lib/logger";

const logger = createLogger("api-consulting-checkout");

function getBaseUrl(request: NextRequest): string {
  const origin = request.headers.get("origin");
  if (origin) return origin;

  const host = request.headers.get("host");
  if (host) {
    const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
    return `${protocol}://${host}`;
  }

  return process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";
}

export async function POST(request: NextRequest) {
  try {
    const json = await request.json();
    const parseResult = CreateCheckoutSchema.safeParse(json);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const {
      packageId,
      startTime,
      endTime,
      timezone,
      clientName,
      clientEmail,
      clientNotes,
      githubOrLinkedinUrl,
    } = parseResult.data;

    const settings = await getConsultingSettings();
    const pkg = settings.packages.find((p) => p.id === packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Invalid package selected" }, { status: 400 });
    }

    const startDate = parseISO(startTime);
    const endDate = parseISO(endTime);
    const now = new Date();

    // Check for conflicting confirmed or active pending bookings (with resilient fallback)
    let conflictDocs: FirebaseFirestore.DocumentSnapshot[] = [];
    try {
      const indexedQuery = await db
        .collection("consulting_bookings")
        .where("startTime", "<", endDate)
        .where("endTime", ">", startDate)
        .get();
      conflictDocs = indexedQuery.docs;
    } catch {
      // Fallback if composite index is building or not yet deployed
      const allBookingsSnap = await db.collection("consulting_bookings").get();
      conflictDocs = allBookingsSnap.docs.filter((doc) => {
        const data = doc.data();
        if (!data.startTime || !data.endTime) return false;
        const bStart = data.startTime?.toDate ? data.startTime.toDate() : new Date(data.startTime);
        const bEnd = data.endTime?.toDate ? data.endTime.toDate() : new Date(data.endTime);
        return bStart < endDate && bEnd > startDate;
      });
    }

    for (const doc of conflictDocs) {
      const data = doc.data();
      if (!data) continue;
      if (data.status === "confirmed") {
        return NextResponse.json(
          { error: "This time slot is no longer available. Please select another time." },
          { status: 409 }
        );
      }
      if (data.status === "pending_payment") {
        const expiresAt = data.expiresAt?.toDate
          ? data.expiresAt.toDate()
          : new Date(data.expiresAt);
        if (expiresAt > now) {
          return NextResponse.json(
            {
              error:
                "This time slot is currently on hold. Please select another time or try again in 15 minutes.",
            },
            { status: 409 }
          );
        }
      }
    }

    // Create pending booking in Firestore with configured lock
    const bookingRef = db.collection("consulting_bookings").doc();
    const expiresAt = addMinutes(now, settings.slotLockExpirationMinutes);

    const bookingData = {
      id: bookingRef.id,
      packageId: pkg.id,
      packageName: pkg.name,
      durationMinutes: pkg.durationMinutes,
      clientName,
      clientEmail,
      clientNotes: clientNotes || "",
      githubOrLinkedinUrl: githubOrLinkedinUrl || "",
      startTime: startDate,
      endTime: endDate,
      timezone,
      amount: pkg.priceInCents,
      currency: pkg.currency,
      paymentStatus: "pending",
      status: "pending_payment",
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await bookingRef.set(bookingData);

    // Initialize Stripe Checkout Session with dynamic origin URL
    const stripe = getStripeClient();
    const baseUrl = getBaseUrl(request);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: pkg.currency,
            product_data: {
              name: `Consultation: ${pkg.name}`,
              description: `${pkg.durationMinutes}-min 1:1 consultation with Muhammad Ahsan Ayaz (${timezone})`,
            },
            unit_amount: pkg.priceInCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      customer_email: clientEmail,
      client_reference_id: bookingRef.id,
      metadata: {
        bookingId: bookingRef.id,
        packageId: pkg.id,
        clientName,
        clientEmail,
        startTime,
        endTime,
      },
      success_url: `${baseUrl}/consulting/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/consulting/cancel?booking_id=${bookingRef.id}`,
    });

    // Save Stripe session ID back to booking
    await bookingRef.update({
      stripeSessionId: session.id,
    });

    logger.info("Created consulting checkout session", {
      bookingId: bookingRef.id,
      sessionId: session.id,
      redirectBaseUrl: baseUrl,
    });

    return NextResponse.json({
      url: session.url,
      bookingId: bookingRef.id,
    });
  } catch (error) {
    logger.error("Error creating consulting checkout session", { error });
    return NextResponse.json(
      { error: "Failed to initiate checkout. Please try again later." },
      { status: 500 }
    );
  }
}
