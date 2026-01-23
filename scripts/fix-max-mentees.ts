/**
 * Migration script to fix maxMentees count in existing mentor profiles.
 * Updates all mentor profiles where maxMentees is 0 or undefined to 1.
 * 
 * Run with: npx ts-node scripts/fix-max-mentees.ts
 */

import * as admin from "firebase-admin";

// Load service account for local development
const serviceAccount = require("../secure/code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();

async function fixMaxMentees() {
  console.log("Starting maxMentees migration...\n");

  const profilesRef = db.collection("mentorship_profiles");
  
  // Get all mentor profiles
  const snapshot = await profilesRef.where("role", "==", "mentor").get();

  if (snapshot.empty) {
    console.log("No mentor profiles found.");
    return;
  }

  console.log(`Found ${snapshot.size} mentor profiles.`);

  let updatedCount = 0;
  const batch = db.batch();

  snapshot.forEach((doc) => {
    const data = doc.data();
    // Check if maxMentees is 0, undefined, or null
    if (!data.maxMentees || data.maxMentees === 0) {
      console.log(`Updating ${doc.id} (${data.displayName || data.email}): maxMentees ${data.maxMentees ?? 'undefined'} -> 1`);
      batch.update(doc.ref, { maxMentees: 1 });
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    await batch.commit();
    console.log(`\n✅ Updated ${updatedCount} mentor profiles.`);
  } else {
    console.log("\n✅ No profiles needed updating.");
  }
}

fixMaxMentees()
  .then(() => {
    console.log("\nMigration complete.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration failed:", error);
    process.exit(1);
  });
