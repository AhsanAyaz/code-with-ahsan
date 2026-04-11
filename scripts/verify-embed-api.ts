import "dotenv/config";
import { GoogleGenAI } from "@google/genai";

async function main() {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    console.error("GOOGLE_API_KEY not set in env");
    process.exit(1);
  }
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: "Angular mentor with frontend expertise",
      config: {
        taskType: "RETRIEVAL_DOCUMENT",
        outputDimensionality: 768,
      },
    });
    const dim = response.embeddings?.[0]?.values?.length;
    if (dim !== 768) {
      console.error(`FAIL: expected 768 dims, got ${dim}`);
      console.error(
        "Response shape:",
        JSON.stringify(response, null, 2).slice(0, 500)
      );
      process.exit(2);
    }
    console.log(
      `OK: gemini-embedding-001 returned ${dim} dimensions for outputDimensionality=768`
    );
  } catch (e) {
    console.error("FAIL: embedContent threw", e);
    process.exit(3);
  }
}

main();
