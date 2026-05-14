import "dotenv/config";
import { FieldValue } from "firebase-admin/firestore";
import {
  embedBio,
  extractBioText,
  shouldEmbedMentor,
} from "@/lib/mentorship/embedBio";

export { embedBio, extractBioText, shouldEmbedMentor };

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  // Lazy import so tests don't trigger Firebase Admin init
  const { db } = await import("@/lib/firebaseAdmin");

  const snapshot = await db
    .collection("mentorship_profiles")
    .where("roles", "array-contains", "mentor")
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
