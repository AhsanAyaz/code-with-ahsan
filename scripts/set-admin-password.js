#!/usr/bin/env node

/**
 * Admin Password Setup Script
 * 
 * This script generates a bcrypt-hashed password and saves it to Firestore.
 * 
 * Usage:
 *   node scripts/set-admin-password.js <password>
 * 
 * Example:
 *   node scripts/set-admin-password.js MySecurePassword123!
 */

const bcrypt = require('bcryptjs');
const admin = require('firebase-admin');
const path = require('path');

// Try to load environment variables from .env.local
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv might not be installed, ignore
}

// Initialize Firebase Admin using the same approach as firebaseAdmin.ts
if (!admin.apps.length) {
  // Check for FIREBASE_SERVICE_ACCOUNT_KEY env var (JSON string)
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log('✓ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
  } 
  // Check for individual env vars
  else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
    });
    console.log('✓ Firebase Admin initialized with env credentials');
  }
  // Development: Load from local service account file
  else {
    try {
      const serviceAccountPath = path.join(__dirname, '..', 'secure', 'code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json');
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✓ Firebase Admin initialized with local service account');
    } catch (e) {
      console.error('✗ Failed to initialize Firebase Admin');
      console.error('  Could not load service account from secure/ folder');
      console.error('\n  Make sure you have one of:');
      console.error('    1. FIREBASE_SERVICE_ACCOUNT_KEY env variable');
      console.error('    2. FIREBASE_PRIVATE_KEY and FIREBASE_CLIENT_EMAIL env variables');
      console.error('    3. Service account JSON file in secure/ folder');
      process.exit(1);
    }
  }
}

const db = admin.firestore();

async function setAdminPassword(password) {
  if (!password || password.length < 8) {
    console.error('✗ Password must be at least 8 characters long');
    process.exit(1);
  }

  console.log('\n📝 Setting admin password...\n');

  // Generate bcrypt hash with cost factor of 12
  const saltRounds = 12;
  console.log(`  Generating bcrypt hash (cost factor: ${saltRounds})...`);
  
  const hash = await bcrypt.hash(password, saltRounds);
  
  console.log('  Hash generated successfully');
  console.log(`  Hash preview: ${hash.substring(0, 20)}...`);

  // Save to Firestore
  console.log('\n  Saving to Firestore (config/admin)...');
  
  await db.collection('config').doc('admin').set({
    passwordHash: hash,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    hashAlgorithm: 'bcrypt',
    costFactor: saltRounds,
  }, { merge: true });

  console.log('\n✓ Admin password has been set successfully!');
  console.log('\n⚠️  Important: Keep this password safe. You will need it to access the admin panel.');
  console.log('  To reset the password, run this script again with a new password.\n');
}

// Main execution
const password = process.argv[2];

if (!password) {
  console.log(`
Admin Password Setup Script
============================

Usage: node scripts/set-admin-password.js <password>

Example:
  node scripts/set-admin-password.js MySecurePassword123!

Requirements:
  - Password must be at least 8 characters
  - Firebase Admin credentials must be configured
`);
  process.exit(1);
}

setAdminPassword(password)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('\n✗ Error setting password:', error.message);
    process.exit(1);
  });
