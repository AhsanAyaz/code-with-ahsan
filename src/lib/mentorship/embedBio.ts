import { GoogleGenAI } from "@google/genai";

export const EMBEDDING_MODEL = "gemini-embedding-001";
export const EMBEDDING_DIM = 768;

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
