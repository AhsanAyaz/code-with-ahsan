#!/usr/bin/env node
/**
 * Static check: every Firestore query that needs a composite index must have one
 * declared in firestore.indexes.json.
 *
 * A missing composite index does not fail at build time or in tests — it throws
 * FAILED_PRECONDITION at runtime, in production, only for the code path that runs
 * the query. This script catches it before the deploy.
 *
 * Usage: node scripts/check-firestore-indexes.mjs [--verbose]
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const INDEX_FILE = path.join(ROOT, "firestore.indexes.json");
const SCAN_DIRS = ["src", "scripts"];
const VERBOSE = process.argv.includes("--verbose");

// `in` is a disjunction of equalities and is served like one, so it is not a range op.
const RANGE_OPS = new Set(["<", "<=", ">", ">=", "!=", "not-in"]);
const ARRAY_OPS = new Set(["array-contains", "array-contains-any"]);

/* ------------------------------------------------------------------ sources */

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      walk(full, out);
    } else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && !full.endsWith(".d.ts")) {
      out.push(full);
    }
  }
  return out;
}

/** Map local `const FOO = "bar"` so `.collection(FOO)` resolves to a name. */
function collectStringConstants(source) {
  const constants = new Map();
  const re = /(?:const|let|var)\s+([A-Za-z0-9_$]+)\s*(?::\s*[^=]+)?=\s*["'`]([^"'`]+)["'`]/g;
  let match;
  while ((match = re.exec(source))) constants.set(match[1], match[2]);
  return constants;
}

function resolveArg(raw, constants) {
  const literal = raw.match(/^\s*["'`]([^"'`]+)["'`]\s*$/);
  if (literal) return literal[1];
  const ident = raw.trim().match(/^[A-Za-z0-9_$.]+$/);
  if (ident) {
    const key = raw.trim().split(".").pop();
    if (constants.has(key)) return constants.get(key);
  }
  return null;
}

/** Split a call's argument list on top-level commas. */
function splitArgs(argString) {
  const args = [];
  let depth = 0;
  let quote = null;
  let current = "";
  for (const char of argString) {
    if (quote) {
      current += char;
      if (char === quote) quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      current += char;
      continue;
    }
    if ("([{".includes(char)) depth++;
    if (")]}".includes(char)) depth--;
    if (char === "," && depth === 0) {
      args.push(current);
      current = "";
      continue;
    }
    current += char;
  }
  if (current.trim()) args.push(current);
  return args;
}

/** Read the balanced argument list starting at the "(" index. */
function readCallArgs(source, openParen) {
  let depth = 0;
  let quote = null;
  for (let i = openParen; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === quote && source[i - 1] !== "\\") quote = null;
      continue;
    }
    if (char === '"' || char === "'" || char === "`") {
      quote = char;
      continue;
    }
    if (char === "(") depth++;
    else if (char === ")") {
      depth--;
      if (depth === 0) return { args: source.slice(openParen + 1, i), end: i };
    }
  }
  return null;
}

/* ------------------------------------------------------------------- parser */

/**
 * Walk forward from `.collection(...)` collecting the chained
 * `.where()` / `.orderBy()` calls that belong to the same expression.
 */
