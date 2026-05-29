---
phase: tools-seo-indexability-uplift
plan: 03
title: Trim duplicated course suffix from Google ADK post titles
type: execute
wave: 2
depends_on: [01]   # not technical — just sequencing to keep PRs small after wave 1 ships
autonomous: true
files_modified:
  - src/content/courses/google-agent-development-kit-for-beginners/posts/*.mdx
  - src/content/courses.generated.json   # regenerated via prebuild
---

<objective>
Eight posts under `google-agent-development-kit-for-beginners` carry the full course name as a suffix inside the post title (e.g. `Building Your First AI Agent - Google Agent Development Kit for Beginners Part 1`). Page metadata then appends ` - <course name>` again, producing a 167–183 char effective SERP title that Google truncates with ellipsis ~70 chars in and visibly duplicates the course phrase.

Trim the redundant suffix in the mdx frontmatter so the effective SERP title is 25–70 chars. Keeps "Part N" so post identity stays clear.
</objective>

<context>
Audit baseline shows 8 posts in this course with `title` length 82–98 chars in the mdx frontmatter, producing effective SERP titles 164–183 chars after the page appends the course name.

Identified posts (from audit JSON):

| Slug | Current title | Proposed title |
|---|---|---|
| `building-your-first-ai-agent---google-agent-development-kit-for-beginners-part-1` | Building Your First AI Agent - Google Agent Development Kit for Beginners Part 1 | Building Your First AI Agent (Part 1) |
| `working-with-tools--function-calling---google-agent-development-kit-for-beginners-part-2` | Working with Tools / Function Calling - Google Agent Development Kit for Beginners Part 2 | Working with Tools & Function Calling (Part 2) |
| `using-multiple-ai-models-with-litellm---google-agent-development-kit-for-beginners-part-3` | Using Multiple AI Models with LiteLLM - Google Agent Development Kit for Beginners Part 3 | Using Multiple AI Models with LiteLLM (Part 3) |
| `using-structured-datastructured-output---google-agent-development-kit-for-beginners-part-4` | Using Structured Data / Structured Output - Google Agent Development Kit for Beginners Part 4 | Structured Output with Pydantic Schemas (Part 4) |
| `how-to-use-sessions--state-in-google-adk---google-agent-development-kit-for-beginners-part-5` | How to Use Sessions & State in Google ADK - Google Agent Development Kit for Beginners Part 5 | Sessions & State in Google ADK (Part 5) |
| `deploy-ai-agents-on-agent-engine-vertex-ai---google-agent-development-kit-for-beginners-part-6` | Deploy AI Agents on Agent Engine (Vertex AI) - Google Agent Development Kit for Beginners Part 6 | Deploy Agents to Vertex AI Agent Engine (Part 6) |
| `how-to-use-callbacks-in-google-adk--google-agent-development-kit-for-beginners-part-7` | How to Use Callbacks in Google ADK - Google Agent Development Kit for Beginners Part 7 | Callbacks in Google ADK (Part 7) |
| `build-ui-for-your-ai-agent-google-agent-development-kit-for-beginners-part-8` | Build UI for Your AI Agent - Google Agent Development Kit for Beginners Part 8 | Build a UI for Your AI Agent (Part 8) |

Slug is NOT changing (would break canonical URLs and lose Google's existing crawl history). Only the `title:` frontmatter line.
</context>

<tasks>

1. For each of the 8 mdx files, edit the `title:` frontmatter line to the proposed value above. Use `Edit` tool with the literal old line for safety.
2. Run `npm run content:build`.
3. Run `npm run audit:seo -- --top 5` — confirm none of these 8 posts appear in the bottom-5 anymore on the `title` criterion.

</tasks>

<verification>

1. `npm run audit:seo`: `summary.criteriaFails.title` drops by 8 (82 → 74).
2. Effective SERP title for each post is 50–70 chars after the page appends ` - <course name>`. (Course name is `Google Agent Development Kit for Beginners` = 42 chars, so post title can be up to ~25–28 chars and stay in band.)
3. The 8 posts still resolve at the same URL (slugs unchanged).
4. After deploy, GSC URL Inspection on one of these URLs shows the new title in the rendered page metadata.

</verification>
