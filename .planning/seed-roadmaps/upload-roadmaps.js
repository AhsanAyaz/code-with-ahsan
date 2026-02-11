#!/usr/bin/env node

/**
 * Upload Roadmaps Script
 *
 * Uploads all roadmaps from .planning/seed-roadmaps/ to the local API
 *
 * Usage:
 *   1. Get your auth token:
 *      - Open browser DevTools (F12)
 *      - Go to Application > Cookies
 *      - Copy the value of '__session' or 'next-auth.session-token'
 *
 *   2. Run script:
 *      AUTH_TOKEN=your-token-here node upload-roadmaps.js
 *
 *   Or set API_URL for non-local:
 *      API_URL=https://your-domain.com AUTH_TOKEN=token node upload-roadmaps.js
 */

const fs = require('fs');
const path = require('path');

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000';
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!AUTH_TOKEN) {
  console.error('❌ Error: AUTH_TOKEN environment variable is required');
  console.error('\nUsage:');
  console.error('  AUTH_TOKEN=your-token node upload-roadmaps.js');
  console.error('\nTo get your token:');
  console.error('  1. Login to your app');
  console.error('  2. Open DevTools (F12) > Application > Cookies');
  console.error('  3. Copy __session or next-auth.session-token value');
  process.exit(1);
}

// Domain mapping (filename prefix to RoadmapDomain enum)
const DOMAIN_MAP = {
  '01-web-development': 'web-dev',
  '02-frontend-development': 'frontend',
  '03-prompt-engineering': 'prompt-engineering',
  '04-ai-artificial-intelligence': 'ai',
  '05-backend-development': 'backend',
  '06-machine-learning': 'ml',
  '07-mcp-model-context-protocol': 'mcp-servers',
  '08-ai-agents': 'ai-agents',
};

// Difficulty mapping (based on roadmap content)
const DIFFICULTY_MAP = {
  '01-web-development': 'beginner',
  '02-frontend-development': 'intermediate',
  '03-prompt-engineering': 'beginner',
  '04-ai-artificial-intelligence': 'intermediate',
  '05-backend-development': 'intermediate',
  '06-machine-learning': 'advanced',
  '07-mcp-model-context-protocol': 'intermediate',
  '08-ai-agents': 'advanced',
};

// Estimated hours mapping (from README)
const HOURS_MAP = {
  '01-web-development': 500,
  '02-frontend-development': 500,
  '03-prompt-engineering': 125,
  '04-ai-artificial-intelligence': 600,
  '05-backend-development': 700,
  '06-machine-learning': 1000,
  '07-mcp-model-context-protocol': 75,
  '08-ai-agents': 250,
};

/**
 * Parse markdown file to extract metadata
 */
function parseRoadmap(filename, content) {
  const fileKey = filename.replace('.md', '');

  // Extract title (first H1)
  const titleMatch = content.match(/^# (.+)$/m);
  const title = titleMatch ? titleMatch[1] : 'Untitled Roadmap';

  // Extract description (first paragraph after title)
  const descMatch = content.match(/^# .+\n\n(.+?)(?=\n\n##)/s);
  const description = descMatch
    ? descMatch[1].trim().replace(/\*\*/g, '').substring(0, 500)
    : 'A comprehensive learning roadmap';

  return {
    title,
    description,
    domain: DOMAIN_MAP[fileKey] || 'web-dev',
    difficulty: DIFFICULTY_MAP[fileKey] || 'intermediate',
    estimatedHours: HOURS_MAP[fileKey] || 500,
    content: content,
  };
}

/**
 * Upload a single roadmap
 */
async function uploadRoadmap(roadmap, index, total) {
  console.log(`\n[${index}/${total}] Uploading: ${roadmap.title}`);
  console.log(`  Domain: ${roadmap.domain}, Difficulty: ${roadmap.difficulty}, Hours: ${roadmap.estimatedHours}`);

  try {
    // Step 1: Create as draft
    const createResponse = await fetch(`${API_URL}/api/roadmaps`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `__session=${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        ...roadmap,
        status: 'draft',
      }),
    });

    if (!createResponse.ok) {
      const error = await createResponse.text();
      throw new Error(`Failed to create: ${createResponse.status} ${error}`);
    }

    const created = await createResponse.json();
    console.log(`  ✅ Created as draft (ID: ${created.id})`);

    // Step 2: Submit for review
    const submitResponse = await fetch(`${API_URL}/api/roadmaps/${created.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': `__session=${AUTH_TOKEN}`,
      },
      body: JSON.stringify({
        action: 'submit',
      }),
    });

    if (!submitResponse.ok) {
      const error = await submitResponse.text();
      console.warn(`  ⚠️  Could not submit for review: ${submitResponse.status} ${error}`);
      console.log(`  ℹ️  Roadmap saved as draft, you can submit manually`);
      return { success: true, id: created.id, status: 'draft' };
    }

    console.log(`  ✅ Submitted for review (status: pending)`);
    return { success: true, id: created.id, status: 'pending' };

  } catch (error) {
    console.error(`  ❌ Error: ${error.message}`);
    return { success: false, error: error.message };
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Roadmap Upload Script');
  console.log('========================\n');
  console.log(`API URL: ${API_URL}`);
  console.log(`Auth token: ${AUTH_TOKEN.substring(0, 20)}...`);

  // Read all markdown files
  const roadmapsDir = __dirname;
  const files = fs.readdirSync(roadmapsDir)
    .filter(f => f.match(/^\d{2}-.+\.md$/))
    .sort();

  if (files.length === 0) {
    console.error('❌ No roadmap files found');
    process.exit(1);
  }

  console.log(`\nFound ${files.length} roadmaps to upload\n`);

  const results = [];

  // Upload each roadmap
  for (let i = 0; i < files.length; i++) {
    const filename = files[i];
    const filepath = path.join(roadmapsDir, filename);
    const content = fs.readFileSync(filepath, 'utf-8');
    const roadmap = parseRoadmap(filename, content);

    const result = await uploadRoadmap(roadmap, i + 1, files.length);
    results.push({ filename, ...result });

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n\n📊 Upload Summary');
  console.log('==================\n');

  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${results.length}`);
  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}/${results.length}`);
    console.log('\nFailed uploads:');
    failed.forEach(r => {
      console.log(`  - ${r.filename}: ${r.error}`);
    });
  }

  if (successful.length > 0) {
    console.log('\n✨ Next Steps:');
    console.log('  1. Go to /mentorship/admin');
    console.log('  2. Click "Roadmaps" tab');
    console.log('  3. Review and approve each roadmap');
    console.log('  4. Roadmaps will appear at /roadmaps');
  }

  process.exit(failed.length > 0 ? 1 : 0);
}

// Run
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