function parseChain(source, startIndex, constants) {
  const wheres = [];
  const orderBys = [];
  let cursor = startIndex;
  let dynamic = false;

  while (true) {
    const rest = source.slice(cursor);
    const next = rest.match(/^\s*(?:as\s+[^.;]+)?\s*\.\s*([A-Za-z0-9_$]+)\s*\(/);
    if (!next) {
      // The chain may continue after a reassignment (`query = query.orderBy(...)`).
      if (/^\s*(?:as\s+[^;]+)?\s*;/.test(rest)) dynamic = true;
      break;
    }
    const method = next[1];
    // `.doc()` / `.collection()` start a different collection — that is a new query.
    if (method === "doc" || method === "collection" || method === "collectionGroup") break;
    const openParen = cursor + next[0].length - 1;
    const call = readCallArgs(source, openParen);
    if (!call) break;

    if (method === "where") {
      const args = splitArgs(call.args);
      const field = resolveArg(args[0] ?? "", constants);
      const op = resolveArg(args[1] ?? "", constants);
      if (!field || !op) dynamic = true;
      else wheres.push({ field, op });
    } else if (method === "orderBy") {
      const args = splitArgs(call.args);
      const field = resolveArg(args[0] ?? "", constants);
      const dir = resolveArg(args[1] ?? "", constants) ?? "asc";
      if (!field) dynamic = true;
      else if (field !== "__name__") orderBys.push({ field, dir: dir.toLowerCase() });
    }

    cursor = call.end + 1;
  }

  return { wheres, orderBys, dynamic };
}

/** Name of the variable a chain starting at `matchIndex` is assigned to, if any. */
function assignedVariable(source, matchIndex) {
  const before = source.slice(Math.max(0, matchIndex - 200), matchIndex);
  const match = before.match(/(?:const|let|var)\s+([A-Za-z0-9_$]+)[^=]*=\s*(?:await\s+)?[^=;]*$/);
  return match ? match[1] : null;
}

/**
 * Collect every query in a file, including chains that are split across
 * statements (`const q = col.where(...)` … `q.orderBy(...)`), which is exactly
 * the shape that hides a missing index from a naive scan.
 */
function findQueries(file) {
  const source = fs.readFileSync(file, "utf8");
  const constants = collectStringConstants(source);
  const queries = [];
  const bases = [];

  const re = /\.\s*collection(?:Group)?\s*\(/g;
  let match;
  while ((match = re.exec(source))) {
    const openParen = match.index + match[0].length - 1;
    const call = readCallArgs(source, openParen);
    if (!call) continue;
    const collection = resolveArg(splitArgs(call.args)[0] ?? "", constants);
    if (!collection) continue;

    const chain = parseChain(source, call.end + 1, constants);
    const line = source.slice(0, match.index).split("\n").length;
    const base = { file, line, collection, ...chain };
    queries.push(base);

    const variable = assignedVariable(source, match.index);
    if (variable) bases.push({ variable, at: match.index, base });
  }

  // Continuations: `q.orderBy(...)`, `query = query.where(...)`, etc.
  // Variable names like `query` are reused across functions, so a use binds to
  // the nearest preceding assignment of that name, not to any assignment of it.
  const variables = [...new Set(bases.map((b) => b.variable))];
  for (const variable of variables) {
    const useRe = new RegExp(`\\b${variable}\\s*\\.\\s*(?:where|orderBy)\\s*\\(`, "g");
    let use;
    while ((use = useRe.exec(source))) {
      const binding = bases
        .filter((b) => b.variable === variable && b.at < use.index)
        .pop();
      if (!binding) continue;
      const dot = source.indexOf(".", use.index + variable.length - 1);
      const continuation = parseChain(source, dot, constants);
      if (!continuation.wheres.length && !continuation.orderBys.length) continue;
      queries.push({
        file,
        line: source.slice(0, use.index).split("\n").length,
        collection: binding.base.collection,
        wheres: [...binding.base.wheres, ...continuation.wheres],
        orderBys: [...binding.base.orderBys, ...continuation.orderBys],
        dynamic: binding.base.dynamic || continuation.dynamic,
      });
    }
  }

  return queries;
}

/* ------------------------------------------------------ index requirements */

/**
 * Firestore serves some queries from the automatic single-field indexes:
 *   - a single filter, with or without an orderBy on that same field
 *   - equality-only conjunctions (`==` / `in`), merged with a zigzag join
 *
 * A composite index is required when the query mixes fields in a way those
 * indexes cannot answer:
 *   - a filter on one field plus an orderBy on another
 *   - a range/inequality filter alongside any other filtered field
 *   - an array-contains filter alongside any other filter or an orderBy
 *   - more than one orderBy field
 */
function requiredIndex(query) {
  const equality = [];
  const range = [];
  const arrays = [];
  for (const { field, op } of query.wheres) {
    if (ARRAY_OPS.has(op)) arrays.push(field);
    else if (RANGE_OPS.has(op)) range.push(field);
    else equality.push(field);
  }

  const orderFields = query.orderBys.map((o) => o.field);
  const filterFields = new Set([...equality, ...range, ...arrays]);
  const allFields = new Set([...filterFields, ...orderFields]);
  if (allFields.size < 2) return null;

  const needsIndex =
    query.orderBys.length > 1 ||
    (orderFields.length > 0 && [...filterFields].some((f) => !orderFields.includes(f))) ||
    (range.length > 0 && filterFields.size > 1) ||
    (arrays.length > 0 && allFields.size > 1);

  if (!needsIndex) return null;

  return {
    collection: query.collection,
    // Equality and array-contains fields form the index prefix; their order
    // among themselves does not matter for index selection.
    prefix: [...new Set([...equality, ...arrays])].map((field) => ({
      field,
      array: arrays.includes(field) && !equality.includes(field),
    })),
    // Range filters and orderBy fields must follow the prefix, in order.
    tail: [
      ...[...new Set(range)].map((field) => ({ field, dir: null })),
      ...query.orderBys.map((o) => ({ field: o.field, dir: o.dir })),
    ].filter((item, i, arr) => arr.findIndex((x) => x.field === item.field) === i),
  };
}

function describe(req) {
  const parts = [
    ...req.prefix.map((f) => `${f.field} ${f.array ? "array-contains" : "=="}`),
    ...req.tail.map((t) => `${t.field} ${t.dir ?? "range"}`),
  ];
  return `${req.collection}: ${parts.join(", ")}`;
}

function satisfies(index, req) {
  if (index.collectionGroup !== req.collection) return false;
  // Vector fields only ever come last and are irrelevant to filter/sort matching.
  const fields = index.fields.filter((f) => f.fieldPath !== "__name__" && !f.vectorConfig);

  const prefix = fields.slice(0, req.prefix.length);
  if (prefix.length !== req.prefix.length) return false;
  for (const required of req.prefix) {
    const found = prefix.find((f) => f.fieldPath === required.field);
    if (!found) return false;
    if (required.array && found.arrayConfig !== "CONTAINS") return false;
  }

  const tail = fields.slice(req.prefix.length);
  if (tail.length < req.tail.length) return false;
  return req.tail.every((item, i) => {
    const actual = tail[i];
    if (!actual || actual.fieldPath !== item.field) return false;
    if (!item.dir) return true;
    return (actual.order ?? "ASCENDING").toLowerCase().startsWith(item.dir);
  });
}

function suggestion(req) {
  return {
    collectionGroup: req.collection,
    queryScope: "COLLECTION",
    fields: [
      ...req.prefix.map((f) =>
        f.array
          ? { fieldPath: f.field, arrayConfig: "CONTAINS" }
          : { fieldPath: f.field, order: "ASCENDING" }
      ),
      ...req.tail.map((t) => ({
        fieldPath: t.field,
        order: t.dir === "desc" ? "DESCENDING" : "ASCENDING",
      })),
    ],
  };
}

/* --------------------------------------------------------------------- run */

// The Claude and Antigravity copies of the skill must not drift apart.
const SKILL_COPIES = [
  ".claude/skills/firestore-indexes/SKILL.md",
  ".agent/skills/firestore-indexes/SKILL.md",
];
const skills = SKILL_COPIES.map((rel) => ({ rel, full: path.join(ROOT, rel) }));
if (skills.every((s) => fs.existsSync(s.full))) {
  const [a, b] = skills.map((s) => fs.readFileSync(s.full, "utf8"));
  if (a !== b) {
    console.error(`\u2717 ${SKILL_COPIES[0]} and ${SKILL_COPIES[1]} have drifted apart.`);
    console.error(`  Copy one over the other so both agents get the same instructions.`);
    process.exit(1);
  }
}

const declared = JSON.parse(fs.readFileSync(INDEX_FILE, "utf8")).indexes ?? [];
const files = SCAN_DIRS.flatMap((dir) => walk(path.join(ROOT, dir)));

const missing = [];
const dynamic = [];
const seen = new Set();

for (const file of files) {
  for (const query of findQueries(file)) {
    const req = requiredIndex(query);
    const where = `${path.relative(ROOT, file)}:${query.line}`;
    if (!req) {
      if (query.dynamic && (query.wheres.length || query.orderBys.length)) {
        dynamic.push(`${where}  ${query.collection} (chain built dynamically)`);
      }
      continue;
    }
    if (declared.some((index) => satisfies(index, req))) continue;
    const key = `${where}|${describe(req)}`;
    if (seen.has(key)) continue;
    seen.add(key);
    missing.push({ where, req });
  }
}

if (VERBOSE && dynamic.length) {
  console.log("Dynamically built queries — verify their indexes by hand:");
  for (const entry of dynamic) console.log(`  - ${entry}`);
  console.log("");
}

if (!missing.length) {
  console.log(`✓ firestore.indexes.json covers every statically detectable composite query (${files.length} files scanned).`);
  process.exit(0);
}

console.error("✗ Missing Firestore composite indexes:\n");
for (const { where, req } of missing) {
  console.error(`  ${where}`);
  console.error(`    query: ${describe(req)}`);
  console.error(`    add to firestore.indexes.json -> "indexes":`);
  console.error(
    JSON.stringify(suggestion(req), null, 2)
      .split("\n")
      .map((line) => `      ${line}`)
      .join("\n")
  );
  console.error("");
}
console.error("Then deploy: npx firebase deploy --only firestore:indexes");
process.exit(1);
