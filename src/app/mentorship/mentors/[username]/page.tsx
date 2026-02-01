import type { Metadata } from "next";
import { db } from "@/lib/firebaseAdmin";
import MentorProfileClient from "./MentorProfileClient";
import { DEFAULT_MAX_MENTEES } from "@/lib/mentorship-constants";

interface PageProps {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ admin?: string }>;
}

// Fetch mentor data for both metadata and initial render
async function getMentorData(username: string) {
  try {
    const profilesSnapshot = await db
      .collection("mentorship_profiles")
      .where("username", "==", username.toLowerCase())
      .where("role", "==", "mentor")
      .limit(1)
      .get();

    if (profilesSnapshot.empty) {
      return null;
    }

    const profileDoc = profilesSnapshot.docs[0];
    const profileData = profileDoc.data();
    const uid = profileDoc.id;

    // Verify this is a public, accepted mentor
    if (profileData?.status !== "accepted" || profileData?.isPublic === false) {
      return null;
    }

    // Fetch mentor stats
    const [activeSessionsSnapshot, completedSessionsSnapshot, ratingsSnapshot] =
      await Promise.all([
        db
          .collection("mentorship_sessions")
          .where("mentorId", "==", uid)
          .where("status", "==", "active")
          .get(),
        db
          .collection("mentorship_sessions")
          .where("mentorId", "==", uid)
          .where("status", "==", "completed")
          .get(),
        db.collection("mentor_ratings").where("mentorId", "==", uid).get(),
      ]);

    const activeMenteeCount = activeSessionsSnapshot.size;
    const completedMentorships = completedSessionsSnapshot.size;

    // Calculate average rating
    let avgRating = 0;
    let ratingCount = 0;
    if (ratingsSnapshot.size > 0) {
      ratingCount = ratingsSnapshot.size;
      const totalRating = ratingsSnapshot.docs.reduce((sum, doc) => {
        return sum + (doc.data().rating || 0);
      }, 0);
      avgRating = Math.round((totalRating / ratingCount) * 10) / 10;
    }

    return {
      uid,
      username: profileData.username,
      displayName: profileData.displayName,
      photoURL: profileData.photoURL,
      currentRole: profileData.currentRole,
      bio: profileData.bio,
      majorProjects: profileData.majorProjects,
      expertise: profileData.expertise || [],
      availability: profileData.availability || {},
      maxMentees: profileData.maxMentees || DEFAULT_MAX_MENTEES,
      activeMenteeCount,
      completedMentorships,
      avgRating,
      ratingCount,
      isAtCapacity:
        activeMenteeCount >= (profileData.maxMentees || DEFAULT_MAX_MENTEES),
      createdAt: profileData.createdAt?.toDate?.()?.toISOString() || null,
    };
  } catch (error) {
    console.error("Error fetching mentor for metadata:", error);
    return null;
  }
}

// Generate dynamic metadata for SEO and social sharing
export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const mentor = await getMentorData(username);

  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
  const profileUrl = `${siteUrl}/mentorship/mentors/${username}`;

  // Default metadata if mentor not found
  if (!mentor) {
    return {
      title: "Mentor Not Found | Code with Ahsan Mentorship",
      description: "This mentor profile is not available.",
    };
  }

  // Build rich description
  const expertiseList = mentor.expertise?.slice(0, 3).join(", ") || "";
  const statsText =
    mentor.completedMentorships > 0
      ? `${mentor.completedMentorships} mentorship${mentor.completedMentorships > 1 ? "s" : ""} completed`
      : "";
  const ratingText =
    mentor.avgRating > 0 ? `⭐ ${mentor.avgRating}/5 rating` : "";

  const description = [
    mentor.currentRole || "Community Mentor",
    expertiseList && `Expert in ${expertiseList}`,
    statsText,
    ratingText,
    "Part of the Code with Ahsan Mentorship Community.",
  ]
    .filter(Boolean)
    .join(" • ");

  const title = `${mentor.displayName} (@${mentor.username}) | Mentor at Code with Ahsan`;

  return {
    title,
    description,
    keywords: [
      mentor.displayName,
      "mentor",
      "mentorship",
      "code with ahsan",
      "developer mentor",
      ...(mentor.expertise || []),
    ],
    authors: [{ name: mentor.displayName }],
    openGraph: {
      title,
      description,
      url: profileUrl,
      siteName: "Code with Ahsan",
      type: "profile",
      // Always use branded OG image for reliable social sharing
      // (Google profile photos are often blocked by social media crawlers)
      images: [
        {
          url: `${siteUrl}/images/mentorship-og.png`,
          width: 1200,
          height: 630,
          alt: `${mentor.displayName} - Mentor at Code with Ahsan`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [`${siteUrl}/images/mentorship-og.png`],
    },
    alternates: {
      canonical: profileUrl,
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default async function MentorProfilePage({ params, searchParams }: PageProps) {
  const { username } = await params;
  const resolvedSearchParams = await searchParams;
  const mentor = await getMentorData(username);

  return (
    <MentorProfileClient
      username={username}
      initialMentor={mentor}
      isAdminPreview={resolvedSearchParams.admin === "1"}
    />
  );
}
