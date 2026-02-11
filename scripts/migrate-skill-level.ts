/**
 * Migration script to add skillLevel field to existing mentorship profiles
 *
 * Run with: npx tsx scripts/migrate-skill-level.ts
 *
 * Sets all existing profiles to skillLevel: "beginner" (default)
 */

import * as admin from "firebase-admin";

// Load service account for local development
const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function migrateSkillLevel() {
  console.log("Starting skillLevel migration...\n");

  try {
    // Get all mentorship profiles
    const profilesSnapshot = await db.collection("mentorship_profiles").get();

    console.log(`Found ${profilesSnapshot.size} profiles to migrate\n`);

    const batch = db.batch();
    let updateCount = 0;
    let skipCount = 0;

    profilesSnapshot.docs.forEach((doc) => {
      const data = doc.data();

      // Only update if skillLevel doesn't exist
      if (!data.skillLevel) {
        batch.update(doc.ref, {
          skillLevel: "beginner",
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        updateCount++;
        console.log(`✓ Queued update for: ${data.displayName || doc.id} (${data.role})`);
      } else {
        skipCount++;
        console.log(`- Skipped (already has skillLevel): ${data.displayName || doc.id}`);
      }
    });

    // Commit the batch
    if (updateCount > 0) {
      await batch.commit();
      console.log(`\n✅ Successfully updated ${updateCount} profiles`);
    } else {
      console.log("\n✅ No profiles needed updating");
    }

    if (skipCount > 0) {
      console.log(`ℹ️  Skipped ${skipCount} profiles (already had skillLevel)`);
    }

    console.log("\nMigration complete!");
  } catch (error) {
    console.error("❌ Migration failed:", error);
    process.exit(1);
  }

  process.exit(0);
}

// Run migration
migrateSkillLevel();
