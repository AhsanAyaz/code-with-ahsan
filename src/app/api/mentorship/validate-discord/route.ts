import { NextRequest, NextResponse } from "next/server";
import { lookupMemberByUsername, isDiscordConfigured } from "@/lib/discord";

const DISCORD_INVITE_URL = "https://codewithahsan.dev/discord";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { discordUsername } = body;

    if (!discordUsername || typeof discordUsername !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid discordUsername" },
        { status: 400 }
      );
    }

    // Check if Discord is configured
    if (!isDiscordConfigured()) {
      // In development without Discord config, assume valid
      console.warn(
        "[validate-discord] Discord not configured, skipping validation"
      );
      return NextResponse.json(
        {
          valid: true,
          username: discordUsername.trim().toLowerCase(),
          warning: "Discord validation skipped (not configured)",
        },
        { status: 200 }
      );
    }

    // Clean the username (remove @ prefix if present, trim whitespace)
    const cleanUsername = discordUsername.trim().replace(/^@/, "").toLowerCase();

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Discord username cannot be empty" },
        { status: 400 }
      );
    }

    // Look up the member in the Discord server
    const member = await lookupMemberByUsername(cleanUsername);

    if (member) {
      return NextResponse.json(
        {
          valid: true,
          discordId: member.id,
          username: member.username,
        },
        { status: 200 }
      );
    } else {
      return NextResponse.json(
        {
          valid: false,
          discordInviteUrl: DISCORD_INVITE_URL,
          message: `User "${cleanUsername}" was not found on our Discord server. Please join our Discord community first.`,
        },
        { status: 200 }
      );
    }
  } catch (error) {
    console.error("Error validating Discord username:", error);
    return NextResponse.json(
      { error: "Failed to validate Discord username" },
      { status: 500 }
    );
  }
}
