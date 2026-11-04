import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { requireAdminAccess } from "@/lib/adminAccess/server";

// ─────────────────────────────────────────────
// POST /api/admin/courses/generate-description
// Body: { courseName, chapters: string[] }
// ─────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const access = await requireAdminAccess(request, "courses.generateDescription");
  if (!access.ok) return access.response;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
  }

  let body: { courseName?: string; chapters?: string[] };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { courseName, chapters = [] } = body;
  if (!courseName) {
    return NextResponse.json({ error: "courseName is required" }, { status: 400 });
  }

  const chaptersContext =
    chapters.length > 0
      ? `\n\nThe course covers these topics:\n${chapters.map((ch, i) => `${i + 1}. ${ch}`).join("\n")}`
      : "";

  const prompt = `Write an SEO-optimized course description for "${courseName}".${chaptersContext}

Requirements:
- 2-3 sentences, concise and compelling
- Include relevant keywords naturally
- Focus on what the learner will gain
- Do not use quotes around the description
- Return ONLY the description text, no formatting or labels`;

  try {
    const genAI = new GoogleGenAI({ apiKey });
    const result = await genAI.models.generateContent({
      model: "gemini-flash-latest",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const description = result.text?.trim() || "";
    if (!description) {
      return NextResponse.json({ error: "Gemini returned empty response" }, { status: 500 });
    }

    return NextResponse.json({ description });
  } catch (error) {
    console.error("Gemini API error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate description";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
