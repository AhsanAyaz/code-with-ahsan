#!/usr/bin/env node
/**
 * Ghost weekly-digest cleanup.
 *
 * Weekly digests are thin, email-first posts. Published to the web they dilute
 * site quality and cause "Crawled - currently not indexed" in GSC. This script
 * finds them and removes them from the web (keeps the already-sent emails).
 *
 * SAFE BY DEFAULT: dry run. Nothing is mutated unless you pass --apply --yes.
 *
 * Usage:
 *   node scripts/ghost-digest-cleanup.mjs                 # dry run, list candidates
 *   node scripts/ghost-digest-cleanup.mjs --all           # dry run, list ALL published posts (learn the naming)
 *   node scripts/ghost-digest-cleanup.mjs --tag digest    # match by tag slug instead of title regex
 *   node scripts/ghost-digest-cleanup.mjs --apply --yes   # unpublish (set to draft) the matched digests
 *   node scripts/ghost-digest-cleanup.mjs --noindex --apply --yes  # instead of unpublish, add noindex meta
 *
 * Reads GHOST_ADMIN_API_KEY + GHOST_ADMIN_URL from .env.local (or .env).
 */
import GhostAdminAPI from "@tryghost/admin-api";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// --- load env from .env.local / .env (no dependency) ---
function loadEnv() {
  for (const file of [".env.local", ".env"]) {
    const p = resolve(process.cwd(), file);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) {
        process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
      }
    }
  }
}
loadEnv();

const args = process.argv.slice(2);
const flag = (n) => args.includes(n);
const opt = (n) => {
  const i = args.indexOf(n);
  return i >= 0 ? args[i + 1] : null;
};

const APPLY = flag("--apply");
const YES = flag("--yes");
const LIST_ALL = flag("--all");
const NOINDEX = flag("--noindex");
const DUPES = flag("--dupes"); // find/unpublish same-title duplicates instead of digests
const DELETE = flag("--delete"); // DELETE (permanent) draft digests instead of unpublishing
const STATUS = DELETE ? "draft" : "published"; // delete mode operates on drafts

const normTitle = (t) => (t || "").toLowerCase().replace(/\s+/g, " ").trim();
// keeper = the canonical original: prefer a slug NOT ending in -<n>, then earliest published
function pickKeeper(group) {
  return [...group].sort((a, b) => {
    const aDup = /-\d+$/.test(a.slug) ? 1 : 0;
    const bDup = /-\d+$/.test(b.slug) ? 1 : 0;
    if (aDup !== bDup) return aDup - bDup;
    return new Date(a.published_at) - new Date(b.published_at);
  })[0];
}
const TAG = opt("--tag"); // match by tag slug, e.g. "digest"
// title patterns that mark a weekly digest — tune after a dry run
const TITLE_RE = /weekly digest/i;

const key = process.env.GHOST_ADMIN_API_KEY;
const url = process.env.GHOST_ADMIN_URL || "https://blog.codewithahsan.dev";
if (!key) {
  console.error("GHOST_ADMIN_API_KEY not set in .env.local/.env. Aborting.");
  process.exit(1);
}
const api = new GhostAdminAPI({ url, key, version: "v5.0" });

function isDigest(post) {
  if (TAG) return (post.tags || []).some((t) => t.slug === TAG || t.slug === `hash-${TAG}`);
  return TITLE_RE.test(post.title || "");
}

async function browseAll() {
  const out = [];
  let page = 1;
  for (;;) {
    const res = await api.posts.browse({
      filter: `status:${STATUS}`,
      limit: 100,
      page,
      include: "tags",
      fields: "id,title,slug,url,published_at,updated_at",
    });
    out.push(...res);
    const pages = res.meta?.pagination?.pages || 1;
    if (page >= pages) break;
    page++;
  }
  return out;
}

async function main() {
  const action = DELETE ? "APPLY DELETE (permanent)" : NOINDEX ? "APPLY noindex" : "APPLY unpublish";
  console.log(`Ghost: ${url}  (${APPLY ? action : "DRY RUN"})  status:${STATUS}\n`);
  const posts = await browseAll();
  console.log(`Published posts total: ${posts.length}`);

  let candidates;
  if (DUPES) {
    const groups = {};
    for (const p of posts) (groups[normTitle(p.title)] ||= []).push(p);
    const dupeGroups = Object.values(groups).filter((g) => g.length > 1);
    candidates = [];
    console.log(`Duplicate title groups: ${dupeGroups.length}\n`);
    for (const g of dupeGroups) {
      const keep = pickKeeper(g);
      console.log(`  "${g[0].title}"`);
      for (const p of g) {
        const role = p.id === keep.id ? "KEEP " : "UNPUB";
        console.log(`      ${role}  ${p.published_at?.slice(0, 10)}  ${p.slug}`);
        if (p.id !== keep.id) candidates.push(p);
      }
    }
    console.log(`\nTo unpublish: ${candidates.length}`);
  } else {
    candidates = LIST_ALL ? posts : posts.filter(isDigest);
    console.log(`${LIST_ALL ? "Listing ALL" : "Digest matches"}: ${candidates.length}\n`);
    for (const p of candidates) {
      const tags = (p.tags || []).map((t) => t.slug).join(",");
      console.log(`  ${p.published_at?.slice(0, 10)}  ${p.title}`);
      console.log(`      ${p.url}   [tags: ${tags || "-"}]`);
    }
  }

  if (!APPLY) {
    console.log(`\nDry run only. Re-run with: --apply --yes  (add --noindex to keep published but noindex)`);
    return;
  }
  if (!YES) {
    console.log(`\nRefusing to mutate without --yes. Aborting.`);
    return;
  }

  console.log(`\nApplying to ${candidates.length} posts...`);
  let ok = 0, fail = 0;
  for (const p of candidates) {
    try {
      if (DELETE) {
        await api.posts.delete({ id: p.id });
        ok++;
        console.log(`  ✓ deleted: ${p.title}`);
        continue;
      }
      const full = await api.posts.read({ id: p.id }, { formats: ["html"] });
      if (NOINDEX) {
        const head = full.codeinjection_head || "";
        if (/name=["']robots["']/.test(head)) { console.log(`  skip (already noindex): ${p.title}`); continue; }
        await api.posts.edit({
          id: p.id,
          updated_at: full.updated_at,
          codeinjection_head: `${head}\n<meta name="robots" content="noindex, follow">`.trim(),
        });
      } else {
        await api.posts.edit({ id: p.id, updated_at: full.updated_at, status: "draft" });
      }
      ok++;
      console.log(`  ✓ ${NOINDEX ? "noindexed" : "unpublished"}: ${p.title}`);
    } catch (e) {
      fail++;
      console.error(`  ✗ failed: ${p.title} — ${e.message || e}`);
    }
  }
  console.log(`\nDone. ${ok} updated, ${fail} failed.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
