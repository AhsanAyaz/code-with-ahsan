import { GoogleGenAI } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { db, storage } from "@/lib/firebaseAdmin";

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

// GET - Retrieve existing announcement image URL for a match
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
        { status: 400 },
      );
    }

    // Get match document
    const matchDoc = await db
      .collection("mentorship_sessions")
      .doc(matchId)
      .get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = matchDoc.data();
    const announcementImageUrl = matchData?.announcementImageUrl || null;

    return NextResponse.json({
      success: true,
      announcementImageUrl,
      exists: !!announcementImageUrl,
    });
  } catch (error) {
    console.error("Error getting announcement image:", error);
    return NextResponse.json(
      { error: "Failed to get announcement image" },
      { status: 500 },
    );
  }
}

// DELETE - Remove existing announcement image (for regeneration)
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const matchId = searchParams.get("matchId");

    if (!matchId) {
      return NextResponse.json(
        { error: "matchId is required" },
        { status: 400 },
      );
    }

    // Delete from Firebase Storage (all files matching matchId prefix)
    const prefix = `mentorship-announcements/${matchId}`;
    try {
      const [files] = await storage.getFiles({ prefix });
      if (files.length > 0) {
        await Promise.all(files.map((file) => file.delete()));
      }
    } catch (e) {
      // File might not exist, that's okay
      console.log("Error deleting files:", e);
    }

    // Clear URL from match document
    await db.collection("mentorship_sessions").doc(matchId).update({
      announcementImageUrl: null,
    });

    return NextResponse.json({
      success: true,
      message: "Announcement image deleted",
    });
  } catch (error) {
    console.error("Error deleting announcement image:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement image" },
      { status: 500 },
    );
  }
}

// POST - Generate and save announcement image
export async function POST(req: NextRequest) {
  console.log("[Announcement Image] POST request received");

  try {
    const body = await req.json();
    const { matchId, menteeName, mentorName, menteePhotoURL, mentorPhotoURL } =
      body;

    if (!matchId || !menteeName || !mentorName) {
      return NextResponse.json(
        { error: "matchId, menteeName, and mentorName are required" },
        { status: 400 },
      );
    }

    // Read the outline frame image
    const outlinePath = path.join(
      process.cwd(),
      "public/images/mentorship_announcement_outline_v2.png",
    );
    const outlineData = fs.readFileSync(outlinePath);
    // Convert to data uri for CSS background
    const outlineSrc = `data:image/png;base64,${outlineData.toString("base64")}`;

    // Get profile photos or use placeholders
    // Enhance photo URLs to request higher resolution for better quality
    let menteePhoto =
      menteePhotoURL ||
      "https://ui-avatars.com/api/?name=" + encodeURIComponent(menteeName) + "&size=400";
    let mentorPhoto =
      mentorPhotoURL ||
      "https://ui-avatars.com/api/?name=" + encodeURIComponent(mentorName) + "&size=400";

    // Helper function to enhance photo URL for higher resolution
    const enhancePhotoUrl = (photoUrl: string): string => {
      let enhanced = photoUrl;
      // Handle Google profile photos with =s{size}-c format
      if (enhanced.includes("googleusercontent.com")) {
        // Replace size parameter like =s96-c with =s400-c for higher resolution
        enhanced = enhanced.replace(/=s\d+-c/, "=s400-c");
        // If no size parameter exists, append one
        if (!enhanced.includes("=s400-c")) {
          enhanced = enhanced + (enhanced.includes("?") ? "&" : "?") + "sz=400";
        }
      }
      // Handle Gravatar URLs
      if (enhanced.includes("gravatar.com")) {
        enhanced = enhanced.replace(/[?&]s=\d+/, "") + "?s=400";
      }
      return enhanced;
    };

    // Apply enhancement to both photos
    menteePhoto = enhancePhotoUrl(menteePhoto);
    mentorPhoto = enhancePhotoUrl(mentorPhoto);

    // Using Import from next/og dynamically to avoid edgy runtime errors if not standard
    const { ImageResponse } = await import("next/og");

    // Generate the image using HTML/CSS
    // User requested 1:1 square image.
    // The outline is 500x500.
    const imageResponse = new ImageResponse(
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          position: "relative",
          backgroundColor: "#1a1a2e",
          backgroundImage: `url(${outlineSrc})`,
          backgroundSize: "cover",
          fontFamily: "sans-serif",
        }}
      >
        {/* ----- MENTEE SECTION (Left Center) ----- */}

        {/* Photo */}
        <img
          src={menteePhoto}
          height="120"
          width="120"
          style={{
            position: "absolute",
            top: "160px",
            left: "70px",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "4px solid #a78bfa",
          }}
        />

        {/* Name */}
        <div
          style={{
            position: "absolute",
            top: "290px",
            left: "50px",
            width: "160px",
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "4px 8px",
            borderRadius: "8px",
          }}
        >
          {menteeName}
        </div>

        {/* ----- MENTOR SECTION (Right Center) ----- */}

        {/* Photo */}
        <img
          src={mentorPhoto}
          height="120"
          width="120"
          style={{
            position: "absolute",
            top: "160px",
            right: "70px",
            width: "120px",
            height: "120px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "4px solid #60a5fa",
          }}
        />

        {/* Name */}
        <div
          style={{
            position: "absolute",
            top: "290px",
            right: "50px",
            width: "160px",
            display: "flex",
            justifyContent: "center",
            textAlign: "center",
            color: "white",
            fontSize: "16px",
            fontWeight: "bold",
            textShadow: "0 2px 4px rgba(0,0,0,0.8)",
            backgroundColor: "rgba(0,0,0,0.6)",
            padding: "4px 8px",
            borderRadius: "8px",
          }}
        >
          {mentorName}
        </div>
      </div>,
      {
        width: 500,
        height: 500,
      },
    );

    const arrayBuffer = await imageResponse.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64Image = buffer.toString("base64");
    const mimeType = "image/png";
    let publicUrl: string | undefined;

    try {
      console.log(
        "[Announcement Image] Uploading generated image to Firebase Storage",
      );

      if (process.env.NODE_ENV === "development") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      // 1. Delete existing images for this match to avoid clutter and ensure unique hash is effective
      const prefix = `mentorship-announcements/${matchId}`;
      try {
        const [files] = await storage.getFiles({ prefix });
        if (files.length > 0) {
          await Promise.all(files.map((file) => file.delete()));
        }
      } catch (e) {
        console.log("Error cleaning up old files:", e);
      }

      // 2. Generate new unique filename
      const timestamp = Date.now();
      const filePath = `mentorship-announcements/${matchId}_${timestamp}.png`;
      const file = storage.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });
      await file.makePublic();
      publicUrl = `https://storage.googleapis.com/${storage.name}/${filePath}`;

      await db.collection("mentorship_sessions").doc(matchId).update({
        announcementImageUrl: publicUrl,
      });
    } catch (uploadError) {
      console.error(
        "[Announcement Image] Firebase upload failed:",
        uploadError,
      );
    }

    return NextResponse.json({
      success: true,
      announcementImageUrl: publicUrl,
      image: `data:${mimeType};base64,${base64Image}`,
      menteeName,
      mentorName,
      uploadError: publicUrl
        ? undefined
        : "Image generated but failed to save to cloud storage.",
    });
  } catch (error) {
    console.error("[Announcement Image] Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate announcement image",
        details: (error as Error)?.message,
      },
      { status: 500 },
    );
  }
}
