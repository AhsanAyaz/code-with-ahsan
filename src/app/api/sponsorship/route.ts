import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      brandName,
      contactName,
      contactEmail,
      targetMonth,
      productBrief,
      selectedDeliverables,
      licensing,
      rawFootage,
      exclusivity,
      basePrice,
      addOnsPrice,
      subtotal,
      discountAmount,
      totalPrice,
      preset
    } = body;

    if (!brandName || !contactName || !contactEmail) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Format deliverables HTML list
    const deliverablesListHtml = (selectedDeliverables || [])
      .map((d: any) => `<li><strong>${d.quantity}x</strong> ${d.name} ($${d.price.toLocaleString()} each)</li>`)
      .join('');

    // Format the email content for Ahsan (Admin)
    const adminSubject = `🚀 Collaboration Proposal: ${brandName} — $${totalPrice.toLocaleString()}`;
    const adminEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafbfc;">
        <h2 style="color: #9B00D9; border-bottom: 2px solid #9B00D9; padding-bottom: 8px; margin-top: 0;">🆕 New Collaboration Proposal</h2>
        
        <p>Hi Ahsan,</p>
        <p>A new sponsor has built a campaign proposal using the interactive rates card on your website!</p>
        
        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">🏢 Brand & Contact Info</h3>
          <p style="margin: 4px 0;"><strong>Brand Name:</strong> ${brandName}</p>
          <p style="margin: 4px 0;"><strong>Contact Person:</strong> ${contactName}</p>
          <p style="margin: 4px 0;"><strong>Work Email:</strong> <a href="mailto:${contactEmail}">${contactEmail}</a></p>
          <p style="margin: 4px 0;"><strong>Target Month / Window:</strong> ${targetMonth || 'As soon as possible'}</p>
        </div>

        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">📦 Selected Placements</h3>
          ${preset !== 'custom' ? `<p style="font-size: 13px; color: #9B00D9; font-weight: bold; margin-top: 0;">Preset Bundle: ${preset.toUpperCase()}</p>` : ''}
          <ul style="margin: 0; padding-left: 20px;">
            ${deliverablesListHtml}
          </ul>
        </div>

        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">⚙️ Licensing & Enhancements</h3>
          <ul style="margin: 0; padding-left: 20px;">
            <li><strong>Licensing:</strong> ${licensing}</li>
            <li><strong>Raw Video Footage:</strong> ${rawFootage ? 'Yes (+40%)' : 'No'}</li>
            <li><strong>Category Exclusivity:</strong> ${exclusivity ? 'Yes (+25%)' : 'No'}</li>
          </ul>
        </div>

        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">💰 Financial Breakdown</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 4px 0; color: #666;">Base Price:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">$${basePrice.toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 4px 0; color: #666;">Licensing & Add-ons:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">+$${addOnsPrice.toLocaleString()}</td>
            </tr>
            <tr style="border-bottom: 1px solid #eee;">
              <td style="padding: 4px 0; color: #666;">Subtotal:</td>
              <td style="padding: 4px 0; text-align: right; font-weight: bold;">$${subtotal.toLocaleString()}</td>
            </tr>
            ${discountAmount > 0 ? `
            <tr style="color: #10b981;">
              <td style="padding: 6px 0; font-weight: bold;">Discounts / Savings:</td>
              <td style="padding: 6px 0; text-align: right; font-weight: bold;">-$${discountAmount.toLocaleString()}</td>
            </tr>
            ` : ''}
            <tr style="font-size: 16px; border-top: 2px solid #e5e7eb;">
              <td style="padding: 10px 0; font-weight: bold; color: #9B00D9;">Proposed Budget:</td>
              <td style="padding: 10px 0; text-align: right; font-weight: bold; color: #9B00D9; font-size: 18px;">$${totalPrice.toLocaleString()}</td>
            </tr>
          </table>
        </div>

        ${productBrief ? `
        <div style="background-color: #fff; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #111; font-size: 15px; border-bottom: 1px solid #eee; padding-bottom: 5px;">📝 Product Brief / Goals</h3>
          <p style="margin: 0; white-space: pre-wrap; font-style: italic; color: #555;">"${productBrief}"</p>
        </div>
        ` : ''}

        <p style="margin-top: 30px;">To reply directly to the client, click reply in your email client or write to <a href="mailto:${contactEmail}">${contactEmail}</a>.</p>
        
        <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px; border-top: 1px solid #eee; padding-top: 20px;">
          Generated automatically by codewithahsan.dev/rates sponsorship planner.
        </p>
      </div>
    `;

    // Format the email content for the Client (Confirmation receipt)
    const clientSubject = `Code with Ahsan — We received your collaboration proposal!`;
    const clientEmailHtml = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e5e7eb; border-radius: 12px; background-color: #fafbfc;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 22px;">🚀 Collaboration Proposal Received</h1>
          <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.9;">Code with Ahsan Brand Partnership</p>
        </div>

        <div style="padding: 25px; background: white; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
          <p>Hi ${contactName},</p>
          <p>Thank you for reaching out and submitting your custom collaboration proposal for <strong>${brandName}</strong>!</p>
          <p>Ahsan has received your proposal summary, and we are already reviewing it against our current editorial schedule. We will reach back to you at <strong>${contactEmail}</strong> within the next 24 hours to align on dates and next steps.</p>
          
          <h3 style="border-bottom: 1px solid #eee; padding-bottom: 8px; color: #111; font-size: 16px;">📊 Campaign Summary Selected</h3>
          <ul style="padding-left: 20px; font-size: 14px;">
            ${deliverablesListHtml}
          </ul>

          <table style="width: 100%; font-size: 14px; border-top: 1px solid #eee; padding-top: 10px; margin-top: 15px;">
            <tr>
              <td style="color: #666; padding: 3px 0;">Campaign Licensing:</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">${licensing}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 3px 0;">Raw Video Assets:</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">${rawFootage ? 'Yes' : 'No'}</td>
            </tr>
            <tr>
              <td style="color: #666; padding: 3px 0;">Category Exclusivity:</td>
              <td style="text-align: right; font-weight: bold; padding: 3px 0;">${exclusivity ? 'Yes' : 'No'}</td>
            </tr>
            <tr style="font-size: 16px; font-weight: bold; color: #764ba2; border-top: 1px solid #eee;">
              <td style="padding-top: 10px;">Proposed Campaign Budget:</td>
              <td style="padding-top: 10px; text-align: right;">$${totalPrice.toLocaleString()}</td>
            </tr>
          </table>

          <div style="background-color: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 20px 0; font-size: 13px;">
            <strong>What's Next?</strong><br/>
            Ahsan will review your product, ensure there are no active competitor conflicts, and follow up with a formal confirmation. If you'd like to book a direct 15-minute sync in the meantime, feel free to use his calendar: <a href="https://calendar.app.google/Z6g5dMyczq25hmjYA">Book a Call</a>.
          </div>

          <p>Looking forward to collaborating with you!</p>
          
          <p>Best regards,<br/><strong>Code with Ahsan Team</strong></p>
        </div>
      </div>
    `;

    const adminEmail = process.env.ADMIN_EMAIL || "ahsan.ubitian@gmail.com";

    // 1. Send proposal notification to Ahsan
    const adminSendSuccess = await sendEmail(adminEmail, adminSubject, adminEmailHtml);
    
    // 2. Send confirmation receipt to the client (graceful, non-blocking)
    let clientSendSuccess = false;
    if (adminSendSuccess) {
      clientSendSuccess = await sendEmail(contactEmail, clientSubject, clientEmailHtml);
    }

    if (!adminSendSuccess) {
      return NextResponse.json({ 
        success: false, 
        error: "We encountered a temporary network issue submitting your proposal automatically. No worries! Click the button below to send your structured campaign proposal via your local email client."
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      adminSent: true,
      clientSent: clientSendSuccess 
    }, { status: 200 });

  } catch (error: any) {
    console.error('Sponsorship API Error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
