import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { db } from "@/lib/firebaseAdmin";
import {
  sendChannelMessage,
  sendChannelMessageWithComponents,
  isDiscordConfigured,
  deleteMentorshipChannel,
  unarchiveMentorshipChannel,
} from "@/lib/discord";
import { sendMentorshipRemovedEmail } from "@/lib/email";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";

// Allowed status transitions state machine
const ALLOWED_TRANSITIONS: Record<string, string[]> = {
  pending: ["active", "cancelled"],
  active: ["completed", "cancelled"],
  completed: ["active"], // Allows revert
  cancelled: ["active"], // Can be re-activated by admin
};

// PUT: Update session status with state machine validation
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, status } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    // Validate target status
    if (!status || !["active", "completed"].includes(status)) {
      return NextResponse.json(
        {
          error: 'Invalid status. Must be "active" or "completed"',
        },
        { status: 400 }
      );
    }

    const sessionRef = db.collection("mentorship_sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = sessionDoc.data()!;
    const currentStatus = sessionData.status;

    // Validate state machine transition
    const allowedTargets = ALLOWED_TRANSITIONS[currentStatus] || [];
    if (!allowedTargets.includes(status)) {
      return NextResponse.json(
        {
          error: `Cannot transition from ${currentStatus} to ${status}`,
        },
        { status: 400 }
      );
    }

    // Build update data
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date(),
    };

    // Add completedAt timestamp when marking as completed
    if (status === "completed") {
      updateData.completedAt = new Date();
    }

    // Add revertedAt timestamp when reverting from completed to active
    if (currentStatus === "completed" && status === "active") {
      updateData.revertedAt = new Date();
    }

    // Add reactivatedAt timestamp when re-activating from cancelled to active
    const isReactivation = currentStatus === "cancelled" && status === "active";
    if (isReactivation) {
      updateData.reactivatedAt = new Date();
      // Clear stale cancellation metadata so the session reads as a clean active match
      updateData.cancellationReason = FieldValue.delete();
      updateData.cancelledAt = FieldValue.delete();
      updateData.cancelledBy = FieldValue.delete();
    }

    await sessionRef.update(updateData);

    // Fetch profiles once for notification paths that need them
    const needsProfiles =
      status === "completed" ||
      (currentStatus === "completed" && status === "active") ||
      isReactivation;
    let mentorData: Record<string, unknown> | null = null;
    let menteeData: Record<string, unknown> | null = null;
    if (needsProfiles && isDiscordConfigured()) {
      try {
        const [mentorProfile, menteeProfile] = await Promise.all([
          db.collection("mentorship_profiles").doc(sessionData.mentorId).get(),
          db.collection("mentorship_profiles").doc(sessionData.menteeId).get(),
        ]);
        mentorData = mentorProfile.exists
          ? (mentorProfile.data() as Record<string, unknown>)
          : null;
        menteeData = menteeProfile.exists
          ? (menteeProfile.data() as Record<string, unknown>)
          : null;
      } catch (err) {
        console.error("Admin sessions: profile fetch failed:", err);
      }
    }

    // On admin completion, DM both members then delete the channel (VIS-141).
    if (status === "completed" && isDiscordConfigured() && sessionData.discordChannelId) {
      const mentorName = (mentorData?.displayName as string) || "your mentor";
      const menteeName = (menteeData?.displayName as string) || "your mentee";

      deleteMentorshipChannel(sessionData.discordChannelId, {
        mentorUsername: mentorData?.discordUsername as string | undefined,
        menteeUsername: menteeData?.discordUsername as string | undefined,
        mentorMessage:
          `🎓 **Your mentorship with ${menteeName} has been marked as completed by an administrator!** 🎉\n\n` +
          `Thank you for sharing your knowledge and mentoring. Your Discord channel has been closed.`,
        menteeMessage:
          `🎓 **Your mentorship with ${mentorName} has been marked as completed by an administrator!** 🎉\n\n` +
          `We hope you learned a lot! Your Discord channel has been closed.\n\n` +
          `Best of luck on your continued journey! 🚀`,
        reason: "Mentorship completed by administrator (VIS-141)",
      }).catch((err) => console.error("Admin completion channel deletion failed:", err));
    }

    // On admin revert (completed → active): notify channel the mentorship was restored
    if (
      currentStatus === "completed" &&
      status === "active" &&
      isDiscordConfigured() &&
      sessionData.discordChannelId
    ) {
      sendChannelMessage(
        sessionData.discordChannelId,
        `↩️ **This mentorship has been reverted to active by an administrator.**\n\n@here Your mentorship session has been restored. Welcome back!`
      ).catch((err) => console.error("Admin revert channel message failed:", err));
    }

    // On admin reactivation, restore the Discord channel and post the same
    // notification mentor/mentee receive when a mentorship is auto-reactivated.
    if (isReactivation && isDiscordConfigured() && sessionData.discordChannelId) {
      try {
        // Unarchive the channel (renames, restores topic and member permissions)
        await unarchiveMentorshipChannel(
          sessionData.discordChannelId,
          mentorData?.discordUsername as string | undefined,
          menteeData?.discordUsername as string | undefined
        ).catch((err) => console.error("Discord channel unarchive failed:", err));

        // Post reactivation notification with a dashboard link button
        const dashboardUrl = `${SITE_URL}/mentorship/dashboard/${sessionId}`;
        await sendChannelMessageWithComponents(
          sessionData.discordChannelId,
          `♻️ **This mentorship has been reactivated by an administrator!**\n\n@here Your mentorship session has been restored. Welcome back!`,
          [
            {
              type: 1,
              components: [
                {
                  type: 2,
                  style: 5,
                  label: "View Dashboard",
                  url: dashboardUrl,
                },
              ],
            },
          ]
        ).catch((err) => console.error("Reactivation channel message failed:", err));
      } catch (err) {
        console.error("Reactivation Discord notification failed:", err);
      }
    }

    return NextResponse.json(
      {
        success: true,
        sessionId,
        status,
        message: `Session status updated to ${status}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating session status:", error);
    return NextResponse.json({ error: "Failed to update session status" }, { status: 500 });
  }
}

// DELETE: End a mentorship session (mark as cancelled, archive Discord, notify participants)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get("id");

    if (!sessionId) {
      return NextResponse.json({ error: "Missing session id parameter" }, { status: 400 });
    }

    const sessionRef = db.collection("mentorship_sessions").doc(sessionId);
    const sessionDoc = await sessionRef.get();

    if (!sessionDoc.exists) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    const sessionData = sessionDoc.data()!;

    // If already cancelled/completed, just delete the record
    if (sessionData.status === "cancelled" || sessionData.status === "completed") {
      await sessionRef.delete();
      return NextResponse.json(
        {
          success: true,
          sessionId,
          message: "Session record deleted",
        },
        { status: 200 }
      );
    }

    // For active/pending sessions: mark as cancelled and handle notifications
    await sessionRef.update({
      status: "cancelled",
      cancellationReason: "ended_by_admin",
      cancelledAt: new Date(),
      cancelledBy: "admin",
    });

    // Fetch profiles for notifications
    const [mentorProfile, menteeProfile] = await Promise.all([
      db.collection("mentorship_profiles").doc(sessionData.mentorId).get(),
      db.collection("mentorship_profiles").doc(sessionData.menteeId).get(),
    ]);

    const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
    const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

    const notificationTasks: Promise<unknown>[] = [];

    // DM both members, then delete the Discord channel (VIS-141). Deletion
    // replaces the previous archive; the moderators channel is guarded inside
    // deleteMentorshipChannel.
    if (isDiscordConfigured() && sessionData.discordChannelId) {
      notificationTasks.push(
        deleteMentorshipChannel(sessionData.discordChannelId, {
          mentorUsername: mentorData?.discordUsername,
          menteeUsername: menteeData?.discordUsername,
          mentorMessage: `📢 Your mentorship with **${menteeData?.displayName || "your mentee"}** has been ended by an administrator. The Discord channel has been closed.`,
          menteeMessage:
            `📢 Your mentorship with **${mentorData?.displayName || "your mentor"}** has been ended by an administrator. The Discord channel has been closed.\n\n` +
            `You can browse for a new mentor: https://codewithahsan.dev/mentorship/browse`,
          reason: "Mentorship ended by administrator (VIS-141)",
        }).catch((err) => console.error("Discord channel deletion failed:", err))
      );
    }

    // Send email to both parties
    if (mentorData && menteeData) {
      notificationTasks.push(
        sendMentorshipRemovedEmail(
          {
            uid: sessionData.mentorId,
            displayName: mentorData.displayName || "",
            email: mentorData.email || "",
            roles: ["mentor"],
          },
          {
            uid: sessionData.menteeId,
            displayName: menteeData.displayName || "",
            email: menteeData.email || "",
            roles: ["mentee"],
          }
        ).catch((err) => console.error("Failed to send end email:", err))
      );
    }

    await Promise.allSettled(notificationTasks);

    return NextResponse.json(
      {
        success: true,
        sessionId,
        message: "Mentorship ended successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error ending session:", error);
    return NextResponse.json({ error: "Failed to end session" }, { status: 500 });
  }
}
