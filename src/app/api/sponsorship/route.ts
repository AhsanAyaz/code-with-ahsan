import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/email";

const BOOKING_URL = "https://calendar.app.google/Z6g5dMyczq25hmjYA";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, company, budget, message } = body as Record<string, unknown>;

    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof company !== "string" ||
      !name.trim() ||
      !email.trim() ||
      !company.trim()
    ) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    const safe = {
      name: escapeHtml(name.trim()),
      email: escapeHtml(email.trim()),
      company: escapeHtml(company.trim()),
      budget: escapeHtml(typeof budget === "string" ? budget : "Not specified"),
      message: escapeHtml(typeof message === "string" ? message.trim() : ""),
    };

    const adminSubject = `Sponsorship inquiry: ${company.trim()} — ${
      typeof budget === "string" ? budget : "no budget given"
    }`;
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafbfc;">
        <h2 style="color: #8f27e0; border-bottom: 2px solid #8f27e0; padding-bottom: 8px; margin-top: 0;">New Sponsorship Inquiry</h2>
        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="margin: 4px 0;"><strong>Name:</strong> ${safe.name}</p>
          <p style="margin: 4px 0;"><strong>Email:</strong> <a href="mailto:${safe.email}">${safe.email}</a></p>
          <p style="margin: 4px 0;"><strong>Company:</strong> ${safe.company}</p>
          <p style="margin: 4px 0;"><strong>Budget range:</strong> ${safe.budget}</p>
        </div>
        ${
          safe.message
            ? `<div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <p style="margin: 0; white-space: pre-wrap; color: #555;">${safe.message}</p>
        </div>`
            : ""
        }
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          Sent from codewithahsan.dev/sponsors
        </p>
      </div>
    `;

    const clientSubject = "Code with Ahsan — We received your inquiry!";
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafbfc;">
        <h2 style="color: #8f27e0; margin-top: 0;">Thanks for reaching out!</h2>
        <p>Hi ${safe.name},</p>
        <p>Thank you for your interest in partnering with <strong>Code with Ahsan</strong> on behalf of <strong>${safe.company}</strong>.</p>
        <p>We review every inquiry personally and will get back to you at <strong>${safe.email}</strong> within 24 hours.</p>
        <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; font-size: 13px;">
          Want to move faster? Book a 15-minute intro call directly:
          <a href="${BOOKING_URL}">Book a Call</a>.
        </div>
        <p>Best regards,<br/><strong>Code with Ahsan Team</strong></p>
      </div>
    `;

    const adminEmail = process.env.ADMIN_EMAIL || "ahsan.ubitian@gmail.com";

    const adminSendSuccess = await sendEmail(adminEmail, adminSubject, adminEmailHtml);

    let clientSendSuccess = false;
    if (adminSendSuccess) {
      clientSendSuccess = await sendEmail(email.trim(), clientSubject, clientEmailHtml);
    }

    if (!adminSendSuccess) {
      return NextResponse.json(
        {
          success: false,
          error:
            "We could not submit your inquiry automatically. Please email us directly instead.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, adminSent: true, clientSent: clientSendSuccess },
      { status: 200 }
    );
  } catch (error) {
    console.error("Sponsorship API Error:", error);
    const message = error instanceof Error ? error.message : "Internal Server Error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
