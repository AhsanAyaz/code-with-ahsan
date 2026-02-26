import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import {
  sendMentorshipRequestEmail,
  sendRequestAcceptedEmail,
  sendRequestDeclinedEmail,
} from "@/lib/email";
import {
  createMentorshipChannel,
  sendDirectMessage,
  isDiscordConfigured,
  lookupMemberByUsername,
} from "@/lib/discord";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const uid = searchParams.get("uid");
  const role = searchParams.get("role");

  if (!uid || !role) {
    return NextResponse.json(
      { error: "Missing uid or role parameter" },
      { status: 400 }
    );
  }

  try {
    let matchesQuery;
    let pendingQuery;

    if (role === "mentor") {
      // Mentor sees their mentees
      matchesQuery = db
        .collection("mentorship_sessions")
        .where("mentorId", "==", uid)
        .where("status", "==", "active");

      pendingQuery = db
        .collection("mentorship_sessions")
        .where("mentorId", "==", uid)
        .where("status", "==", "pending");
    } else {
      // Mentee sees their mentors
      matchesQuery = db
        .collection("mentorship_sessions")
        .where("menteeId", "==", uid)
        .where("status", "==", "active");

      // Mentees don't need to see pending requests
      // (their requests are pending on the mentor's side)
      pendingQuery = null;
    }

    // Build promises array - only fetch pending if needed
    const promises = [matchesQuery.get()];
    if (pendingQuery) {
      promises.push(pendingQuery.get());
    }

    const results = await Promise.all(promises);
    const matchesSnapshot = results[0];
    const pendingSnapshot = results[1] || { docs: [] }; // Empty if no query

    const matches = matchesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      requestedAt: doc.data().requestedAt?.toDate?.() || null,
      approvedAt: doc.data().approvedAt?.toDate?.() || null,
      lastContactAt: doc.data().lastContactAt?.toDate?.() || null,
    }));

    const pendingRequests = await Promise.all(
      pendingSnapshot.docs.map(async (doc) => {
        const matchData = doc.data();

        // Fetch mentee profile
        const menteeDoc = await db
          .collection("mentorship_profiles")
          .doc(matchData.menteeId)
          .get();

        const menteeProfile = menteeDoc.exists ? menteeDoc.data() : null;

        return {
          id: doc.id,
          ...matchData,
          requestedAt: matchData.requestedAt?.toDate?.() || null,
          menteeProfile: menteeProfile
            ? {
                displayName: menteeProfile.displayName,
                photoURL: menteeProfile.photoURL,
                email: menteeProfile.email,
                discordUsername: menteeProfile.discordUsername,
                education: menteeProfile.education,
                skillsSought: menteeProfile.skillsSought,
                careerGoals: menteeProfile.careerGoals,
                mentorshipGoals: menteeProfile.mentorshipGoals,
                learningStyle: menteeProfile.learningStyle,
              }
            : null,
        };
      })
    );

    return NextResponse.json({ matches, pendingRequests }, { status: 200 });
  } catch (error) {
    console.error("Error fetching matches:", error);
    return NextResponse.json(
      { error: "Failed to fetch matches" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { menteeId, mentorId, matchScore } = body;

    if (!menteeId || !mentorId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check mentor capacity before creating request
    const [mentorProfile, activeMatches] = await Promise.all([
      db.collection("mentorship_profiles").doc(mentorId).get(),
      db
        .collection("mentorship_sessions")
        .where("mentorId", "==", mentorId)
        .where("status", "==", "active")
        .get(),
    ]);

    if (!mentorProfile.exists) {
      return NextResponse.json({ error: "Mentor not found" }, { status: 404 });
    }

    const mentorData = mentorProfile.data();
    const maxMentees = mentorData?.maxMentees || DEFAULT_MAX_MENTEES;
    const activeMenteeCount = activeMatches.size;

    if (activeMenteeCount >= maxMentees) {
      return NextResponse.json(
        {
          error: "Mentor is at capacity",
          message: `This mentor can only take ${maxMentees} mentees and currently has ${activeMenteeCount} active mentees.`,
        },
        { status: 409 }
      );
    }

    // Check if a match already exists with this specific mentor
    const existingMatch = await db
      .collection("mentorship_sessions")
      .where("menteeId", "==", menteeId)
      .where("mentorId", "==", mentorId)
      .get();

    if (!existingMatch.empty) {
      const existingDoc = existingMatch.docs[0];
      const status = existingDoc.data().status;
      return NextResponse.json(
        {
          error: `Match request already exists with status: ${status}`,
          existingMatchId: existingDoc.id,
          status,
        },
        { status: 409 }
      );
    }

    // Check if mentee already has an active mentorship (one mentor per mentee)
    const existingActiveMentorship = await db
      .collection("mentorship_sessions")
      .where("menteeId", "==", menteeId)
      .where("status", "==", "active")
      .limit(1)
      .get();

    if (!existingActiveMentorship.empty) {
      return NextResponse.json(
        {
          error: "Already has active mentorship",
          message:
            "You already have an active mentor. Complete or wait for that mentorship to end before requesting a new one.",
        },
        { status: 409 }
      );
    }

    const matchData = {
      menteeId,
      mentorId,
      status: "pending",
      requestedAt: FieldValue.serverTimestamp(),
      matchScore: matchScore || null,
    };

    const docRef = await db.collection("mentorship_sessions").add(matchData);

    // Send email notification to mentor about new request
    const menteeProfile = await db
      .collection("mentorship_profiles")
      .doc(menteeId)
      .get();
    if (menteeProfile.exists && mentorData) {
      const menteeData = menteeProfile.data();
      const notificationTasks = [];

      // Email task
      notificationTasks.push(
        sendMentorshipRequestEmail(
          {
            uid: mentorId,
            displayName: mentorData.displayName || "",
            email: mentorData.email || "",
            role: "mentor",
          },
          {
            uid: menteeId,
            displayName: menteeData?.displayName || "",
            email: menteeData?.email || "",
            role: "mentee",
            education: menteeData?.education,
            skillsSought: menteeData?.skillsSought,
            careerGoals: menteeData?.careerGoals,
            mentorshipGoals: menteeData?.mentorshipGoals,
          }
        ).catch((err) => console.error("Failed to send request email:", err))
      );

      // Discord DM task
      if (isDiscordConfigured() && mentorData?.discordUsername) {
        notificationTasks.push(
          sendDirectMessage(
            mentorData.discordUsername,
            `📬 **New Mentorship Request!**\n\n` +
              `**${menteeData?.displayName || "A mentee"}** wants you to be their mentor!\n\n` +
              `**Skills they want to learn:** ${menteeData?.skillsSought?.join(", ") || "Not specified"}\n` +
              `**Career Goals:** ${menteeData?.careerGoals || "Not specified"}\n` +
              `**What they're looking for:** ${menteeData?.mentorshipGoals || "Not specified"}\n\n` +
              `Review the request: https://codewithahsan.dev/mentorship/requests`
          ).catch((err) =>
            console.error("Failed to send Discord DM to mentor:", err)
          )
        );
      }

      // Wait for all notifications
      await Promise.allSettled(notificationTasks);
    }

    return NextResponse.json(
      {
        success: true,
        matchId: docRef.id,
        message: "Match request sent successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating match request:", error);
    return NextResponse.json(
      { error: "Failed to create match request" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { matchId, action, mentorId } = body;

    if (!matchId || !action) {
      return NextResponse.json(
        { error: "Missing matchId or action" },
        { status: 400 }
      );
    }

    const matchRef = db.collection("mentorship_sessions").doc(matchId);
    const matchDoc = await matchRef.get();

    if (!matchDoc.exists) {
      return NextResponse.json({ error: "Match not found" }, { status: 404 });
    }

    const matchData = matchDoc.data();

    // Verify the mentor is the one making the decision
    if (mentorId && matchData?.mentorId !== mentorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    if (action === "approve") {
      // Check mentor capacity before approving
      const [mentorProfile, activeMatches] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData?.mentorId).get(),
        db
          .collection("mentorship_sessions")
          .where("mentorId", "==", matchData?.mentorId)
          .where("status", "==", "active")
          .get(),
      ]);

      const mentorProfileData = mentorProfile.data();
      const maxMentees = mentorProfileData?.maxMentees || DEFAULT_MAX_MENTEES;
      const activeMenteeCount = activeMatches.size;

      if (activeMenteeCount >= maxMentees) {
        return NextResponse.json(
          {
            error: "Cannot accept - at capacity",
            message: `You can only have ${maxMentees} active mentees. Please update your settings to increase capacity or complete an existing mentorship first.`,
            activeMenteeCount,
            maxMentees,
          },
          { status: 409 }
        );
      }

      // Fetch mentee profile (needed for both Discord and email)
      const menteeProfile = await db
        .collection("mentorship_profiles")
        .doc(matchData?.menteeId)
        .get();
      const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

      // Validate Discord Users if configured
      if (isDiscordConfigured()) {
        const mentorDiscord = mentorProfileData?.discordUsername;
        const menteeDiscord = menteeData?.discordUsername;

        if (!mentorDiscord && !menteeDiscord) {
          return NextResponse.json(
            {
              error: "Missing Discord usernames",
              message:
                "Both you and the mentee are missing Discord usernames. Please update your profile settings and ask the mentee to do the same.",
            },
            { status: 400 }
          );
        }

        if (!mentorDiscord) {
          return NextResponse.json(
            {
              error: "Missing your Discord username",
              message:
                "Your Discord username is not set. Please update your profile settings before approving.",
            },
            { status: 400 }
          );
        }

        if (!menteeDiscord) {
          return NextResponse.json(
            {
              error: "Missing mentee's Discord username",
              message:
                "The mentee's Discord username is not set. Please ask them to update their profile before you can approve.",
            },
            { status: 400 }
          );
        }

        const [mentorMember, menteeMember] = await Promise.all([
          lookupMemberByUsername(mentorDiscord),
          lookupMemberByUsername(menteeDiscord),
        ]);

        if (!mentorMember) {
          return NextResponse.json(
            {
              error:
                "Mentor not found on Discord. Please update your discord username.",
              message: `Could not find mentor's Discord user '${mentorDiscord}' in the server. Please join the server first.`,
            },
            { status: 400 }
          );
        }

        if (!menteeMember) {
          return NextResponse.json(
            {
              error:
                "Mentee not found on Discord. Please ask mentee to update their discord username.",
              message: `Could not find mentee's Discord user '${menteeDiscord}' in the server. Please join the server first.`,
            },
            { status: 400 }
          );
        }
      }

      await matchRef.update({
        status: "active",
        approvedAt: FieldValue.serverTimestamp(),
        lastContactAt: FieldValue.serverTimestamp(),
      });

      // Create Discord channel (non-blocking)
      // Create Discord channel (blocking to ensure it survives Vercel function freeze)
      if (isDiscordConfigured() && mentorProfileData) {
        try {
          const result = await createMentorshipChannel(
            mentorProfileData.displayName || mentorProfileData.email?.split("@")[0] || "Mentor",
            menteeData?.displayName || menteeData?.email?.split("@")[0] || "Mentee",
            matchId,
            mentorProfileData.discordUsername,
            menteeData?.discordUsername
          );

          if (result) {
            await matchRef.update({
              discordChannelId: result.channelId,
              discordChannelUrl: result.channelUrl,
            });

            // Send DM to mentee with channel link
            if (menteeData?.discordUsername && mentorProfileData) {
              // We CAN fire-and-forget this one as it's less critical,
              // BUT for Vercel reliability it's safer to await or Promise.all if we had multiple
              await sendDirectMessage(
                menteeData.discordUsername,
                `🎉 Great news! **${mentorProfileData.displayName}** has accepted your mentorship request!\n\n` +
                  `Your private channel is ready: ${result.channelUrl}`
              ).catch((err) => console.error("Discord DM failed:", err));
            }
          }
        } catch (err) {
          console.error("Discord channel creation failed:", err);
        }
      }

      // Send acceptance email to mentee
      if (menteeData && mentorProfileData) {
        sendRequestAcceptedEmail(
          {
            uid: matchData?.menteeId,
            displayName: menteeData?.displayName || "",
            email: menteeData?.email || "",
            role: "mentee",
          },
          {
            uid: matchData?.mentorId,
            displayName: mentorProfileData.displayName || "",
            email: mentorProfileData.email || "",
            role: "mentor",
            expertise: mentorProfileData.expertise,
            currentRole: mentorProfileData.currentRole,
          }
        ).catch((err) =>
          console.error("Failed to send acceptance email:", err)
        );
      }

      // Auto-cancel other pending requests for this mentee
      const otherPendingRequests = await db
        .collection("mentorship_sessions")
        .where("menteeId", "==", matchData?.menteeId)
        .where("status", "==", "pending")
        .get();

      const cancelledCount = otherPendingRequests.docs.filter(
        (doc) => doc.id !== matchId
      ).length;

      if (cancelledCount > 0) {
        const batch = db.batch();
        for (const doc of otherPendingRequests.docs) {
          if (doc.id !== matchId) {
            batch.update(doc.ref, {
              status: "cancelled",
              cancellationReason: "auto_cancelled_mentee_matched",
              cancelledAt: FieldValue.serverTimestamp(),
            });
          }
        }
        await batch.commit();

        // Notify mentee about cancelled requests
        if (menteeData?.discordUsername && mentorProfileData) {
          sendDirectMessage(
            menteeData.discordUsername,
            `ℹ️ Since **${mentorProfileData.displayName}** accepted you as their mentee, your ${cancelledCount} other pending request(s) have been automatically cancelled.`
          ).catch((err) =>
            console.error("Failed to send cancelled requests DM:", err)
          );
        }
      }

      return NextResponse.json(
        { success: true, message: "Match approved" },
        { status: 200 }
      );
    } else if (action === "decline") {
      await matchRef.update({
        status: "declined",
      });

      // Send decline email to mentee
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData?.mentorId).get(),
        db.collection("mentorship_profiles").doc(matchData?.menteeId).get(),
      ]);
      if (menteeProfile.exists && mentorProfile.exists) {
        const menteeData = menteeProfile.data();
        const mentorProfileData = mentorProfile.data();
        sendRequestDeclinedEmail(
          {
            uid: matchData?.menteeId,
            displayName: menteeData?.displayName || "",
            email: menteeData?.email || "",
            role: "mentee",
          },
          {
            uid: matchData?.mentorId,
            displayName: mentorProfileData?.displayName || "",
            email: mentorProfileData?.email || "",
            role: "mentor",
          }
        ).catch((err) => console.error("Failed to send decline email:", err));
      }

      return NextResponse.json(
        { success: true, message: "Match declined" },
        { status: 200 }
      );
    } else if (action === "withdraw") {
      // Mentees can withdraw their own pending requests
      const { menteeId } = body;

      if (!menteeId || matchData?.menteeId !== menteeId) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
      }

      if (matchData?.status !== "pending") {
        return NextResponse.json(
          { error: "Can only withdraw pending requests" },
          { status: 400 }
        );
      }

      await matchRef.update({
        status: "cancelled",
        cancellationReason: "withdrawn_by_mentee",
        cancelledAt: FieldValue.serverTimestamp(),
        cancelledBy: menteeId,
      });

      // Notify mentor via Discord DM (fire-and-forget)
      const [mentorProfile, menteeProfile] = await Promise.all([
        db.collection("mentorship_profiles").doc(matchData.mentorId).get(),
        db.collection("mentorship_profiles").doc(menteeId).get(),
      ]);
      const mentorData = mentorProfile.exists ? mentorProfile.data() : null;
      const menteeData = menteeProfile.exists ? menteeProfile.data() : null;

      if (isDiscordConfigured() && mentorData?.discordUsername && menteeData) {
        sendDirectMessage(
          mentorData.discordUsername,
          `📢 **${menteeData.displayName || "A mentee"}** has withdrawn their mentorship request.`
        ).catch((err) =>
          console.error("Failed to send withdrawal DM to mentor:", err)
        );
      }

      return NextResponse.json(
        { success: true, message: "Request withdrawn" },
        { status: 200 }
      );
    }

    // Note: 'complete' action is handled by /api/mentorship/dashboard/[matchId]

    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  } catch (error) {
    console.error("Error updating match:", error);
    return NextResponse.json(
      { error: "Failed to update match" },
      { status: 500 }
    );
  }
}
