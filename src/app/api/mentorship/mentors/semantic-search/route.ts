import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";

const EMBEDDING_MODEL = "gemini-embedding-001";
const EMBEDDING_DIM = 768;
const PUBLIC_BASE_URL = "https://codewithahsan.dev";

let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

async function embedQuery(text: string): Promise<number[]> {
  const response = await getAI().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: "RETRIEVAL_QUERY",
      outputDimensionality: EMBEDDING_DIM,
    },
  });
  return response.embeddings![0].values!;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  if (!q) {
    return NextResponse.json(
      { error: "Missing q parameter" },
      { status: 400 }
    );
  }

  try {
    const queryVector = await embedQuery(q);

    // Pre-filter + vector query. If this throws "FAILED_PRECONDITION" or
    // similar index error, fall back to wider scan + JS post-filter.
    let snapshot;
    try {
      const vectorQuery = db
        .collection("mentorship_profiles")
        .where("role", "==", "mentor")
        .where("status", "==", "accepted")
        .findNearest({
          vectorField: "bioEmbedding",
          queryVector: FieldValue.vector(queryVector),
          limit: 10,
          distanceMeasure: "COSINE",
          distanceResultField: "vector_distance",
        });
      snapshot = await vectorQuery.get();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes("FAILED_PRECONDITION") || msg.includes("requires an index")) {
        // Fallback: pre-filter by role only, post-filter status in JS
        const fallbackQuery = db
          .collection("mentorship_profiles")
          .where("role", "==", "mentor")
          .findNearest({
            vectorField: "bioEmbedding",
            queryVector: FieldValue.vector(queryVector),
            limit: 25,
            distanceMeasure: "COSINE",
            distanceResultField: "vector_distance",
          });
        snapshot = await fallbackQuery.get();
      } else {
        throw err;
      }
    }

    const mentors = snapshot.docs
      .map((doc) => {
        const d = doc.data();
        if (d.status !== "accepted") return null; // post-filter
        const bio: string = (d.bio as string) || (d.about as string) || "";
        const username: string | undefined = d.username as string;
        const activeMenteeCount = (d.activeMenteeCount as number) || 0;
        const maxMentees = (d.maxMentees as number) || 0;
        const isAtCapacity = (d.isAtCapacity as boolean) || false;
        return {
          name: (d.displayName as string) || username || "Unknown",
          username: username || null,
          url: username ? `${PUBLIC_BASE_URL}/mentors/${username}` : null,
          expertise: (d.expertise as string[]) || [],
          availability: isAtCapacity
            ? "At capacity"
            : `Accepting mentees (${activeMenteeCount}/${maxMentees} slots used)`,
          rating: (d.avgRating as number) || null,
          completed_sessions: (d.completedMentorships as number) || 0,
          bio_excerpt: bio.slice(0, 300),
          match_score: (doc.get("vector_distance") as number) ?? null,
        };
      })
      .filter((m): m is NonNullable<typeof m> => m !== null);

    return NextResponse.json({ mentors }, { status: 200 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[semantic-search] error:", msg);
    return NextResponse.json(
      { error: `Semantic search failed: ${msg}` },
      { status: 500 }
    );
  }
}
