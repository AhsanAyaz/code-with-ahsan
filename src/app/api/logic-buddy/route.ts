import { GoogleGenAI, Type } from "@google/genai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { prompt, image, problemContext, history, mode } = await req.json();

    const genAI = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
    });

    // Mode: Generate a new problem (Bonus)
    if (mode === "generate-problem") {
      const result = await genAI.models.generateContent({
        model: "gemini-flash-latest",
        contents: [
          {
            role: "user",
            parts: [
              {
                text: "Generate a unique, random logic building problem for a developer. Return ONLY a valid JSON object with 'title' and 'description' fields. Do not include markdown formatting or extra text.",
              },
            ],
          },
        ],
      });
      const text =
        result.text || result.candidates?.[0]?.content?.parts?.[0]?.text || "";
      // Cleanup markdown code blocks if present (common with LLMs)
      const jsonStr = text
        .replace(/```json/g, "")
        .replace(/```/g, "")
        .trim();
      return NextResponse.json({ result: jsonStr });
    }

    // Mode: Chat/Assessment
    const systemInstruction = `You are an awesome technical lead of JavaScript, and an amazing mentor.
You'll help me build my programming logic by asking questions, and expecting psuedo code/flow chart/answers from me. They could be in text, or an image.
Gamify the experience. If the user gives a good answer, praise them.
Evaluate the correctness on a scale of 1 to 100.
If the response is correct, be very enthusiastic!

IMPORTANT: Provide detailed, helpful feedback in Markdown format.
- Use bolding for emphasis.
- Use code blocks for examples.
- Explain the "why" behind your evaluation.
- If the logic is incorrect, guide them gently towards the right solution without giving it away immediately.
- If the logic is correct, suggest a small optimization or "pro tip" to take it to the next level.

If the user provides an image, analyze it for logic flow (flowcharts, diagrams) or code snippets.

${
  problemContext
    ? `CURRENT PROBLEM CONTEXT: "${problemContext.title}"
DESCRIPTION: "${problemContext.description}"
User is proposing a solution to this specific problem. Evaluate their approach.
`
    : ""
}`;

    const contents = [];

    // Add History
    if (history && Array.isArray(history)) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      history.forEach((msg: any) => {
        contents.push({
          role: msg.role === "user" ? "user" : "model",
          parts: [{ text: msg.content }],
        });
      });
    }

    // Add Current Prompt
    if (image) {
      const base64Data = image.split(",")[1] || image;
      const mediaType = image.split(";")[0].split(":")[1] || "image/jpeg";

      contents.push({
        role: "user",
        parts: [
          {
            text:
              prompt ||
              `Evaluate my solution for: ${problemContext?.title || "this logic problem"}`,
          },
          { inlineData: { mimeType: mediaType, data: base64Data } },
        ],
      });
    } else {
      contents.push({
        role: "user",
        parts: [{ text: prompt || "Continue." }],
      });
    }

    const response = await genAI.models.generateContent({
      model: "gemini-flash-latest",
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["isLogicCorrect", "response", "score"],
          properties: {
            isLogicCorrect: {
              type: Type.BOOLEAN,
            },
            score: {
              type: Type.INTEGER,
            },
            response: {
              type: Type.STRING,
            },
          },
        },
        systemInstruction: {
          parts: [{ text: systemInstruction }],
        },
      },
      contents,
    });

    const text =
      response.text ||
      response.candidates?.[0]?.content?.parts?.[0]?.text ||
      "{}";

    return NextResponse.json({ result: text }); // Returns JSON string { isLogicCorrect, response }
  } catch (error) {
    console.error("Error generating logic advice:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
