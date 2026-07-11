import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { sendMentorshipCompletedEmail, sendMentorshipRemovedEmail } from "@/lib/email";
import {
  sendDirectMessage,
  isDiscordConfigured,
  deleteMentorshipChannel,
  sendMentorshipCompletionAnnouncement,
} from "@/lib/discord";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const resolvedParams = await params;
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");

  if (!uid) {
    return NextResponse.json({ error: "Missing uid parameter" }, { status: 400 });
  }

  try {
    const matchDoc = await db.collection("mentorship_sessions").doc(resolvedParams.matchId).get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = matchDoc.data()!;

    // Verify user is part of this match
    if (matchData.mentorId !== uid && matchData.menteeId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check match is active
    if (matchData.status !== "active") {
      return NextResponse.json({ error: "Match is not active" }, { status: 403 });
    }

    // Get partner profile
    const partnerId = matchData.mentorId === uid ? matchData.menteeId : matchData.mentorId;
    const partnerDoc = await db.collection("mentorship_profiles").doc(partnerId).get();

    const partnerData = partnerDoc.exists ? partnerDoc.data() : null;

    return NextResponse.json(
      {
        match: {
          id: matchDoc.id,
          mentorId: matchData.mentorId,
          menteeId: matchData.menteeId,
          status: matchData.status,
          approvedAt: matchData.approvedAt?.toDate?.() || null,
          lastContactAt: matchData.lastContactAt?.toDate?.() || null,
          discordChannelUrl: matchData.discordChannelUrl || null,
          partner: partnerData
            ? {
                uid: partnerDoc.id,
                ...partnerData,
                createdAt: partnerData.createdAt?.toDate?.() || null,
                updatedAt: partnerData.updatedAt?.toDate?.() || null,
              }
            : null,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching match details:", error);
    return NextResponse.json({ error: "Failed to fetch match" }, { status: 500 });
  }
}

// PUT: Update match status (e.g., mark as completed)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const resolvedParams = await params;

  try {
    const body = await request.json();
    const { uid, action, completionNotes, removalReason } = body;

    if (!uid) {
      return NextResponse.json({ error: "Missing uid" }, { status: 400 });
    }

    const matchDoc = await db.collection("mentorship_sessions").doc(resolvedParams.matchId).get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = matchDoc.data()!;

    // Verify user is part of this match
    if (matchData.mentorId !== uid && matchData.menteeId !== uid) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Only mentors can mark as completed
    const isMentor = matchData.mentorId === uid;

    if (action === "complete") {
      if (!isMentor) {
        return NextResponse.json(
          { error: "Only mentors can mark mentorship as complete" },
          { status: 403 }
        );
      }

      if (matchData.status !== "active") {
        return NextResponse.json(
          { error: "Can only complete active mentorships" },
          { status: 400 }
        );
      }

      await db
        .collection("mentorship_sessions")
        .doc(resolvedParams.matchId)
        .update({
          status: "completed",
          completedAt: new Date(),
          completedBy: uid,
          completionNotes: completionNotes || null,
        });

      // Fetch profiles for notifications
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData.mentorId).get(),
        db.collection("mentorship_profiles").doc(matchData.menteeId).get(),
      ]);

      const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
      const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

      // Execute notification tasks in parallel but await them to ensure Vercel function stays alive
      const notificationTasks = [];

      // Send DM to mentee asking to rate the mentor
      if (isDiscordConfigured() && menteeData?.discordUsername && mentorData) {
        notificationTasks.push(
          sendDirectMessage(
            menteeData.discordUsername,
            `🌟 **Your mentorship with ${mentorData.displayName} is complete!**\n\n` +
              `We hope you had a great experience! Please take a moment to rate your mentor.\n\n` +
              `👉 Rate your mentor: https://codewithahsan.dev/mentorship/mentors/${mentorData.username || matchData.mentorId}\n\n` +
              `Your feedback helps other mentees find great mentors. Thank you! 💜`
          ).catch((err) => console.error("Mentee rating DM failed:", err))
        );
      }

      // Send completion announcement to #find-a-mentor
      if (isDiscordConfigured() && mentorData && menteeData) {
        notificationTasks.push(
          sendMentorshipCompletionAnnouncement(
            mentorData.displayName || "Mentor",
            menteeData.displayName || "Mentee",
            mentorData.discordUsername,
            menteeData.discordUsername
          ).catch((err) => console.error("Completion announcement failed:", err))
        );
      }

      // DM the mentor a completion notice, then delete the channel (VIS-141).
      // The mentee is notified separately above via the rating DM.
      if (isDiscordConfigured() && matchData.discordChannelId) {
        notificationTasks.push(
          deleteMentorshipChannel(matchData.discordChannelId, {
            mentorUsername: mentorData?.discordUsername,
            mentorMessage:
              `🎓 **Your mentorship with ${menteeData?.displayName || "your mentee"} is now complete!** 🎉\n\n` +
              `Thank you for sharing your knowledge and mentoring. The Discord channel has been closed.`,
            reason: "Mentorship completed (VIS-141)",
          }).catch((err) => console.error("Discord channel deletion failed:", err))
        );
      }

      // Send completion email to both
      if (mentorData && menteeData) {
        notificationTasks.push(
          sendMentorshipCompletedEmail(
            {
              uid: matchData.mentorId,
              displayName: mentorData?.displayName || "",
              email: mentorData?.email || "",
              roles: ["mentor"],
            },
            {
              uid: matchData.menteeId,
              displayName: menteeData?.displayName || "",
              email: menteeData?.email || "",
              roles: ["mentee"],
            }
          ).catch((err) => console.error("Failed to send completion email:", err))
        );
      }

      // Wait for all notifications to complete (success or fail)
      await Promise.allSettled(notificationTasks);

      return NextResponse.json(
        {
          success: true,
          message: "Mentorship marked as complete!",
        },
        { status: 200 }
      );
    } else if (action === "remove") {
      // Only mentors can remove mentees
      if (!isMentor) {
        return NextResponse.json(
          { error: "Only mentors can remove mentees from their list" },
          { status: 403 }
        );
      }

      if (matchData.status !== "active") {
        return NextResponse.json({ error: "Can only remove active mentorships" }, { status: 400 });
      }

      await db
        .collection("mentorship_sessions")
        .doc(resolvedParams.matchId)
        .update({
          status: "cancelled",
          cancellationReason: removalReason || "removed_by_mentor",
          cancelledAt: new Date(),
          cancelledBy: uid,
        });

      // Fetch profiles for notifications
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData.mentorId).get(),
        db.collection("mentorship_profiles").doc(matchData.menteeId).get(),
      ]);

      const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
      const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

      const notificationTasks = [];

      // DM the mentee, then delete the channel (VIS-141). Deletion replaces the
      // previous archive; the mentee is the affected member here.
      if (isDiscordConfigured() && matchData.discordChannelId) {
        notificationTasks.push(
          deleteMentorshipChannel(matchData.discordChannelId, {
            menteeUsername: menteeData?.discordUsername,
            menteeMessage:
              `📢 Your mentorship with **${mentorData?.displayName || "your mentor"}** has been ended. The Discord channel has been closed.\n\n` +
              `You can browse for a new mentor: https://codewithahsan.dev/mentorship/browse`,
            reason: "Mentorship ended by mentor (VIS-141)",
          }).catch((err) => console.error("Discord channel deletion failed:", err))
        );
      }

      // Send email to mentee
      if (menteeData && mentorData) {
        notificationTasks.push(
          sendMentorshipRemovedEmail(
            {
              uid: matchData.menteeId,
              displayName: menteeData.displayName || "",
              email: menteeData.email || "",
              roles: ["mentee"],
            },
            {
              uid: matchData.mentorId,
              displayName: mentorData.displayName || "",
              email: mentorData.email || "",
              roles: ["mentor"],
            }
          ).catch((err) => console.error("Failed to send removal email:", err))
        );
      }

      await Promise.allSettled(notificationTasks);

      return NextResponse.json(
        {
          success: true,
          message: "Mentorship ended successfully",
        },
        { status: 200 }
      );
    } else if (action === "end") {
      // Mentees can end their active mentorships
      if (isMentor) {
        return NextResponse.json(
          { error: "Mentors should use 'remove' or 'complete' instead" },
          { status: 400 }
        );
      }

      if (matchData.status !== "active") {
        return NextResponse.json({ error: "Can only end active mentorships" }, { status: 400 });
      }

      await db
        .collection("mentorship_sessions")
        .doc(resolvedParams.matchId)
        .update({
          status: "cancelled",
          cancellationReason: removalReason || "ended_by_mentee",
          cancelledAt: new Date(),
          cancelledBy: uid,
        });

      // Fetch profiles for notifications
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData.mentorId).get(),
        db.collection("mentorship_profiles").doc(matchData.menteeId).get(),
      ]);

      const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
      const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

      const notificationTasks = [];

      // DM the mentor, then delete the channel (VIS-141). Deletion replaces the
      // previous archive; the mentor is the affected member here.
      if (isDiscordConfigured() && matchData.discordChannelId) {
        notificationTasks.push(
          deleteMentorshipChannel(matchData.discordChannelId, {
            mentorUsername: mentorData?.discordUsername,
            mentorMessage:
              `📢 **${menteeData?.displayName || "Your mentee"}** has ended the mentorship. The Discord channel has been closed.\n\n` +
              `You now have an open slot for a new mentee.`,
            reason: "Mentorship ended by mentee (VIS-141)",
          }).catch((err) => console.error("Discord channel deletion failed:", err))
        );
      }

      // Send email to mentor
      if (mentorData && menteeData) {
        notificationTasks.push(
          sendMentorshipRemovedEmail(
            {
              uid: matchData.mentorId,
              displayName: mentorData.displayName || "",
              email: mentorData.email || "",
              roles: ["mentor"],
            },
            {
              uid: matchData.menteeId,
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
          message: "Mentorship ended successfully",
        },
        { status: 200 }
      );
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json({ error: "Failed to update match" }, { status: 500 });
  }
}
