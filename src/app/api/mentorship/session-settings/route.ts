import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, discordChannelUrl } = body;

    if (!sessionId) {
      return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });
    }

    const updateData: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (discordChannelUrl !== undefined) {
      updateData.discordChannelUrl = discordChannelUrl;

      // Try to extract channel ID from URL
      // Format: https://discord.com/channels/GUILD_ID/CHANNEL_ID
      const channelIdMatch = discordChannelUrl.match(/channels\/\d+\/(\d+)/);
      if (channelIdMatch && channelIdMatch[1]) {
        updateData.discordChannelId = channelIdMatch[1];
      }
    }

    await db
      .collection("mentorship_sessions")
      .doc(sessionId)
      .update(updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating session settings:", error);
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
