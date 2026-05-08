#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

const root = process.cwd();
const eventsRoot = path.join(root, 'src/content/events');
const outputPath = path.join(root, 'src/content/events.generated.json');

const REQUIRED_FIELDS = ['slug', 'title', 'description', 'type', 'date', 'status'];

function listDirs(dir) {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => path.join(dir, d.name));
}

function parseMdxFile(filePath) {
  const source = fs.readFileSync(filePath, 'utf8');
  const parsed = matter(source);
  return {
    data: parsed.data || {},
    content: parsed.content || '',
  };
}

function buildEvent(eventDir) {
  const eventFile = path.join(eventDir, 'event.mdx');
  if (!fs.existsSync(eventFile)) {
    console.warn(`[build-events-index] Skipping ${eventDir} — no event.mdx found`);
    return null;
  }

  const { data, content } = parseMdxFile(eventFile);

  for (const field of REQUIRED_FIELDS) {
    if (!data[field]) {
      throw new Error(
        `[build-events-index] Missing required field "${field}" in ${eventFile}`
      );
    }
  }

  return {
    slug: data.slug,
    title: data.title,
    description: data.description,
    type: data.type,
    date: data.date,
    endDate: data.endDate || null,
    location: data.location || null,
    speaker: data.speaker || null,
    bannerImage: data.bannerImage || null,
    dedicatedRoute: data.dedicatedRoute || null,
    isVisible: data.isVisible !== false,
    status: data.status,
    visibilityOrder: typeof data.visibilityOrder === 'number' ? data.visibilityOrder : 0,
    body: content,
  };
}

function main() {
  const eventDirs = listDirs(eventsRoot);
  const events = eventDirs
    .map(buildEvent)
    .filter((event) => event !== null);

  // Sort by date DESC (newest first), then visibilityOrder DESC as tie-breaker
  events.sort((a, b) => {
    const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime();
    if (dateDiff !== 0) return dateDiff;
    return b.visibilityOrder - a.visibilityOrder;
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    source: 'mdx',
    count: events.length,
    events,
  };

  fs.writeFileSync(outputPath, JSON.stringify(payload, null, 2) + '\n', 'utf8');
  console.log(`Wrote ${outputPath} (${events.length} events)`);
}

main();
