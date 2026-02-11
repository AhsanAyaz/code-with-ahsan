import { Metadata } from "next";
import { db } from "@/lib/firebaseAdmin";

interface Props {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  try {
    const projectDoc = await db.collection("projects").doc(id).get();

    if (!projectDoc.exists) {
      return {
        title: "Project Not Found | Code With Ahsan",
      };
    }

    const project = projectDoc.data();
    const title = project?.title || "Untitled Project";
    const description = project?.description
      ? project.description.substring(0, 160) +
        (project.description.length > 160 ? "..." : "")
      : "Collaborative project on Code With Ahsan";
    const siteUrl =
      process.env.NEXT_PUBLIC_SITE_URL || "https://codewithahsan.dev";

    return {
      title: `${title} | Code With Ahsan Projects`,
      description,
      keywords: project?.techStack || [],
      openGraph: {
        title,
        description,
        type: "website",
        url: `${siteUrl}/projects/${id}`,
        siteName: "Code With Ahsan",
      },
      twitter: {
        card: "summary",
        title,
        description,
      },
    };
  } catch (error) {
    console.error("Error generating metadata:", error);
    return {
      title: "Project | Code With Ahsan",
    };
  }
}

export default function ProjectDetailLayout({ children }: Props) {
  return <>{children}</>;
}
