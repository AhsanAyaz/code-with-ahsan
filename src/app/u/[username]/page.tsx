import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/lib/firebaseAdmin";
import {
  PUBLIC_AMBASSADORS_COLLECTION,
  type PublicAmbassadorDoc,
} from "@/types/ambassador";
import type { Role } from "@/types/mentorship";
import PublicProfileClient from "./PublicProfileClient";

interface PageProps {
  params: Promise<{ username: string }>;
}

export interface PublicProfileData {
  uid: string;
  username: string;
  displayName: string;
  photoURL: string;
  roles: Role[];
  // Mentor-section fields (rendered only if roles includes "mentor" and status accepted)
  mentorPublic: boolean;
  // Ambassador-section fields (rendered only if roles includes "ambassador" or "alumni-ambassador")
  ambassadorPublic: PublicAmbassadorDoc | null;
  linkedinUrl?: string;
  bio?: string;
  currentRole?: string;
}

async function getPublicProfile(
  username: string
): Promise<PublicProfileData | null> {
  try {
    const snap = await db
      .collection("mentorship_profiles")
      .where("username", "==", username.toLowerCase())
      .limit(1)
      .get();

    if (snap.empty) return null;

    const doc = snap.docs[0];
    const p = doc.data() as {
      username?: string;
      displayName?: string;
      photoURL?: string;
      roles?: Role[];
      role?: Role | null;
      status?: string;
      isPublic?: boolean;
      linkedinUrl?: string;
      bio?: string;
      currentRole?: string;
    };
    const uid = doc.id;

    const roles: Role[] =
      Array.isArray(p.roles) && p.roles.length > 0
        ? (p.roles.filter(Boolean) as Role[])
        : p.role
          ? [p.role]
          : [];

    // Ambassador projection (public read — the single source of truth for
    // ambassador-section content on this page).
    let ambassadorPublic: PublicAmbassadorDoc | null = null;
    if (roles.includes("ambassador") || roles.includes("alumni-ambassador")) {
      const ambSnap = await db
        .collection(PUBLIC_AMBASSADORS_COLLECTION)
        .doc(uid)
        .get();
      if (ambSnap.exists) {
        ambassadorPublic = { ...(ambSnap.data() as PublicAmbassadorDoc), uid };
      }
    }

    // Mentor section is visible only for accepted + public mentors (mirrors the
    // existing /mentorship/mentors/[username] gating).
    const mentorPublic =
      roles.includes("mentor") &&
      p.status === "accepted" &&
      p.isPublic !== false;

    return {
      uid,
      username: (p.username ?? username).toLowerCase(),
      displayName: p.displayName ?? username,
      photoURL: p.photoURL ?? "",
      roles,
      mentorPublic,
      ambassadorPublic,
      linkedinUrl: p.linkedinUrl,
      bio: p.bio,
      currentRole: p.currentRole,
    };
  } catch (error) {
    console.error("Error fetching public profile:", error);
    return null;
  }
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";
  const url = `${siteUrl}/u/${username}`;

  if (!profile) {
    return {
      title: "Profile Not Found | Code with Ahsan",
      description: "This profile is not available.",
      alternates: { canonical: url },
    };
  }

  const isAmbassador = profile.roles.includes("ambassador");
  const isAlumni = profile.roles.includes("alumni-ambassador");
  const badgeLabel = isAmbassador
    ? "Student Ambassador"
    : isAlumni
      ? "Alumni Ambassador"
      : profile.roles.includes("mentor")
        ? "Mentor"
        : "Member";

  const title = `${profile.displayName} (@${profile.username}) — ${badgeLabel} | Code with Ahsan`;
  const description =
    profile.bio ??
    profile.ambassadorPublic?.publicTagline ??
    `${profile.displayName} on Code with Ahsan.`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: "Code with Ahsan",
      type: "profile",
    },
    twitter: { card: "summary", title, description },
    robots: { index: true, follow: true },
  };
}

export default async function PublicProfilePage({ params }: PageProps) {
  const { username } = await params;
  const profile = await getPublicProfile(username);
  if (!profile) notFound();
  // Refuse to render if the profile exists but has no public-visible role —
  // prevents enumerating users by username.
  if (!profile.mentorPublic && !profile.ambassadorPublic) notFound();

  return <PublicProfileClient profile={profile} />;
}
