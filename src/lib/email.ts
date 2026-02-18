import Mailgun from "mailgun.js";
import formData from "form-data";
import { createLogger } from "./logger";

// Create Email-specific logger
const log = createLogger("email");

// Helper to get config values at runtime
function getSiteUrl() {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://codewithahsan.dev";
}

function getAdminEmail() {
  return process.env.ADMIN_EMAIL || "ahsan.ubitian@gmail.com";
}

// Initialize Mailgun client - lazy loaded
let mg: ReturnType<Mailgun["client"]> | null = null;
let initialized = false;

function getMailgunClient() {
  if (initialized) return mg;

  const apiKey = process.env.MAILGUN_API_KEY;
  if (apiKey) {
    const mailgun = new Mailgun(formData);
    mg = mailgun.client({ username: "api", key: apiKey });
  }

  initialized = true;
  return mg;
}

// Types
interface MentorshipProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: "mentor" | "mentee";
  expertise?: string[];
  currentRole?: string;
  bio?: string;
  education?: string;
  skillsSought?: string[];
  careerGoals?: string;
  mentorshipGoals?: string;
}

interface ScheduledSession {
  scheduledAt: Date | string;
  duration: number;
  agenda?: string;
}

interface RatingInfo {
  rating: number;
  feedback?: string;
}

// Email template styles
const emailStyles = `
  body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; }
  .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
  .header h1 { margin: 0; font-size: 24px; }
  .content { background: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
  .button { display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
  .footer { text-align: center; padding: 20px; color: #6b7280; font-size: 14px; }
  .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b; margin: 15px 0; }
  .success { background: #d1fae5; border-left-color: #10b981; }
  .warning { background: #fee2e2; border-left-color: #ef4444; }
  .info-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #e5e7eb; margin: 15px 0; }
`;

