import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service - CodeWithAhsan",
  description:
    "Terms and conditions for using the CodeWithAhsan mentorship platform, including project collaboration and community guidelines.",
};

export default function TermsOfServicePage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1>Terms of Service</h1>
        <p>
          <strong>Effective Date:</strong> February 16, 2026
        </p>

        <h2>1. Acceptance of Terms</h2>
        <p>
          Welcome to CodeWithAhsan. These Terms of Service ("Terms") govern
          your access to and use of our mentorship platform, including our
          website, services, and community features (collectively, the
          "Service").
        </p>
        <p>
          By accessing or using the Service, you agree to be bound by these
          Terms. If you do not agree to these Terms, you may not access or use
          the Service.
        </p>
        <p>
          We reserve the right to modify these Terms at any time. Your
          continued use of the Service after changes are posted constitutes
          acceptance of the modified Terms.
        </p>

        <h2>2. Description of Service</h2>
        <p>
          CodeWithAhsan is a comprehensive mentorship and learning platform
          that provides:
        </p>
        <ul>
          <li>
            <strong>Mentorship Matching:</strong> Connecting mentees with
            experienced mentors in software development and related fields
          </li>
          <li>
            <strong>Session Booking:</strong> Scheduling and managing one-on-one
            mentorship sessions with calendar integration
          </li>
          <li>
            <strong>Project Collaboration:</strong> Creating and participating
            in collaborative coding projects with team management
          </li>
          <li>
            <strong>Learning Roadmaps:</strong> Accessing curated learning
            paths and educational resources
          </li>
          <li>
            <strong>Community Integration:</strong> Discord-based communication
            and community engagement
          </li>
        </ul>

        <h2>3. User Accounts and Responsibilities</h2>

        <h3>3.1 Account Creation</h3>
        <p>To use our Service, you must:</p>
        <ul>
          <li>Create an account using a valid email address</li>
          <li>Provide accurate and complete information</li>
          <li>Be at least 13 years of age</li>
          <li>Maintain the security of your account credentials</li>
        </ul>

        <h3>3.2 Account Security</h3>
        <p>You are responsible for:</p>
        <ul>
          <li>All activities that occur under your account</li>
          <li>Maintaining the confidentiality of your login credentials</li>
          <li>Notifying us immediately of any unauthorized access</li>
          <li>Ensuring your account information remains accurate and current</li>
        </ul>

        <h3>3.3 Account Types</h3>
        <p>We offer different account types:</p>
        <ul>
          <li>
            <strong>Mentee:</strong> Seek guidance and participate in learning
            activities
          </li>
          <li>
            <strong>Mentor:</strong> Provide guidance after approval process
          </li>
          <li>
            <strong>Admin:</strong> Platform moderation and management
          </li>
        </ul>

        <h2>4. Mentorship Program Terms</h2>

        <h3>4.1 Mentor Application</h3>
        <ul>
          <li>
            Becoming a mentor requires submitting an application for admin
            review
          </li>
          <li>
            We reserve the right to approve or decline mentor applications at
            our discretion
          </li>
          <li>Approved mentors agree to provide quality guidance to mentees</li>
        </ul>

        <h3>4.2 Session Booking</h3>
        <ul>
          <li>Mentors set their own availability and booking windows</li>
          <li>Sessions are 30 minutes long with a 2-hour minimum advance booking</li>
          <li>
            Both mentors and mentees can cancel sessions with appropriate
            notice
          </li>
          <li>
            Repeated cancellations or no-shows may result in account
            restrictions
          </li>
        </ul>

        <h3>4.3 Code of Conduct</h3>
        <p>All participants in mentorship sessions must:</p>
        <ul>
          <li>Treat each other with respect and professionalism</li>
          <li>Arrive on time for scheduled sessions</li>
          <li>Come prepared with relevant questions or materials</li>
          <li>Maintain confidentiality of shared information</li>
          <li>Provide constructive feedback when requested</li>
        </ul>

        <h2>5. Project Collaboration Terms</h2>

        <h3>5.1 Project Creation</h3>
        <ul>
          <li>Any authenticated user can create project proposals</li>
          <li>Projects require admin approval before becoming active</li>
          <li>Project creators retain ownership and management rights</li>
          <li>
            We reserve the right to decline projects that don't meet quality
            standards
          </li>
        </ul>

        <h3>5.2 Team Member Responsibilities</h3>
        <p>When joining a project team, you agree to:</p>
        <ul>
          <li>Actively participate in project development</li>
          <li>Communicate clearly with team members</li>
          <li>Respect the project creator's leadership and decisions</li>
          <li>Follow the project's guidelines and requirements</li>
          <li>
            Notify the team if you need to leave or reduce participation
          </li>
        </ul>

        <h3>5.3 Intellectual Property</h3>
        <ul>
          <li>
            Project creators and contributors retain ownership of their
            contributions
          </li>
          <li>
            Collaborative work should specify ownership and licensing in project
            documentation
          </li>
          <li>
            You grant CodeWithAhsan a license to display project information on
            our platform
          </li>
          <li>
            Respect others' intellectual property - do not submit unauthorized
            content
          </li>
        </ul>

        <h2>6. Content Guidelines</h2>
        <p>When using our Service, you agree NOT to post or share:</p>
        <ul>
          <li>Offensive, abusive, or discriminatory content</li>
          <li>Spam, advertisements, or promotional material</li>
          <li>Malicious code, viruses, or harmful software</li>
          <li>Content that infringes on intellectual property rights</li>
          <li>Private or confidential information without authorization</li>
          <li>False or misleading information</li>
          <li>Content that violates any applicable laws or regulations</li>
        </ul>

        <h2>7. Discord Community Rules</h2>
        <p>Our Discord integration is subject to additional rules:</p>

        <h3>7.1 Discord Terms</h3>
        <ul>
          <li>
            You must comply with{" "}
            <a
              href="https://discord.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              Discord's Terms of Service
            </a>{" "}
            and{" "}
            <a
              href="https://discord.com/guidelines"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              Community Guidelines
            </a>
          </li>
          <li>Provide a valid Discord username for integration</li>
          <li>Accept role assignments (Mentor, Mentee, Admin)</li>
        </ul>

        <h3>7.2 Community Conduct</h3>
        <ul>
          <li>Be respectful and constructive in all communications</li>
          <li>Use appropriate channels for different topics</li>
          <li>Follow moderator instructions</li>
          <li>Report violations to moderators or admins</li>
        </ul>

        <h3>7.3 Moderator Authority</h3>
        <ul>
          <li>Moderators may warn, mute, or remove users who violate rules</li>
          <li>
            Channel access is granted based on platform roles and project
            membership
          </li>
          <li>
            Removal from Discord channels may occur if platform membership
            changes
          </li>
        </ul>

        <h2>8. Google Calendar Integration Terms</h2>

        <h3>8.1 Optional Feature</h3>
        <ul>
          <li>
            Google Calendar integration is completely optional and requires your
            explicit consent
          </li>
          <li>The Service functions normally without calendar integration</li>
          <li>You can disconnect your calendar at any time</li>
        </ul>

        <h3>8.2 Authorized Use</h3>
        <p>By connecting your Google Calendar, you authorize us to:</p>
        <ul>
          <li>Create calendar events for confirmed mentorship sessions</li>
          <li>Update events when sessions are rescheduled</li>
          <li>Delete events when sessions are cancelled</li>
        </ul>

        <h3>8.3 User Data Policy Compliance</h3>
        <p>
          Our use of information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="link link-primary"
          >
            Google API Services User Data Policy
          </a>
          , including the Limited Use requirements.
        </p>

        <h3>8.4 Your Responsibilities</h3>
        <ul>
          <li>
            Ensure you have the right to grant calendar access to our platform
          </li>
          <li>
            Understand that we store encrypted refresh tokens to maintain
            calendar synchronization
          </li>
          <li>Review our Privacy Policy for details on data handling</li>
        </ul>

        <h2>9. Prohibited Activities</h2>
        <p>You may not:</p>
        <ul>
          <li>
            Use the Service for any illegal purpose or in violation of any laws
          </li>
          <li>Impersonate another person or misrepresent your affiliation</li>
          <li>
            Attempt to gain unauthorized access to our systems or other users'
            accounts
          </li>
          <li>
            Interfere with or disrupt the Service or servers/networks connected
            to it
          </li>
          <li>
            Use automated means (bots, scrapers) to access the Service without
            permission
          </li>
          <li>Collect or harvest personal information from other users</li>
          <li>
            Transmit viruses, malware, or other malicious code
          </li>
          <li>Abuse, harass, threaten, or intimidate other users</li>
          <li>Create multiple accounts to evade restrictions or bans</li>
        </ul>

        <h2>10. Limitation of Liability</h2>

        <h3>10.1 "As Is" Service</h3>
        <p>
          The Service is provided "as is" and "as available" without warranties
          of any kind, either express or implied, including but not limited to:
        </p>
        <ul>
          <li>Warranties of merchantability or fitness for a particular purpose</li>
          <li>Warranties of uninterrupted or error-free service</li>
          <li>Warranties regarding the accuracy or reliability of content</li>
        </ul>

        <h3>10.2 No Professional Advice</h3>
        <p>
          CodeWithAhsan is an educational platform. Mentorship and content
          provided through the Service:
        </p>
        <ul>
          <li>Do not constitute professional advice</li>
          <li>Are provided by individual mentors, not CodeWithAhsan</li>
          <li>Should be independently verified before implementation</li>
          <li>Are not a substitute for formal education or training</li>
        </ul>

        <h3>10.3 Limitation of Damages</h3>
        <p>
          To the maximum extent permitted by law, CodeWithAhsan shall not be
          liable for any indirect, incidental, special, consequential, or
          punitive damages, including loss of profits, data, or other
          intangible losses resulting from:
        </p>
        <ul>
          <li>Your use or inability to use the Service</li>
          <li>
            Unauthorized access to or alteration of your data or communications
          </li>
          <li>Actions or content of third parties on the Service</li>
          <li>Any other matter relating to the Service</li>
        </ul>

        <h2>11. Termination Rights</h2>

        <h3>11.1 Your Rights</h3>
        <ul>
          <li>
            You may terminate your account at any time by deleting it through
            your settings
          </li>
          <li>Account deletion removes your data subject to our retention policies</li>
        </ul>

        <h3>11.2 Our Rights</h3>
        <p>We may suspend or terminate your account if:</p>
        <ul>
          <li>You violate these Terms of Service</li>
          <li>You engage in prohibited activities</li>
          <li>We receive reports of misconduct or abuse</li>
          <li>
            We determine, in our sole discretion, that your use of the Service
            is harmful to others or the platform
          </li>
          <li>Required by law or regulatory authorities</li>
        </ul>

        <h3>11.3 Effect of Termination</h3>
        <p>Upon termination:</p>
        <ul>
          <li>Your access to the Service will be immediately revoked</li>
          <li>Your Discord roles and channel access will be removed</li>
          <li>Your Google Calendar integration will be disconnected</li>
          <li>Some data may be retained for legal or security purposes</li>
        </ul>

        <h2>12. Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. We will
          notify users of material changes by:
        </p>
        <ul>
          <li>Posting a notice on our platform</li>
          <li>Sending an email to registered users</li>
          <li>Updating the "Effective Date" at the top of this document</li>
        </ul>
        <p>
          Your continued use of the Service after changes are posted
          constitutes acceptance of the modified Terms. If you do not agree to
          the changes, you should discontinue use of the Service.
        </p>

        <h2>13. Governing Law</h2>
        <p>
          These Terms shall be governed by and construed in accordance with
          applicable laws. Any disputes arising from these Terms or your use of
          the Service shall be resolved in accordance with the laws of the
          jurisdiction where CodeWithAhsan operates.
        </p>

        <h2>14. Severability</h2>
        <p>
          If any provision of these Terms is found to be invalid or
          unenforceable, the remaining provisions shall continue in full force
          and effect.
        </p>

        <h2>15. Entire Agreement</h2>
        <p>
          These Terms, together with our Privacy Policy, constitute the entire
          agreement between you and CodeWithAhsan regarding the use of the
          Service and supersede all prior agreements and understandings.
        </p>

        <h2>16. Contact Information</h2>
        <p>
          If you have questions or concerns about these Terms of Service,
          please contact us:
        </p>
        <ul>
          <li>
            <strong>Email:</strong>{" "}
            <a
              href="mailto:muhd.ahsanayaz@gmail.com"
              className="link link-primary"
            >
              muhd.ahsanayaz@gmail.com
            </a>
          </li>
          <li>
            <strong>Website:</strong>{" "}
            <a
              href="https://codewithahsan.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              codewithahsan.dev
            </a>
          </li>
        </ul>

        <p className="mt-8 text-sm text-base-content/70">
          These Terms of Service were last updated on February 16, 2026.
        </p>
      </div>
    </div>
  );
}
