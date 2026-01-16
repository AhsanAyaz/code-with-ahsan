import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import {
  createMentorshipChannel,
  sendDirectMessage,
  isDiscordConfigured,
  archiveMentorshipChannel,
} from "@/lib/discord";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, mentorId } = body;

    if (!matchId || !mentorId) {
      return NextResponse.json(
        { error: "Missing matchId or mentorId" },
        { status: 400 }
      );
    }

    // 1. Fetch Match
    const matchRef = db.collection("mentorship_sessions").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = matchDoc.data();

    if (!matchData) {
      return NextResponse.json(
        { error: "Match data not found" },
        { status: 404 }
      );
    }

    // 2. Verify Ownership
    if (matchData?.mentorId !== mentorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 3. Fetch Profiles
    const [mentorProfile, menteeProfile] = await Promise.all([
      db.collection("mentorship_profiles").doc(matchData.mentorId).get(),
      db.collection("mentorship_profiles").doc(matchData.menteeId).get(),
    ]);

    const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
    const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

    if (!mentorData || !menteeData) {
      return NextResponse.json(
        { error: "Mentor or Mentee profile not found" },
        { status: 404 }
      );
    }

    // 4. Validate Discord Usernames
    const mentorDiscord = mentorData.discordUsername;
    const menteeDiscord = menteeData.discordUsername;

    if (!mentorDiscord && !menteeDiscord) {
      return NextResponse.json(
        {
          error:
            "Both Discord usernames are missing. Please update your profile and ask your mentee to update theirs.",
        },
        { status: 400 }
      );
    }

    if (!mentorDiscord) {
      return NextResponse.json(
        {
          error:
            "Your Discord username is missing. Please update your profile settings.",
        },
        { status: 400 }
      );
    }

    if (!menteeDiscord) {
      return NextResponse.json(
        {
          error:
            "Mentee's Discord username is missing. Please ask them to update their profile.",
        },
        { status: 400 }
      );
    }

    // 5. Check Discord Configuration
    if (!isDiscordConfigured()) {
      return NextResponse.json(
        { error: "Discord integration is not configured on the server." },
        { status: 503 }
      );
    }

    // 6. Archive Old Channel (if exists)
    if (matchData.discordChannelId) {
      console.log(`Archiving old channel: ${matchData.discordChannelId}`);
      try {
        await archiveMentorshipChannel(matchData.discordChannelId);
      } catch (err) {
        console.error("Failed to archive old channel:", err);
        // Continue with regeneration even if archiving fails
      }
    }

    // 7. Regenerate Channel
    const result = await createMentorshipChannel(
      mentorData.displayName || "Mentor",
      menteeData.displayName || "Mentee",
      matchId,
      mentorDiscord,
      menteeDiscord
    );

    if (!result) {
      return NextResponse.json(
        {
          error: "Failed to create Discord channel. Please check server logs.",
        },
        { status: 500 }
      );
    }

    // 8. Update Session
    await matchRef.update({
      discordChannelId: result.channelId,
      discordChannelUrl: result.channelUrl,
    });

    // 9. Send New DM to Mentee (Fire and forget, but wrapped for safety)
    const notificationTasks = [];
    notificationTasks.push(
      sendDirectMessage(
        menteeDiscord,
        `🔄 **Channel Regenerated**\n\n` +
          `Your mentor **${mentorData.displayName}** has regenerated your mentorship channel.\n` +
          `Here is the new link: ${result.channelUrl}`
      ).catch((err) => console.error("Failed to send regeneration DM:", err))
    );

    // Also notify mentor via DM for good measure? No, they get the link in UI.

    await Promise.allSettled(notificationTasks);

    return NextResponse.json(
      {
        success: true,
        channelUrl: result.channelUrl,
        message: "Channel regenerated successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error regenerating channel:", error);
    return NextResponse.json(
      { error: "Internal server error during regeneration" },
      { status: 500 }
    );
  }
}
