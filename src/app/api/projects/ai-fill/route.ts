import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/firebaseAdmin";
import { verifyAuth } from "@/lib/auth";
import { FieldValue } from "firebase-admin/firestore";

const AI_FILL_DAILY_LIMIT = 3;

export async function POST(req: NextRequest) {
  const authResult = await verifyAuth(req);
  if (!authResult) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const { title } = await req.json();

  if (!title || typeof title !== "string" || title.trim().length < 3) {
    return NextResponse.json(
      { error: "Title must be at least 3 characters to generate content" },
      { status: 400 }
    );
  }

  // Rate limit: 3 per day per user
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const usageRef = db.collection("aiUsage").doc(`${authResult.uid}_${today}`);

  const usageSnap = await usageRef.get();
  const usageData = usageSnap.exists ? usageSnap.data() : null;
  const currentCount: number = usageData?.projectFillCount ?? 0;

  if (currentCount >= AI_FILL_DAILY_LIMIT) {
    return NextResponse.json(
      { error: "Daily AI fill limit reached (3 per day). Try again tomorrow." },
      { status: 429 }
    );
  }

  const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const response = await genAI.models.generateContent({
    model: "gemini-flash-latest",
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        required: ["description", "techStack", "difficulty", "maxTeamSize"],
        properties: {
          description: {
            type: Type.STRING,
            description:
              "A detailed project description (100-500 words) covering goals, deliverables, and learning outcomes.",
          },
          techStack: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of technologies/frameworks relevant to the project (3-6 items).",
          },
          difficulty: {
            type: Type.STRING,
            description: "One of: beginner, intermediate, advanced",
          },
          maxTeamSize: {
            type: Type.INTEGER,
            description: "Recommended team size between 2 and 8.",
          },
        },
      },
      systemInstruction: {
        parts: [
          {
            text: `You are a helpful assistant for a developer community platform.
Given a project title or brief description, generate a professional project description and metadata.
- description: engaging, clear, covering goals and expected outcomes (100-500 chars)
- techStack: realistic technologies for the described project
- difficulty: one of "beginner", "intermediate", or "advanced"
- maxTeamSize: between 2 and 8`,
          },
        ],
      },
    },
    contents: [
      {
        role: "user",
        parts: [{ text: `Project title/brief: "${title.trim()}"` }],
      },
    ],
  });

  const raw = response.text || response.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
  let result: Record<string, unknown>;
  try {
    result = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "Failed to parse AI response" }, { status: 500 });
  }

  // Increment usage count
  if (usageSnap.exists) {
    await usageRef.update({ projectFillCount: FieldValue.increment(1) });
  } else {
    await usageRef.set({ projectFillCount: 1, uid: authResult.uid, date: today });
  }

  return NextResponse.json({
    ...result,
    usesLeft: AI_FILL_DAILY_LIMIT - currentCount - 1,
  });
}
