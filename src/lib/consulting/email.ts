import { Resend } from "resend";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CONSULTING_CONFIG } from "./constants";
import { ConsultingBooking } from "@/types/consulting";
import { createLogger } from "@/lib/logger";

const log = createLogger("consulting-email");

let resendClient: Resend | null = null;

function getResendClient(): Resend | null {
  if (resendClient) return resendClient;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    resendClient = new Resend(apiKey);
  } else {
    log.warn("RESEND_API_KEY is not configured");
  }
  return resendClient;
}

function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
}

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
 * Send booking confirmation email to client and Ahsan.
 */
export async function sendConsultingConfirmationEmail(
  booking: ConsultingBooking
): Promise<boolean> {
  if (process.env.DISABLE_EMAILS === "true") {
    log.info("Emails disabled via DISABLE_EMAILS. Skipping consulting confirmation email", {
      bookingId: booking.id,
    });
    return true;
  }

  const resend = getResendClient();
  if (!resend) {
    log.warn("Skipping email delivery: Resend not initialized");
    return false;
  }

  try {
    const startTimeDate = toDateSafe(booking.startTime);
    const clientTz = booking.timezone || "UTC";
    const zonedDate = toZonedTime(startTimeDate, clientTz);
    const formattedDateTime = format(zonedDate, "EEEE, MMMM d, yyyy 'at' h:mm a");

    const meetLinkHtml = booking.meetLink
      ? `<div style="background:#ecfdf5;border:1px solid #10b981;border-radius:8px;padding:16px;margin:20px 0;text-align:center;">
          <p style="margin:0 0 10px 0;font-weight:bold;color:#065f46;">Your Google Meet Link is Ready:</p>
          <a href="${booking.meetLink}" style="display:inline-block;background:#10b981;color:#ffffff;padding:10px 24px;border-radius:6px;text-decoration:none;font-weight:bold;">Join Google Meet</a>
          <p style="margin:10px 0 0 0;font-size:12px;color:#047857;">Link: <a href="${booking.meetLink}">${booking.meetLink}</a></p>
        </div>`
      : `<div style="background:#fef3c7;border:1px solid #f59e0b;border-radius:8px;padding:14px;margin:20px 0;">
          <p style="margin:0;color:#92400e;font-size:14px;">A Google Meet video conference link will also be sent directly to your calendar invite.</p>
        </div>`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: white; padding: 28px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
          .body { padding: 28px; }
          .details { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 18px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Consultation Confirmed with Ahsan Ayaz</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${booking.clientName}</strong>,</p>
            <p>Thank you for booking a 1:1 advisory session. Your session has been confirmed and added to the schedule!</p>

            <div class="details">
              <p style="margin:6px 0;"><strong>Session:</strong> ${booking.packageName} (${booking.durationMinutes} mins)</p>
              <p style="margin:6px 0;"><strong>Date & Time:</strong> ${formattedDateTime} (${clientTz})</p>
              <p style="margin:6px 0;"><strong>Amount Paid:</strong> $${(booking.amount / 100).toFixed(2)} ${booking.currency.toUpperCase()}</p>
              ${booking.clientNotes ? `<p style="margin:6px 0;"><strong>Topic / Agenda:</strong> ${booking.clientNotes}</p>` : ""}
            </div>

            ${meetLinkHtml}

            <h3 style="margin-top:24px;font-size:16px;">How to Prepare:</h3>
            <ul style="padding-left:20px;color:#4b5563;font-size:14px;">
              <li>Prepare your main questions or repository links beforehand.</li>
              <li>Join the Google Meet a few minutes early to test your audio & video setup.</li>
              <li>If you need to reschedule, please reply directly to this email at least 24 hours in advance.</li>
            </ul>

            <p style="margin-top:24px;">Looking forward to speaking with you!</p>
            <p>Best regards,<br><strong>Muhammad Ahsan Ayaz</strong><br>Google Developer Expert (GDE) & Architect</p>
          </div>
          <div class="footer">
            <p><a href="${getSiteUrl()}" style="color:#2563eb;text-decoration:none;">CodeWithAhsan.dev</a> • Professional Advisory & Mentorship</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Code With Ahsan <notifications@codewithahsan.dev>";

    // Send to client
    const clientEmailRes = await resend.emails.send({
      from: fromAddress,
      to: [booking.clientEmail],
      replyTo: CONSULTING_CONFIG.adminEmail,
      subject: `Confirmed: 1:1 Consultation with Ahsan Ayaz (${booking.packageName})`,
      html: htmlContent,
    });

    if (clientEmailRes.error) {
      log.warn("Error returned by Resend for client email", {
        error: clientEmailRes.error,
        bookingId: booking.id,
      });
    }

    // Send notification to Ahsan
    const adminEmailRes = await resend.emails.send({
      from: fromAddress,
      to: [CONSULTING_CONFIG.adminEmail],
      subject: `New Paid Booking: ${booking.clientName} - ${booking.packageName}`,
      html: `
        <h2>New Paid Consultation Booked!</h2>
        <p><strong>Client:</strong> ${booking.clientName} (${booking.clientEmail})</p>
        <p><strong>Package:</strong> ${booking.packageName} ($${(booking.amount / 100).toFixed(2)})</p>
        <p><strong>Time:</strong> ${formattedDateTime} (${clientTz})</p>
        ${booking.clientNotes ? `<p><strong>Notes:</strong> ${booking.clientNotes}</p>` : ""}
        ${booking.githubOrLinkedinUrl ? `<p><strong>Profile/Link:</strong> <a href="${booking.githubOrLinkedinUrl}">${booking.githubOrLinkedinUrl}</a></p>` : ""}
        ${booking.meetLink ? `<p><strong>Meet Link:</strong> <a href="${booking.meetLink}">${booking.meetLink}</a></p>` : ""}
      `,
    });

    if (adminEmailRes.error) {
      log.warn("Error returned by Resend for admin notification email", {
        error: adminEmailRes.error,
        bookingId: booking.id,
      });
    }

    log.info("Finished dispatching consultation emails", { bookingId: booking.id });
    return true;
  } catch (error) {
    log.error("Exception sending consultation emails", { bookingId: booking.id, error });
    return false;
  }
}
