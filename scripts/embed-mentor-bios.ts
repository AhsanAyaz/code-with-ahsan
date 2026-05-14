import "dotenv/config";
import { GoogleGenAI } from "@google/genai";
import { FieldValue } from "firebase-admin/firestore";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;

// Lazily-initialized AI client so tests can import helpers without GOOGLE_API_KEY
let _ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!_ai) {
    const apiKey = process.env.GOOGLE_API_KEY;
    if (!apiKey) throw new Error("GOOGLE_API_KEY not set");
    _ai = new GoogleGenAI({ apiKey });
  }
  return _ai;
}

export function extractBioText(profile: Record<string, unknown>): string {
  const bio = (profile.bio as string | undefined) ?? "";
  const about = (profile.about as string | undefined) ?? "";
  return (bio || about).trim();
}

export function shouldEmbedMentor(profile: Record<string, unknown>): boolean {
  return (
    profile.role === "mentor" &&
    profile.status === "accepted" &&
    extractBioText(profile).length > 0
  );
}

export async function embedBio(text: string): Promise<number[]> {
  const response = await getAI().models.embedContent({
    model: EMBEDDING_MODEL,
    contents: text,
    config: {
      taskType: "RETRIEVAL_DOCUMENT",
      outputDimensionality: EMBEDDING_DIM,
    },
  });
  const values = response.embeddings?.[0]?.values;
  if (!values || values.length !== EMBEDDING_DIM) {
    throw new Error(
      `Expected ${EMBEDDING_DIM}-dim embedding, got ${values?.length ?? "undefined"}`
    );
  }
  return values;
}

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  // Lazy import so tests don't trigger Firebase Admin init
  const { db } = await import("@/lib/firebaseAdmin");

  const snapshot = await db
    .collection("mentorship_profiles")
    .where("role", "==", "mentor")
    .where("status", "==", "accepted")
    .get();

  const eligible = snapshot.docs.filter((d) => shouldEmbedMentor(d.data()));
  console.log(
    `Found ${snapshot.size} accepted mentors; ${eligible.length} have bio text.${dryRun ? " (DRY RUN)" : ""}`
  );

  for (const doc of eligible) {
    const data = doc.data();
    const bioText = extractBioText(data);
    const label = (data.displayName as string) || (data.username as string) || doc.id;

    if (dryRun) {
      console.log(`  - ${label} (${bioText.length} chars)`);
      continue;
    }

    try {
      const embedding = await embedBio(bioText);
      await doc.ref.update({
        bioEmbedding: FieldValue.vector(embedding),
        bioEmbeddingGeneratedAt: FieldValue.serverTimestamp(),
      });
      console.log(`  Embedded ${label} (${embedding.length} dims)`);
    } catch (err) {
      console.error(`  Failed to embed ${label}:`, err);
    }
  }

  console.log("Done.");
  process.exit(0);
}

// Only run main when executed directly (not when imported by tests)
// Works with both tsx/ts-node and compiled JS
const isMain =
  typeof require !== "undefined"
    ? require.main === module
    : import.meta.url === `file://${process.argv[1]}`;

if (isMain) {
  main().catch((e) => {
    console.error("Fatal:", e);
    process.exit(1);
  });
}
