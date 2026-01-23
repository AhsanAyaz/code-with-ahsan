import { NextRequest, NextResponse } from "next/server";
import * as fs from "node:fs";
import * as path from "node:path";
import { db, storage } from "@/lib/firebaseAdmin";

// GET - Retrieve existing announcement image URL for a user
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Get user document
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userData = userDoc.data();
    const announcementImageUrl = userData?.mentor_announcement || null;

    return NextResponse.json({
      success: true,
      announcementImageUrl,
      exists: !!announcementImageUrl,
    });
  } catch (error) {
    console.error("Error getting mentor announcement image:", error);
    return NextResponse.json(
      { error: "Failed to get mentor announcement image" },
      { status: 500 },
    );
  }
}

// DELETE - Remove existing announcement image
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const uid = searchParams.get("uid");

    if (!uid) {
      return NextResponse.json({ error: "uid is required" }, { status: 400 });
    }

    // Delete from Firebase Storage (all files matching uid prefix)
    const prefix = `mentor-announcements/${uid}`;
    try {
      const [files] = await storage.getFiles({ prefix });
      if (files.length > 0) {
        await Promise.all(files.map((file) => file.delete()));
      }
    } catch (e) {
      console.log("Error deleting files:", e);
    }

    // Clear URL from mentorship_profiles document
    await db.collection("mentorship_profiles").doc(uid).update({
      mentor_announcement: null,
    });

    return NextResponse.json({
      success: true,
      message: "Announcement image deleted",
    });
  } catch (error) {
    console.error("Error deleting mentor announcement image:", error);
    return NextResponse.json(
      { error: "Failed to delete announcement image" },
      { status: 500 },
    );
  }
}

// POST - Generate and save announcement image
export async function POST(req: NextRequest) {
  console.log("[Mentor Announcement Image] POST request received");

  try {
    const body = await req.json();
    const { uid, name, photoURL } = body;

    if (!uid || !name) {
      return NextResponse.json(
        { error: "uid and name are required" },
        { status: 400 },
      );
    }

    // Read the outline frame image
    const outlinePath = path.join(
      process.cwd(),
      "public/images/mentor_announcement_outline.png",
    );
    // Fallback to main outline if specific one doesn't exist yet, but user said it does.
    // We will assume it exists as per instructions.

    let outlineData;
    try {
      outlineData = fs.readFileSync(outlinePath);
    } catch (e) {
      console.error("Outline image not found:", outlinePath);
      return NextResponse.json(
        { error: "Outline image not found" },
        { status: 500 },
      );
    }

    // Convert to data uri for CSS background
    const outlineSrc = `data:image/png;base64,${outlineData.toString("base64")}`;

    // Get profile photo or use placeholder
    const mentorPhoto =
      photoURL ||
      "https://ui-avatars.com/api/?name=" + encodeURIComponent(name);

    // Using Import from next/og dynamically to avoid edgy runtime errors if not standard
    const { ImageResponse } = await import("next/og");

    // Generate the image using HTML/CSS
    // Dimensions: 500x500 (Square)
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
        {/* Photo */}
        <img
          src={mentorPhoto}
          height="180"
          width="180"
          style={{
            position: "absolute",
            top: "135px",
            left: "160px", // Centered horizontally (500 - 180)/2 = 160
            width: "180px",
            height: "180px",
            borderRadius: "50%",
            objectFit: "cover",
            border: "5px solid #60a5fa", // Blue border
          }}
        />
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
        "[Mentor Announcement Image] Uploading generated image to Firebase Storage",
      );

      if (process.env.NODE_ENV === "development") {
        process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
      }

      // 1. Delete existing images for this user to avoid clutter
      const prefix = `mentor-announcements/${uid}`;
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
      const filePath = `mentor-announcements/${uid}_${timestamp}.png`;
      const file = storage.file(filePath);

      await file.save(buffer, {
        metadata: {
          contentType: mimeType,
        },
      });
      await file.makePublic();
      publicUrl = `https://storage.googleapis.com/${storage.name}/${filePath}`;

      // Update mentorship_profiles document
      await db.collection("mentorship_profiles").doc(uid).update({
        mentor_announcement: publicUrl,
      });
    } catch (uploadError) {
      console.error(
        "[Mentor Announcement Image] Firebase upload failed:",
        uploadError,
      );
    }

    return NextResponse.json({
      success: true,
      announcementImageUrl: publicUrl,
      image: `data:${mimeType};base64,${base64Image}`,
      name,
      uploadError: publicUrl
        ? undefined
        : "Image generated but failed to save to cloud storage.",
    });
  } catch (error) {
    console.error("[Mentor Announcement Image] Error generating image:", error);
    return NextResponse.json(
      {
        error: "Failed to generate announcement image",
        details: (error as Error)?.message,
      },
      { status: 500 },
    );
  }
}
