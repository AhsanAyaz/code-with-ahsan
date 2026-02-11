#!/usr/bin/env node

/**
 * Upload Roadmaps Script
 *
 * Uploads seed roadmaps to Firestore using Firebase Admin SDK
 *
 * Usage:
 *   node scripts/upload-roadmaps.js
 *
 * Environment:
 *   Requires Firebase Admin credentials (same as other scripts)
 */

const fs = require('fs');
const path = require('path');
const admin = require('firebase-admin');

// Load environment variables
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
} catch (e) {
  // dotenv might not be installed, ignore
}

// Initialize Firebase Admin (same pattern as set-admin-password.js)
if (!admin.apps.length) {
  if (process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY);
    if (serviceAccount.private_key) {
      serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');
    }
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('✓ Firebase Admin initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
  } else if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    });
    console.log('✓ Firebase Admin initialized with env credentials');
  } else {
    try {
      const serviceAccountPath = path.join(__dirname, '..', 'secure', 'code-with-ahsan-45496-firebase-adminsdk-7axo0-3127308aba.json');
      const serviceAccount = require(serviceAccountPath);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || `${serviceAccount.project_id}.appspot.com`,
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
const bucket = admin.storage().bucket();

// Roadmap configuration
const ROADMAPS = [
  {
    filename: '01-web-development-2026.md',
    title: 'Web Development 2026: AI-Native Systems & Performance',
    description: 'Build intelligent web systems where AI is core infrastructure. Focus on performance (Core Web Vitals/INP), accessibility (EAA compliance), and edge computing.',
    domain: 'web-dev',
    difficulty: 'beginner',
    estimatedHours: 500,
  },
  {
    filename: '02-frontend-development-2026.md',
    title: 'Frontend Development 2026: Resumability & AI-Generated UIs',
    description: 'Master React 19+, Next.js, and the TanStack ecosystem. Learn resumability patterns with Qwik and Astro, plus AI-powered UI generation with v0.',
    domain: 'frontend',
    difficulty: 'intermediate',
    estimatedHours: 500,
  },
  {
    filename: '03-prompt-engineering-2026.md',
    title: 'Prompt Engineering 2026: From Art to Engineering',
    description: 'Master systematic prompt optimization with DSPy, LLM-as-a-judge evaluation, and PromptOps. Move from manual tweaking to programmatic optimization.',
    domain: 'prompt-engineering',
    difficulty: 'beginner',
    estimatedHours: 125,
  },
  {
    filename: '04-ai-artificial-intelligence-2026.md',
    title: 'AI (Artificial Intelligence) 2026: Operationalization & Governance',
    description: 'Build production AI systems with RAG, governance frameworks, and multimodal capabilities. Focus on reliability, traceability, and cost optimization.',
    domain: 'ai',
    difficulty: 'intermediate',
    estimatedHours: 600,
  },
  {
    filename: '05-backend-development-2026.md',
    title: 'Backend Development 2026: Serverless, Security & AI Orchestration',
    description: 'Master backend with Python/Go/Rust, implement Zero-Trust security, manage vector databases, and orchestrate AI models at scale.',
    domain: 'backend',
    difficulty: 'intermediate',
    estimatedHours: 700,
  },
  {
    filename: '06-machine-learning-2026.md',
    title: 'Machine Learning 2026: Math-First Engineering & MLOps',
    description: 'Deep dive into ML with strong mathematical foundations. Master PyTorch, fine-tune LLMs, and implement production MLOps with drift detection.',
    domain: 'ml',
    difficulty: 'advanced',
    estimatedHours: 1000,
  },
  {
    filename: '07-mcp-model-context-protocol-2026.md',
    title: 'MCP (Model Context Protocol) 2026: The USB-C for AI',
    description: 'Learn the industry standard for connecting AI models to data and tools. Build secure MCP servers with OAuth 2.1 and deploy enterprise gateways.',
    domain: 'mcp-servers',
    difficulty: 'intermediate',
    estimatedHours: 75,
  },
  {
    filename: '08-ai-agents-2026.md',
    title: 'AI Agents 2026: Multi-Agent Orchestration & Autonomy',
    description: 'Build autonomous AI agent systems with LangGraph and CrewAI. Master multi-agent coordination, stateful workflows, and A2A protocol.',
    domain: 'ai-agents',
    difficulty: 'advanced',
    estimatedHours: 250,
  },
];

// Sanitize markdown (from backend sanitization logic)
function sanitizeMarkdownRaw(markdown) {
  return markdown
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '');
}

/**
 * Upload roadmap content to Firebase Storage
 */
async function uploadToStorage(roadmapId, content) {
  const filename = `roadmaps/${roadmapId}/content.md`;
  const file = bucket.file(filename);

  await file.save(content, {
    metadata: {
      contentType: 'text/markdown',
      metadata: {
        uploadedBy: 'seed-script',
        uploadedAt: new Date().toISOString(),
      },
    },
  });

  await file.makePublic();
  return `https://storage.googleapis.com/${bucket.name}/${filename}`;
}

/**
 * Upload a single roadmap
 */
async function uploadRoadmap(roadmap, userId, index, total) {
  console.log(`\n[${index}/${total}] Uploading: ${roadmap.title}`);
  console.log(`  Domain: ${roadmap.domain}, Difficulty: ${roadmap.difficulty}, Hours: ${roadmap.estimatedHours}`);

  try {
    // Read markdown content
    const filepath = path.join(__dirname, '..', '.planning', 'seed-roadmaps', roadmap.filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const sanitizedContent = sanitizeMarkdownRaw(content);

    // Create roadmap document (draft)
    const roadmapRef = db.collection('roadmaps').doc();
    const roadmapId = roadmapRef.id;

    // Upload content to Storage
    console.log('  → Uploading content to Storage...');
    const contentUrl = await uploadToStorage(roadmapId, sanitizedContent);
    console.log('  ✓ Content uploaded');

    // Create Firestore document
    console.log('  → Creating Firestore document...');
    const now = admin.firestore.Timestamp.now();

    await roadmapRef.set({
      title: roadmap.title,
      description: roadmap.description,
      domain: roadmap.domain,
      difficulty: roadmap.difficulty,
      estimatedHours: roadmap.estimatedHours,
      contentUrl: contentUrl,
      status: 'pending', // Set to pending for admin approval
      version: 1,
      createdAt: now,
      updatedAt: now,
      creatorId: userId,
      creatorProfile: {
        displayName: 'Ahsan Ayaz',
        photoURL: null,
        username: 'admin',
      },
    });

    console.log(`  ✓ Created (ID: ${roadmapId}, status: pending)`);
    return { success: true, id: roadmapId };

  } catch (error) {
    console.error(`  ✗ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Get or create admin user
 */
async function getAdminUserId() {
  // Try to find admin user by email
  const adminEmail = process.env.ADMIN_EMAIL || 'ahsan.ayaz@codewithahsan.dev';

  try {
    const user = await admin.auth().getUserByEmail(adminEmail);
    console.log(`✓ Found admin user: ${user.uid}`);
    return user.uid;
  } catch (error) {
    console.error('✗ Could not find admin user');
    console.error('  Please set ADMIN_EMAIL env variable to your admin email');
    process.exit(1);
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Roadmap Upload Script');
  console.log('========================\n');

  // Get admin user ID
  const userId = await getAdminUserId();

  console.log(`\nFound ${ROADMAPS.length} roadmaps to upload\n`);

  const results = [];

  // Upload each roadmap
  for (let i = 0; i < ROADMAPS.length; i++) {
    const result = await uploadRoadmap(ROADMAPS[i], userId, i + 1, ROADMAPS.length);
    results.push({ ...ROADMAPS[i], ...result });

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n📊 Upload Summary');
  console.log('==================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✓ Successful: ${successful.length}/${results.length}`);

  if (failed.length > 0) {
    console.log(`✗ Failed: ${failed.length}/${results.length}`);
    console.log('\nFailed uploads:');
    failed.forEach(r => {
      console.log(`  - ${r.title}: ${r.error}`);
    });
  }

  if (successful.length > 0) {
    console.log('\n✨ Next Steps:');
    console.log('  1. Go to http://localhost:3000/mentorship/admin');
    console.log('  2. Click "Roadmaps" tab');
    console.log('  3. Review and approve each roadmap');
    console.log('  4. Roadmaps will appear at http://localhost:3000/roadmaps');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('\n✗ Fatal error:', error);
  process.exit(1);
});
