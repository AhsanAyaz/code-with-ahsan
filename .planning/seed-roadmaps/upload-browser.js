/**
 * Browser-based Upload Script
 *
 * This runs directly in your browser console, so it automatically uses your logged-in session!
 *
 * HOW TO USE:
 * 1. Make sure you're logged in to the app
 * 2. Open this file and copy ALL the code
 * 3. Open browser console (F12 > Console tab)
 * 4. Paste the code and press Enter
 * 5. Watch it upload all roadmaps!
 */

(async function() {
  console.log('🚀 Starting roadmap upload...\n');

  const roadmaps = [
    {
      title: 'Web Development 2026: AI-Native Systems & Performance',
      description: 'Build intelligent web systems where AI is core infrastructure. Focus on performance (Core Web Vitals/INP), accessibility (EAA compliance), and edge computing.',
      domain: 'web-dev',
      difficulty: 'beginner',
      estimatedHours: 500,
      file: '01-web-development-2026.md'
    },
    {
      title: 'Frontend Development 2026: Resumability & AI-Generated UIs',
      description: 'Master React 19+, Next.js, and the TanStack ecosystem. Learn resumability patterns with Qwik and Astro, plus AI-powered UI generation with v0.',
      domain: 'frontend',
      difficulty: 'intermediate',
      estimatedHours: 500,
      file: '02-frontend-development-2026.md'
    },
    {
      title: 'Prompt Engineering 2026: From Art to Engineering',
      description: 'Master systematic prompt optimization with DSPy, LLM-as-a-judge evaluation, and PromptOps. Move from manual tweaking to programmatic optimization.',
      domain: 'prompt-engineering',
      difficulty: 'beginner',
      estimatedHours: 125,
      file: '03-prompt-engineering-2026.md'
    },
    {
      title: 'AI (Artificial Intelligence) 2026: Operationalization & Governance',
      description: 'Build production AI systems with RAG, governance frameworks, and multimodal capabilities. Focus on reliability, traceability, and cost optimization.',
      domain: 'ai',
      difficulty: 'intermediate',
      estimatedHours: 600,
      file: '04-ai-artificial-intelligence-2026.md'
    },
    {
      title: 'Backend Development 2026: Serverless, Security & AI Orchestration',
      description: 'Master backend with Python/Go/Rust, implement Zero-Trust security, manage vector databases, and orchestrate AI models at scale.',
      domain: 'backend',
      difficulty: 'intermediate',
      estimatedHours: 700,
      file: '05-backend-development-2026.md'
    },
    {
      title: 'Machine Learning 2026: Math-First Engineering & MLOps',
      description: 'Deep dive into ML with strong mathematical foundations. Master PyTorch, fine-tune LLMs, and implement production MLOps with drift detection.',
      domain: 'ml',
      difficulty: 'advanced',
      estimatedHours: 1000,
      file: '06-machine-learning-2026.md'
    },
    {
      title: 'MCP (Model Context Protocol) 2026: The USB-C for AI',
      description: 'Learn the industry standard for connecting AI models to data and tools. Build secure MCP servers with OAuth 2.1 and deploy enterprise gateways.',
      domain: 'mcp-servers',
      difficulty: 'intermediate',
      estimatedHours: 75,
      file: '07-mcp-model-context-protocol-2026.md'
    },
    {
      title: 'AI Agents 2026: Multi-Agent Orchestration & Autonomy',
      description: 'Build autonomous AI agent systems with LangGraph and CrewAI. Master multi-agent coordination, stateful workflows, and A2A protocol.',
      domain: 'ai-agents',
      difficulty: 'advanced',
      estimatedHours: 250,
      file: '08-ai-agents-2026.md'
    }
  ];

  const results = [];

  for (let i = 0; i < roadmaps.length; i++) {
    const roadmap = roadmaps[i];
    console.log(`[${i + 1}/${roadmaps.length}] Uploading: ${roadmap.title}`);

    try {
      // Fetch the markdown content
      const contentResponse = await fetch(`/.planning/seed-roadmaps/${roadmap.file}`);
      if (!contentResponse.ok) {
        throw new Error('Could not fetch roadmap file - you may need to upload manually');
      }
      const content = await contentResponse.text();

      // Create roadmap
      const createResponse = await fetch('/api/roadmaps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: roadmap.title,
          description: roadmap.description,
          domain: roadmap.domain,
          difficulty: roadmap.difficulty,
          estimatedHours: roadmap.estimatedHours,
          content: content,
          status: 'draft'
        }),
      });

      if (!createResponse.ok) {
        const error = await createResponse.text();
        throw new Error(`HTTP ${createResponse.status}: ${error}`);
      }

      const created = await createResponse.json();
      console.log(`  ✅ Created (ID: ${created.id})`);

      // Submit for review
      const submitResponse = await fetch(`/api/roadmaps/${created.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'submit' }),
      });

      if (submitResponse.ok) {
        console.log(`  ✅ Submitted for review\n`);
        results.push({ success: true, title: roadmap.title, id: created.id });
      } else {
        console.log(`  ⚠️  Created but not submitted (manual submit needed)\n`);
        results.push({ success: true, title: roadmap.title, id: created.id, needsSubmit: true });
      }

    } catch (error) {
      console.error(`  ❌ Error: ${error.message}\n`);
      results.push({ success: false, title: roadmap.title, error: error.message });
    }

    // Small delay
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Summary
  console.log('\n📊 Upload Summary\n==================');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`✅ Successful: ${successful.length}/${roadmaps.length}`);

  if (failed.length > 0) {
    console.log(`❌ Failed: ${failed.length}/${roadmaps.length}`);
    console.log('\nFailed uploads:');
    failed.forEach(r => console.log(`  - ${r.title}: ${r.error}`));
  }

  if (successful.length > 0) {
    console.log('\n✨ Next Steps:');
    console.log('  1. Go to /mentorship/admin');
    console.log('  2. Click "Roadmaps" tab');
    console.log('  3. Review and approve each roadmap');
  }

})();
