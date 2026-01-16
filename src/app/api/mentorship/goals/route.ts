import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { sendChannelMessage, isDiscordConfigured } from "@/lib/discord";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const matchId = searchParams.get("matchId");

  if (!matchId) {
    return NextResponse.json(
      { error: "Missing matchId parameter" },
      { status: 400 }
    );
  }

  try {
    const goalsSnapshot = await db
      .collection("mentorship_goals")
      .where("matchId", "==", matchId)
      .orderBy("createdAt", "desc")
      .get();

    const goals = goalsSnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        targetDate: data.targetDate?.toDate?.() || data.targetDate || null,
        createdAt: data.createdAt?.toDate?.() || null,
      };
    });

    return NextResponse.json({ goals }, { status: 200 });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, createdBy, title, description, targetDate } = body;

    if (!matchId || !createdBy || !title) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const goalData = {
      matchId,
      createdBy,
      title,
      description: description || "",
      targetDate: targetDate ? new Date(targetDate) : null,
      status: "in-progress",
      createdAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection("mentorship_goals").add(goalData);

    // Send Discord notification about new goal
    if (isDiscordConfigured()) {
      const mentorshipSession = await db
        .collection("mentorship_sessions")
        .doc(matchId)
        .get();
      const sessionData = mentorshipSession.data();

      if (sessionData?.discordChannelId) {
        await sendChannelMessage(
          sessionData.discordChannelId,
          `🎯 **New Goal Created!**\n\n` +
            `**${title}**\n` +
            (description ? `${description}\n\n` : "\n") +
            (targetDate
              ? `📆 Target: ${new Date(targetDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}\n\n`
              : "") +
            `Let's crush this! 💪`
        ).catch((err) =>
          console.error("Failed to send Discord goal notification:", err)
        );
      }
    }

    return NextResponse.json(
      {
        goal: {
          id: docRef.id,
          ...goalData,
          targetDate: targetDate || null,
          createdAt: new Date().toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { goalId, status, matchId } = body;

    if (!goalId || !status) {
      return NextResponse.json(
        { error: "Missing goalId or status" },
        { status: 400 }
      );
    }

    // Get goal data before updating (for Discord notification)
    const goalDoc = await db.collection("mentorship_goals").doc(goalId).get();
    const goalData = goalDoc.data();

    await db.collection("mentorship_goals").doc(goalId).update({
      status,
      updatedAt: FieldValue.serverTimestamp(),
    });

    // Send Discord notification when goal is completed
    if (isDiscordConfigured() && status === "completed" && goalData) {
      const sessionMatchId = matchId || goalData.matchId;
      if (sessionMatchId) {
        const mentorshipSession = await db
          .collection("mentorship_sessions")
          .doc(sessionMatchId)
          .get();
        const sessionData = mentorshipSession.data();

        if (sessionData?.discordChannelId) {
          await sendChannelMessage(
            sessionData.discordChannelId,
            `🎉 **Goal Completed!**\n\n` +
              `**${goalData.title}** has been marked as complete!\n\n` +
              `Great work! Keep up the momentum! 🚀`
          ).catch((err) =>
            console.error(
              "Failed to send Discord goal completion notification:",
              err
            )
          );
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a goal (mentor only)
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const goalId = searchParams.get("goalId");
    const mentorId = searchParams.get("mentorId");

    if (!goalId || !mentorId) {
      return NextResponse.json(
        { error: "Missing goalId or mentorId" },
        { status: 400 }
      );
    }

    // Get the goal to find the matchId
    const goalDoc = await db.collection("mentorship_goals").doc(goalId).get();
    if (!goalDoc.exists) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    const goalData = goalDoc.data();

    // Verify the requester is the mentor of this mentorship
    const sessionDoc = await db
      .collection("mentorship_sessions")
      .doc(goalData?.matchId)
      .get();
    if (!sessionDoc.exists || sessionDoc.data()?.mentorId !== mentorId) {
      return NextResponse.json(
        { error: "Only the mentor can delete goals" },
        { status: 403 }
      );
    }

    await db.collection("mentorship_goals").doc(goalId).delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
