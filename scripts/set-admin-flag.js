#!/usr/bin/env node

/**
 * Set Admin Flag Script
 *
 * Sets isAdmin: true on a user's mentorship_profiles document
 *
 * Usage:
 *   node scripts/set-admin-flag.js <email>
 *
 * Example:
 *   node scripts/set-admin-flag.js ahsan.ayaz@codewithahsan.dev
 */

const admin = require('firebase-admin');
const path = require('path');

// Try to load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv might not be installed, ignore
}

// Initialize Firebase Admin
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✓ Firebase Admin initialized with env credentials');
  } else {
    try {
      const serviceAccountPath = path.join(__dirname, '..', 'secure', 'code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json');
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✓ Firebase Admin initialized with local service account');
    } catch (e) {
      console.error('✗ Failed to initialize Firebase Admin');
      console.error('  Could not load service account');
      process.exit(1);
    }
  }
}

const db = admin.firestore();

async function setAdminFlag(email) {
  console.log(`\n📝 Setting admin flag for: ${email}\n`);

  // Get user by email
  let user;
  try {
    user = await admin.auth().getUserByEmail(email);
    console.log(`  ✓ Found user: ${user.uid}`);
  } catch (error) {
    console.error(`  ✗ User not found: ${email}`);
    process.exit(1);
  }

  // Update mentorship_profiles document
  const profileRef = db.collection('mentorship_profiles').doc(user.uid);
  const profileDoc = await profileRef.get();

  if (!profileDoc.exists) {
    console.error(`  ✗ Profile document not found for user: ${user.uid}`);
    console.error('    User must have a mentorship profile first');
    process.exit(1);
  }

  await profileRef.update({
    isAdmin: true,
    adminUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });

  console.log(`  ✓ Set isAdmin: true`);
  console.log(`\n✓ Success! User ${email} is now an admin.\n`);
  console.log('  They can now:');
  console.log('    - Approve/decline projects');
  console.log('    - Approve/decline roadmaps');
  console.log('    - Manage mentorship profiles\n');
}

// Main execution
const email = process.argv[2];

if (!email) {
  console.log(`
Set Admin Flag Script
======================

Usage: node scripts/set-admin-flag.js <email>

Example:
  node scripts/set-admin-flag.js ahsan.ayaz@codewithahsan.dev

This will set isAdmin: true on the user's mentorship_profiles document.
`);
  process.exit(1);
}

setAdminFlag(email)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n✗ Error:', error.message);
    process.exit(1);
  });
