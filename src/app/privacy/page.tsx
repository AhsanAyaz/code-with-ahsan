import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy - CodeWithAhsan",
  description:
    "Learn how CodeWithAhsan collects, uses, and protects your personal data, including Google Calendar integration and Discord communication.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="prose prose-lg max-w-none">
        <h1>Privacy Policy</h1>
        <p>
          <strong>Effective Date:</strong> February 16, 2026
        </p>

        <h2>1. Introduction</h2>
        <p>
          Welcome to CodeWithAhsan ("we," "our," or "us"). We are committed to
          protecting your privacy and ensuring the security of your personal
          information. This Privacy Policy explains how we collect, use, store,
          and protect your data when you use our mentorship platform.
        </p>
        <p>
          By using CodeWithAhsan, you agree to the collection and use of
          information in accordance with this policy. If you do not agree with
          our policies and practices, please do not use our platform.
        </p>

        <h2>2. Information We Collect</h2>
        <p>We collect several types of information to provide and improve our services:</p>

        <h3>2.1 Authentication Information</h3>
        <ul>
          <li>Email address (via Firebase Authentication)</li>
          <li>Display name and profile photo</li>
          <li>Authentication provider information (Google, GitHub, etc.)</li>
          <li>User ID and authentication tokens</li>
        </ul>

        <h3>2.2 Profile Information</h3>
        <ul>
          <li>Username and bio</li>
          <li>Skills, domains of expertise, and difficulty level</li>
          <li>Discord username for community integration</li>
          <li>Mentor/mentee role and status</li>
          <li>Profile customization preferences</li>
        </ul>

        <h3>2.3 Mentorship Data</h3>
        <ul>
          <li>Mentorship requests and applications</li>
          <li>Session bookings and scheduling information</li>
          <li>Availability settings and time slot preferences</li>
          <li>Communication history related to mentorship sessions</li>
          <li>Session feedback and ratings</li>
        </ul>

        <h3>2.4 Project Collaboration Data</h3>
        <ul>
          <li>Project proposals and descriptions</li>
          <li>Team membership and roles</li>
          <li>Project applications and invitations</li>
          <li>Collaboration history and activity logs</li>
        </ul>

        <h3>2.5 Learning Roadmap Data</h3>
        <ul>
          <li>Created roadmaps and version history</li>
          <li>Roadmap content and metadata</li>
          <li>User interactions with roadmaps</li>
        </ul>

        <h2>3. Google Calendar Integration</h2>
        <p>
          <strong>This section is critical for users who connect their Google Calendar to our platform.</strong>
        </p>

        <h3>3.1 What Data We Access</h3>
        <p>
          When you choose to connect your Google Calendar to CodeWithAhsan, we
          access the Google Calendar API to:
        </p>
        <ul>
          <li>Create calendar events for your mentorship session bookings</li>
          <li>Update calendar events when bookings are rescheduled</li>
          <li>Delete calendar events when bookings are cancelled</li>
        </ul>

        <h3>3.2 How We Use Calendar Data</h3>
        <p>We use your Google Calendar access to:</p>
        <ul>
          <li>
            Automatically add confirmed mentorship sessions to your calendar
          </li>
          <li>Keep your calendar synchronized with booking changes</li>
          <li>Provide you with convenient calendar reminders</li>
          <li>Prevent scheduling conflicts by checking availability</li>
        </ul>

        <h3>3.3 Data Storage and Security</h3>
        <p>
          We store the following Google Calendar-related data:
        </p>
        <ul>
          <li>
            <strong>Refresh Tokens:</strong> Encrypted using AES-256-GCM
            encryption and stored securely in Firebase Firestore
          </li>
          <li>
            <strong>Access Tokens:</strong> Automatically refreshed by the
            Google APIs client library and never permanently stored
          </li>
          <li>
            <strong>Calendar Event IDs:</strong> Stored in booking records to
            enable updates and deletions
          </li>
        </ul>

        <h3>3.4 User Control</h3>
        <p>You have complete control over your Google Calendar integration:</p>
        <ul>
          <li>
            Calendar integration is <strong>completely optional</strong>
          </li>
          <li>
            You can disconnect your Google Calendar at any time from your
            profile settings
          </li>
          <li>
            Disconnecting removes all stored tokens and stops calendar
            synchronization
          </li>
          <li>
            Booking functionality works normally without calendar integration
          </li>
        </ul>

        <h3>3.5 Compliance with Google API Services User Data Policy</h3>
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

        <h2>4. Discord Integration</h2>
        <p>
          Our platform integrates with Discord to facilitate community
          communication:
        </p>

        <h3>4.1 Discord Username Collection</h3>
        <ul>
          <li>We collect your Discord username to identify you in the community</li>
          <li>Your Discord username is displayed to other platform members</li>
          <li>Used for role assignment (Mentor, Mentee, Admin roles)</li>
        </ul>

        <h3>4.2 Discord Communication</h3>
        <ul>
          <li>
            Direct messages (DMs) for important notifications (booking
            confirmations, invitations, etc.)
          </li>
          <li>Private Discord channels for project collaboration</li>
          <li>
            Discord channel access management based on project membership
          </li>
        </ul>

        <h3>4.3 What We Don't Collect</h3>
        <ul>
          <li>We do not store Discord message content</li>
          <li>We do not access your Discord contacts or servers</li>
          <li>We only use Discord's API for notifications and channel management</li>
        </ul>

        <h2>5. How We Use Your Information</h2>
        <p>We use your data for the following purposes:</p>
        <ul>
          <li>
            <strong>Platform Functionality:</strong> To provide mentorship
            matching, project collaboration, and learning resources
          </li>
          <li>
            <strong>Communication:</strong> To send booking confirmations,
            status updates, and important notifications
          </li>
          <li>
            <strong>Calendar Management:</strong> To synchronize mentorship
            sessions with your Google Calendar
          </li>
          <li>
            <strong>Community Integration:</strong> To manage Discord roles and
            channel access
          </li>
          <li>
            <strong>Service Improvement:</strong> To analyze usage patterns and
            improve our platform
          </li>
          <li>
            <strong>Security:</strong> To detect and prevent fraud, abuse, and
            security threats
          </li>
        </ul>

        <h2>6. Data Sharing and Third Parties</h2>
        <p>We share your data with the following third-party services:</p>

        <h3>6.1 Firebase (Google Cloud)</h3>
        <ul>
          <li>Authentication services</li>
          <li>Database storage (Firestore)</li>
          <li>File storage (Firebase Storage)</li>
          <li>Hosting infrastructure</li>
        </ul>

        <h3>6.2 Google Calendar API</h3>
        <ul>
          <li>
            Only if you explicitly connect your calendar - used for event
            management
          </li>
          <li>Data transfer encrypted via HTTPS</li>
          <li>Subject to Google's privacy policies</li>
        </ul>

        <h3>6.3 Discord</h3>
        <ul>
          <li>Community communication and notifications</li>
          <li>Role and channel management</li>
          <li>Subject to Discord's privacy policies</li>
        </ul>

        <h3>6.4 What We Don't Do</h3>
        <ul>
          <li>We do not sell your personal data to third parties</li>
          <li>We do not share your data for advertising purposes</li>
          <li>
            We do not use your Google Calendar data for any purpose other than
            session synchronization
          </li>
        </ul>

        <h2>7. Data Security</h2>
        <p>We implement multiple security measures to protect your data:</p>
        <ul>
          <li>
            <strong>Encryption:</strong> Google Calendar refresh tokens
            encrypted using AES-256-GCM
          </li>
          <li>
            <strong>Secure Storage:</strong> All data stored in Firebase
            Firestore with security rules
          </li>
          <li>
            <strong>Access Control:</strong> Role-based access control for
            sensitive operations
          </li>
          <li>
            <strong>HTTPS:</strong> All data transmission encrypted via HTTPS
          </li>
          <li>
            <strong>Authentication:</strong> Secure Firebase Authentication
            with token-based sessions
          </li>
          <li>
            <strong>Regular Audits:</strong> Periodic security reviews and
            updates
          </li>
        </ul>
        <p>
          While we strive to protect your data, no method of transmission over
          the Internet or electronic storage is 100% secure. We cannot
          guarantee absolute security.
        </p>

        <h2>8. Your Rights</h2>
        <p>You have the following rights regarding your data:</p>

        <h3>8.1 Access</h3>
        <ul>
          <li>View your profile and data through your account settings</li>
          <li>Request a copy of your data by contacting us</li>
        </ul>

        <h3>8.2 Correction</h3>
        <ul>
          <li>Update your profile information at any time</li>
          <li>Correct inaccuracies in your data</li>
        </ul>

        <h3>8.3 Deletion</h3>
        <ul>
          <li>Delete your account and associated data</li>
          <li>Request removal of specific data by contacting us</li>
          <li>
            Note: Some data may be retained for legal or security purposes
          </li>
        </ul>

        <h3>8.4 Data Portability</h3>
        <ul>
          <li>Request an export of your data in a machine-readable format</li>
        </ul>

        <h3>8.5 Withdrawal of Consent</h3>
        <ul>
          <li>Disconnect Google Calendar integration at any time</li>
          <li>Opt out of Discord notifications</li>
          <li>Close your account to stop data collection</li>
        </ul>

        <h2>9. Cookies and Analytics</h2>
        <p>We use the following analytics and tracking technologies:</p>

        <h3>9.1 Google Analytics</h3>
        <ul>
          <li>
            Tracking ID: <code>G-GXQ6YGD3WM</code>
          </li>
          <li>Used to analyze website traffic and user behavior</li>
          <li>Helps us improve platform performance and user experience</li>
          <li>
            Subject to Google Analytics{" "}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="link link-primary"
            >
              privacy policy
            </a>
          </li>
        </ul>

        <h3>9.2 Essential Cookies</h3>
        <ul>
          <li>Authentication session cookies</li>
          <li>User preference storage</li>
          <li>Security and fraud prevention</li>
        </ul>

        <p>
          You can disable cookies through your browser settings, but this may
          affect platform functionality.
        </p>

        <h2>10. Children's Privacy</h2>
        <p>
          CodeWithAhsan is not directed to children under the age of 13. We do
          not knowingly collect personal information from children under 13. If
          you are a parent or guardian and believe your child has provided us
          with personal data, please contact us immediately, and we will delete
          that information.
        </p>

        <h2>11. Changes to This Privacy Policy</h2>
        <p>
          We may update this Privacy Policy from time to time to reflect
          changes in our practices or legal requirements. We will notify you of
          any material changes by:
        </p>
        <ul>
          <li>Posting a notice on our platform</li>
          <li>Sending an email notification to registered users</li>
          <li>Updating the "Effective Date" at the top of this policy</li>
        </ul>
        <p>
          Your continued use of CodeWithAhsan after changes are posted
          constitutes acceptance of the updated policy.
        </p>

        <h2>12. Contact Information</h2>
        <p>
          If you have questions, concerns, or requests regarding this Privacy
          Policy or your personal data, please contact us:
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
          This Privacy Policy was last updated on February 16, 2026.
        </p>
      </div>
    </div>
  );
}
