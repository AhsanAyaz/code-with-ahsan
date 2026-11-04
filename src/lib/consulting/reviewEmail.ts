import { Resend } from "resend";
import { format } from "date-fns";
import { toZonedTime } from "date-fns-tz";
import { CONSULTING_CONFIG } from "./constants";
import { ConsultingBooking } from "@/types/consulting";
import { createLogger } from "@/lib/logger";

const log = createLogger("consulting-review-email");

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
  return process.env.NEXT_PUBLIC_SITE_URL || "https://www.codewithahsan.dev";
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
 * Send a review/testimonial request email to a client after their 1:1 session.
 */
export async function sendConsultingReviewRequestEmail(
  booking: ConsultingBooking
): Promise<boolean> {
  if (process.env.DISABLE_EMAILS === "true") {
    log.info("Emails disabled via DISABLE_EMAILS. Skipping review email", {
      bookingId: booking.id,
    });
    return true;
  }

  const resend = getResendClient();
  if (!resend) {
    log.warn("Skipping review email delivery: Resend not initialized");
    return false;
  }

  try {
    const startTimeDate = toDateSafe(booking.startTime);
    const clientTz = booking.timezone || "UTC";
    const zonedDate = toZonedTime(startTimeDate, clientTz);
    const formattedDate = format(zonedDate, "EEEE, MMMM d, yyyy");

    const reviewUrl = `${getSiteUrl()}/consulting/review?bookingId=${booking.id}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 28px; text-align: center; }
          .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
          .body { padding: 28px; }
          .session-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 20px 0; }
          .stars { color: #f59e0b; font-size: 24px; text-align: center; margin: 16px 0; }
          .btn-primary { display: inline-block; background: #2563eb; color: #ffffff !important; padding: 14px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 16px; box-shadow: 0 4px 6px -1px rgba(37, 99, 235, 0.2); }
          .footer { text-align: center; padding: 20px; font-size: 13px; color: #6b7280; border-top: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>How was your session with Ahsan? ⭐</h1>
          </div>
          <div class="body">
            <p>Hi <strong>${booking.clientName}</strong>,</p>
            <p>Thank you for booking our 1:1 advisory session on <strong>${formattedDate}</strong>!</p>
            
            <p>I hope our discussion provided actionable clarity, unblocked your technical challenges, and set you up for great progress on your goals.</p>

            <div class="session-card">
              <p style="margin: 0; font-weight: 600; color: #334155;">Session Topic:</p>
              <p style="margin: 4px 0 0 0; color: #64748b; font-size: 14px;">${booking.packageName} (${booking.durationMinutes} mins)</p>
            </div>

            <p>If you found value in our time together, could you take <strong>60 seconds</strong> to share a quick review or testimonial? Your feedback helps fellow developers and engineers find the right guidance.</p>

            <div class="stars">★★★★★</div>

            <div style="text-align: center; margin: 28px 0;">
              <a href="${reviewUrl}" class="btn-primary">Leave a Quick Review →</a>
            </div>

            <p style="font-size: 13px; color: #64748b; text-align: center;">
              Direct link: <a href="${reviewUrl}" style="color: #2563eb;">${reviewUrl}</a>
            </p>

            <p style="margin-top: 32px;">Thank you for your trust and time!</p>
            <p style="margin-bottom: 4px;">Best regards,</p>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 4px 0; color: #374151; font-size: 14px; line-height: 1.6;">
              <li><strong>Muhammad Ahsan Ayaz</strong></li>
              <li>Google Developers Expert (GDE) in AI & Angular</li>
              <li>Software Architect</li>
              <li><a href="mailto:ahsan.ubitian@gmail.com" style="color: #2563eb; text-decoration: none;">ahsan.ubitian@gmail.com</a></li>
            </ul>
          </div>
          <div class="footer">
            <p><a href="${getSiteUrl()}" style="color:#2563eb;text-decoration:none;">CodeWithAhsan.dev</a> • 1:1 Technical Advisory</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Code With Ahsan <notifications@codewithahsan.dev>";

    const result = await resend.emails.send({
      from: fromAddress,
      to: [booking.clientEmail],
      bcc: [CONSULTING_CONFIG.adminEmail],
      replyTo: CONSULTING_CONFIG.adminEmail,
      subject: `How was your 1:1 session with Ahsan? (${booking.packageName})`,
      html: htmlContent,
    });

    log.info("Review request email sent successfully", {
      bookingId: booking.id,
      clientEmail: booking.clientEmail,
      messageId: result.data?.id,
    });

    return true;
  } catch (err) {
    log.error("Failed to send review request email", { error: err, bookingId: booking.id });
    return false;
  }
}

/**
 * Notify Ahsan when a new consulting review/testimonial is submitted.
 */
export async function sendAdminNewReviewNotificationEmail(review: {
  clientName: string;
  clientEmail: string;
  rating: number;
  headline: string;
  feedback: string;
  packageName: string;
  role?: string;
  company?: string;
}): Promise<boolean> {
  const resend = getResendClient();
  if (!resend) return false;

  try {
    const adminUrl = `${getSiteUrl()}/admin/consulting`;
    const stars = "★".repeat(review.rating) + "☆".repeat(5 - review.rating);

    const htmlContent = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #1d4ed8;">New 1:1 Consulting Testimonial Received! 🎉</h2>
        <p><strong>${review.clientName}</strong> (${review.clientEmail}) just submitted a review for <strong>${review.packageName}</strong>.</p>
        
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; margin: 16px 0;">
          <p style="color: #f59e0b; font-size: 20px; margin: 0 0 8px 0;">${stars} (${review.rating}/5)</p>
          <p style="font-weight: bold; font-size: 16px; margin: 0 0 8px 0;">&ldquo;${review.headline}&rdquo;</p>
          <p style="color: #334155; margin: 0; line-height: 1.5;">${review.feedback}</p>
          ${review.role ? `<p style="font-size: 12px; color: #64748b; margin-top: 12px;">Author: ${review.role} ${review.company ? `@ ${review.company}` : ""}</p>` : ""}
        </div>

        <p><a href="${adminUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: bold;">Moderate in Admin Dashboard →</a></p>
      </div>
    `;

    const fromAddress =
      process.env.RESEND_FROM_EMAIL ||
      process.env.EMAIL_FROM ||
      "Code With Ahsan <notifications@codewithahsan.dev>";

    await resend.emails.send({
      from: fromAddress,
      to: [CONSULTING_CONFIG.adminEmail],
      subject: `New Review (${review.rating}/5 ⭐) from ${review.clientName} - 1:1 Advisory`,
      html: htmlContent,
    });

    log.info("Admin notification for new review sent successfully", {
      clientName: review.clientName,
      rating: review.rating,
    });
    return true;
  } catch (err) {
    log.error("Failed to send admin review notification", { error: err });
    return false;
  }
}