function wrapEmailHtml(content: string, title: string): string {
  const siteUrl = getSiteUrl();
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>${emailStyles}</style>
</head>
<body>
  <div class="header">
    <h1>🎓 Code with Ahsan Mentorship</h1>
  </div>
  <div class="content">
    ${content}
  </div>
  <div class="footer">
    <p>This is an automated message from the Code with Ahsan Mentorship Platform.</p>
    <p><a href="${siteUrl}/mentorship">Visit Mentorship Dashboard</a></p>
  </div>
</body>
</html>
  `;
}

// Core send function
async function sendEmail(
  to: string,
  subject: string,
  html: string,
  cc?: string,
): Promise<boolean> {
  // Check if emails are disabled (useful for local testing)
  if (process.env.DISABLE_EMAILS === "true") {
    log.info(`Emails disabled. Would have sent "${subject}" to ${to}`);
    return true;
  }

  const client = getMailgunClient();

  if (!client) {
    log.warn("Mailgun API key not configured, skipping email");
    return false;
  }

  const domain = process.env.MAILGUN_DOMAIN || "codewithahsan.dev";
  const fromName = process.env.EMAIL_FROM_NAME || "Code with Ahsan Mentorship";
  const fromEmail =
    process.env.EMAIL_FROM_ADDRESS || "noreply@codewithahsan.dev";

  try {
    await client.messages.create(domain, {
      from: `${fromName} <${fromEmail}>`,
      to: [to],
      cc: cc ? [cc] : undefined,
      subject,
      html,
    });
    log.info(`Sent "${subject}" to ${to}`);
    return true;
  } catch (error) {
    log.error("Failed to send email:", { error });
    return false;
  }
}

// ============================================
// Email Functions
// ============================================

/**
 * Send email to admin when a new mentor registers (pending approval)
 */
export async function sendAdminMentorPendingEmail(
  mentor: MentorshipProfile,
): Promise<boolean> {
  const subject = `🆕 New Mentor Registration: ${mentor.displayName}`;
  const content = `
    <h2>New Mentor Awaiting Approval</h2>
    <div class="info-box">
      <p><strong>Name:</strong> ${mentor.displayName}</p>
      <p><strong>Email:</strong> ${mentor.email}</p>
      <p><strong>Current Role:</strong> ${mentor.currentRole || "Not specified"}</p>
      <p><strong>Expertise:</strong> ${mentor.expertise?.join(", ") || "Not specified"}</p>
      ${mentor.bio ? `<p><strong>Bio:</strong> ${mentor.bio}</p>` : ""}
    </div>
    <p>Please review this mentor application and approve or decline.</p>
    <a href="${getSiteUrl()}/mentorship/admin" class="button">Review in Admin Dashboard</a>
  `;
  return sendEmail(getAdminEmail(), subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to mentor when their registration is approved or declined
 */
export async function sendRegistrationStatusEmail(
  mentor: MentorshipProfile,
  approved: boolean,
): Promise<boolean> {
  const subject = approved
    ? "🎉 Your Mentor Application Has Been Approved!"
    : "📝 Update on Your Mentor Application";

  const content = approved
    ? `
      <h2>Congratulations, ${mentor.displayName}!</h2>
      <div class="highlight success">
        <p>Your mentor application has been <strong>approved</strong>! You can now start accepting mentees.</p>
      </div>
      <p>Here's what you can do next:</p>
      <ul>
        <li>Complete your profile with availability and expertise details</li>
        <li>Set your maximum number of mentees</li>
        <li>Wait for mentee requests or browse the platform</li>
      </ul>
      <a href="${getSiteUrl()}/mentorship/dashboard" class="button">Go to Dashboard</a>
    `
    : `
      <h2>Hi ${mentor.displayName},</h2>
      <div class="highlight warning">
        <p>Unfortunately, your mentor application was <strong>not approved</strong> at this time.</p>
      </div>
      <p>This could be due to various reasons. If you believe this was a mistake or would like more information, please reach out to us on discord.</p>
      <p>You can update your profile and reapply in the future.</p>
    `;

  return sendEmail(mentor.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email when account status is changed (disabled/enabled)
 */
export async function sendAccountStatusEmail(
  user: MentorshipProfile,
  status: "disabled" | "enabled",
  reason?: string,
): Promise<boolean> {
  const subject =
    status === "disabled"
      ? "⚠️ Your Mentorship Account Has Been Disabled"
      : "✅ Your Mentorship Account Has Been Re-enabled";

  const content =
    status === "disabled"
      ? `
      <h2>Account Update</h2>
      <div class="highlight warning">
        <p>Your mentorship account has been <strong>temporarily disabled</strong>.</p>
      </div>
      ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ""}
      <p>If you believe this was a mistake or would like to discuss this further, please contact us.</p>
      <p>Any active mentorship sessions have been paused.</p>
    `
      : `
      <h2>Welcome Back, ${user.displayName}!</h2>
      <div class="highlight success">
        <p>Great news! Your mentorship account has been <strong>re-enabled</strong>.</p>
      </div>
      <p>You can now access all mentorship features again.</p>
      <a href="${getSiteUrl()}/mentorship/dashboard" class="button">Go to Dashboard</a>
    `;

  return sendEmail(user.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to mentor when they receive a new mentorship request
 */
export async function sendMentorshipRequestEmail(
  mentor: MentorshipProfile,
  mentee: MentorshipProfile,
): Promise<boolean> {
  const subject = `🙋 New Mentorship Request from ${mentee.displayName}`;
  const content = `
    <h2>New Mentorship Request</h2>
    <p>You have received a new mentorship request!</p>
    <div class="info-box">
      <p><strong>From:</strong> ${mentee.displayName}</p>
      <p><strong>Education:</strong> ${mentee.education || "Not specified"}</p>
      <p><strong>Skills Sought:</strong> ${mentee.skillsSought?.join(", ") || "Not specified"}</p>
      <p><strong>Career Goals:</strong> ${mentee.careerGoals || "Not specified"}</p>
    </div>
    ${mentee.mentorshipGoals ? `
    <div class="highlight">
      <p><strong>What they're looking for in a mentorship:</strong></p>
      <p>${mentee.mentorshipGoals}</p>
    </div>
    ` : ""}
    <p>Please review their profile and decide if you'd like to mentor them.</p>
    <a href="${getSiteUrl()}/mentorship/requests" class="button">View Request</a>
  `;
  return sendEmail(mentor.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to mentee when their request is accepted
 */
export async function sendRequestAcceptedEmail(
  mentee: MentorshipProfile,
  mentor: MentorshipProfile,
): Promise<boolean> {
  const subject = `🎉 ${mentor.displayName} Accepted Your Mentorship Request!`;
  const content = `
    <h2>Great News, ${mentee.displayName}!</h2>
    <div class="highlight success">
      <p><strong>${mentor.displayName}</strong> has accepted your mentorship request!</p>
    </div>
    <div class="info-box">
      <p><strong>Your Mentor:</strong> ${mentor.displayName}</p>
      <p><strong>Role:</strong> ${mentor.currentRole || "Not specified"}</p>
      <p><strong>Expertise:</strong> ${mentor.expertise?.join(", ") || "Not specified"}</p>
    </div>
    <p>Here's what to do next:</p>
    <ul>
      <li>Wait for your mentor to schedule your first session</li>
      <li>Set up your goals to track progress</li>
      <li>Prepare questions for your first meeting</li>
    </ul>
    <a href="${getSiteUrl()}/mentorship/my-matches" class="button">View Your Mentorship</a>
  `;
  return sendEmail(mentee.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to mentee when their request is declined
 */
export async function sendRequestDeclinedEmail(
  mentee: MentorshipProfile,
  mentor: MentorshipProfile,
): Promise<boolean> {
  const subject = `📝 Update on Your Mentorship Request`;
  const content = `
    <h2>Hi ${mentee.displayName},</h2>
    <div class="highlight">
      <p>Unfortunately, <strong>${mentor.displayName}</strong> was unable to accept your mentorship request at this time.</p>
    </div>
    <p>Don't be discouraged! Mentors have limited capacity, and this doesn't reflect on your potential.</p>
    <p>We encourage you to:</p>
    <ul>
      <li>Browse other available mentors</li>
      <li>Update your profile to highlight your goals</li>
      <li>Try connecting with mentors whose expertise matches your interests</li>
    </ul>
    <a href="${getSiteUrl()}/mentorship/browse" class="button">Browse Mentors</a>
  `;
  return sendEmail(mentee.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to both parties when a session is scheduled
 */
export async function sendSessionScheduledEmail(
  mentor: MentorshipProfile,
  mentee: MentorshipProfile,
  session: ScheduledSession,
): Promise<boolean> {
  const sessionDate = new Date(session.scheduledAt);
  const formattedDate = sessionDate.toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const formattedTime = sessionDate.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const subject = `📅 Session Scheduled: ${formattedDate}`;

  const createContent = (
    recipient: MentorshipProfile,
    partner: MentorshipProfile,
  ) => `
    <h2>Session Scheduled!</h2>
    <p>Hi ${recipient.displayName}, a mentorship session has been scheduled.</p>
    <div class="info-box">
      <p><strong>📅 Date:</strong> ${formattedDate}</p>
      <p><strong>🕐 Time:</strong> ${formattedTime}</p>
      <p><strong>⏱️ Duration:</strong> ${session.duration} minutes</p>
      <p><strong>👤 With:</strong> ${partner.displayName}</p>
      ${session.agenda ? `<p><strong>📝 Agenda:</strong> ${session.agenda}</p>` : ""}
    </div>
    <p>Make sure to prepare any questions or topics you'd like to discuss!</p>
    <a href="${getSiteUrl()}/mentorship/my-matches" class="button">View Session Details</a>
  `;

  // Send to both mentor and mentee
  const [mentorResult, menteeResult] = await Promise.all([
    sendEmail(
      mentor.email,
      subject,
      wrapEmailHtml(createContent(mentor, mentee), subject),
    ),
    sendEmail(
      mentee.email,
      subject,
      wrapEmailHtml(createContent(mentee, mentor), subject),
    ),
  ]);

  return mentorResult && menteeResult;
}

/**
 * Send email to both parties when mentorship is completed
 */
export async function sendMentorshipCompletedEmail(
  mentor: MentorshipProfile,
  mentee: MentorshipProfile,
): Promise<boolean> {
  const mentorSubject = `🎓 Mentorship Completed with ${mentee.displayName}`;
  const menteeSubject = `🎓 Mentorship Completed with ${mentor.displayName}`;

  const mentorContent = `
    <h2>Mentorship Complete!</h2>
    <div class="highlight success">
      <p>Congratulations! Your mentorship with <strong>${mentee.displayName}</strong> has been marked as complete.</p>
    </div>
    <p>Thank you for sharing your knowledge and helping others grow in their careers!</p>
    <p>Your contribution makes a real difference in the developer community.</p>
    <a href="${getSiteUrl()}/mentorship/dashboard" class="button">View Dashboard</a>
  `;

  const menteeContent = `
    <h2>Mentorship Complete!</h2>
    <div class="highlight success">
      <p>Congratulations! Your mentorship with <strong>${mentor.displayName}</strong> has been marked as complete.</p>
    </div>
    <p>We hope this mentorship has been valuable for your growth!</p>
    <p>Please take a moment to rate your experience - your feedback helps us improve and helps other mentees find great mentors.</p>
    <a href="${getSiteUrl()}/mentorship/my-matches" class="button">Rate Your Experience</a>
  `;

  const [mentorResult, menteeResult] = await Promise.all([
    sendEmail(
      mentor.email,
      mentorSubject,
      wrapEmailHtml(mentorContent, mentorSubject),
    ),
    sendEmail(
      mentee.email,
      menteeSubject,
      wrapEmailHtml(menteeContent, menteeSubject),
    ),
  ]);

  return mentorResult && menteeResult;
}

/**
 * Send email to mentor when they receive a rating
 */
export async function sendRatingReceivedEmail(
  mentor: MentorshipProfile,
  ratingInfo: RatingInfo,
): Promise<boolean> {
  const stars = "⭐".repeat(ratingInfo.rating);
  const subject = `${stars} You Received a ${ratingInfo.rating}-Star Rating!`;

  const content = `
    <h2>New Rating Received!</h2>
    <p>Hi ${mentor.displayName}, you've received feedback from a mentee!</p>
    <div class="info-box" style="text-align: center;">
      <p style="font-size: 32px; margin: 10px 0;">${stars}</p>
      <p><strong>${ratingInfo.rating} out of 5 stars</strong></p>
    </div>
    ${
      ratingInfo.feedback
        ? `
      <div class="highlight">
        <p><strong>Feedback:</strong></p>
        <p>"${ratingInfo.feedback}"</p>
      </div>
    `
        : ""
    }
    <p>Thank you for being an amazing mentor! Your ratings help build trust in the community.</p>
    <a href="${getSiteUrl()}/mentorship/dashboard" class="button">View Dashboard</a>
  `;

  return sendEmail(mentor.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send email to mentee when they are removed from a mentorship by the mentor
 */
export async function sendMentorshipRemovedEmail(
  mentee: MentorshipProfile,
  mentor: MentorshipProfile,
): Promise<boolean> {
  const subject = `📝 Update on Your Mentorship`;
  const content = `
    <h2>Hi ${mentee.displayName},</h2>
    <div class="highlight">
      <p>Your mentorship with <strong>${mentor.displayName}</strong> has been ended.</p>
    </div>
    <p>This could happen for various reasons - mentors sometimes need to reduce their capacity or focus on other commitments.</p>
    <p>Don't be discouraged! You can find a new mentor who's a great fit for your goals:</p>
    <a href="${getSiteUrl()}/mentorship/browse" class="button">Browse Available Mentors</a>
  `;
  return sendEmail(mentee.email, subject, wrapEmailHtml(content, subject));
}

/**
 * Send inactivity warning email to both mentor and mentee when session has been inactive for 35 days
 */
export async function sendMentorshipInactivityWarningEmail(
  mentor: MentorshipProfile,
  mentee: MentorshipProfile,
): Promise<boolean> {
  const subject = `⚠️ Mentorship Inactivity Warning`;
  const content = `
    <h2>Mentorship Inactivity Notice</h2>
    <div class="highlight">
      <p>The mentorship between <strong>${mentor.displayName}</strong> (mentor) and <strong>${mentee.displayName}</strong> (mentee) has been inactive for 35 days.</p>
    </div>
    <p>If no activity occurs in the Discord channel within the next <strong>7 days</strong>, the channel will be archived and the mentorship will be marked as cancelled.</p>
    <p>To keep this mentorship active, please send a message in your Discord channel.</p>
    <a href="${getSiteUrl()}/mentorship/dashboard" class="button">Go to Mentorship Dashboard</a>
  `;
  // Send to both mentor and mentee
  const mentorResult = await sendEmail(mentor.email, subject, wrapEmailHtml(content, subject));
  const menteeResult = await sendEmail(mentee.email, subject, wrapEmailHtml(content, subject));
  return mentorResult && menteeResult;
}

/**
 * Send email to mentor or mentee reminding them to set their Discord username
 */
export async function sendDiscordUsernameReminderEmail(
  user: { displayName: string; email: string },
  role: "mentor" | "mentee",
  partnerName?: string,
  cc?: string,
): Promise<boolean> {
  const subject = `🔔 Action Required: Set Your Discord Username`;

  const partnerInfo =
    role === "mentor"
      ? `Your mentee(s) are waiting to connect with you on Discord.`
      : `Your mentor <strong>${partnerName}</strong> is ready to connect with you on Discord.`;

  const content = `
    <h2>Hi ${user.displayName}!</h2>
    <div class="highlight">
      <p>${partnerInfo}</p>
      <p>To enable Discord communication for your mentorship, please set your Discord username in your profile settings.</p>
    </div>
    
    <h3>How to find your Discord username:</h3>
    <ol>
      <li>Open Discord (app or web)</li>
      <li>Click on your profile icon (bottom left)</li>
      <li>Your username is shown under your display name (e.g., <code>yourname</code> or <code>yourname#1234</code>)</li>
      <li>Copy just the username part (without the #numbers if present)</li>
    </ol>
    
    <h3>How to update your profile:</h3>
    <ol>
      <li>Go to your <a href="${getSiteUrl()}/profile">Profile Settings</a></li>
      <li>Find the "Discord Username" field</li>
      <li>Enter your Discord username</li>
      <li>Click "Save"</li>
    </ol>

    <div class="info-box">
      <p><strong>Why is this important?</strong></p>
      <p>We create a private Discord channel for each mentorship pair to facilitate easy communication. Without your Discord username, we can't add you to this channel.</p>
    </div>

    <a href="${getSiteUrl()}/profile" class="button">Update Your Profile Now</a>
    
    <p style="margin-top: 20px; color: #6b7280; font-size: 14px;">
      If you don't have a Discord account yet, you can create one for free at <a href="https://discord.com">discord.com</a>. 
      Then join our community server at <a href="https://discord.gg/J7JHsuh">discord.gg/J7JHsuh</a>.
    </p>
  `;

  return sendEmail(user.email, subject, wrapEmailHtml(content, subject), cc);
}
