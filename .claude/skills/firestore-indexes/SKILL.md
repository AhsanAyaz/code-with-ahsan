---
name: firestore-indexes
description: "Keep Firestore composite indexes in the repo. Use whenever writing, editing, or reviewing code that queries Firestore — any `.where()`, `.orderBy()`, `.findNearest()`, or a new collection — and before opening a PR that touches src/app/api, src/services, src/lib, or scripts. Also use when a query works locally but returns 500 / FAILED_PRECONDITION in production, or when a page section silently renders nothing."
---

# Firestore indexes live in the repo

A Firestore query that needs a composite index **does not fail at build time, in
tests, or in the emulator**. It fails at runtime, in production, only on the code
path that runs it — as `FAILED_PRECONDITION: The query requires an index`. The
API route catches it, returns an empty array, and the UI renders nothing. Nobody
notices for weeks.

Creating the index by clicking the link in the Firebase console error "fixes"
production and leaves the repo wrong: the next `firebase deploy --only
firestore:indexes` from a clean checkout drops it, and no reviewer can see the
index exists.

**The index is part of the change. It ships in the same commit as the query.**

## Every time you touch a Firestore query

1. Write the query.
2. Add the composite index to `firestore.indexes.json` (rules below).
3. Run `npm run check:firestore-indexes` and get a clean pass.
4. Commit query + index together.
5. Deploy the index — it must land **before or with** the code that needs it:
   ```
   npx firebase deploy --only firestore:indexes --project code-with-ahsan-45496
   ```
   Large collections take minutes to build. Say so in the PR description.

Step 3 also runs automatically on `git commit` via `.husky/pre-commit`. If it
fails, add the index — do not `--no-verify`.

## When a composite index is required

Required:

- a filter on one field plus an `orderBy` on a **different** field
  (`.where("isApproved","==",true).orderBy("createdAt","desc")`)
- a range/inequality (`<`, `<=`, `>`, `>=`, `!=`, `not-in`) plus any other
  filtered field, including two ranges on different fields
- `array-contains` / `array-contains-any` combined with any other filter or an
  `orderBy`
- more than one `orderBy` field
- `findNearest()` vector search combined with any filter — the filter fields go
  first, the vector field last with its `vectorConfig`

Not required — the automatic single-field indexes already serve these:

- a single filter, with or without an `orderBy` on that same field
- equality-only conjunctions (`==` and `in`), however many; Firestore merges the
  single-field indexes with a zigzag join

## Field order in the index

Equality and `array-contains` fields first (their order among themselves does not
matter), then range fields, then `orderBy` fields in query order with matching
direction, vector field last.

```jsonc
{
  "collectionGroup": "consulting_reviews",
  "queryScope": "COLLECTION",
  "fields": [
    { "fieldPath": "isApproved", "order": "ASCENDING" }, // equality
    { "fieldPath": "createdAt", "order": "DESCENDING" }, // orderBy, matching direction
  ],
}
```

Array field: `{ "fieldPath": "roles", "arrayConfig": "CONTAINS" }`.
Vector field: `{ "fieldPath": "bioEmbedding", "vectorConfig": { "dimension": 768, "flat": {} } }`.

Append new entries at the end of `"indexes"`. Do not re-sort the file — it makes
the diff unreviewable.

## Make the read survive a building index

An index takes time to build after deploy. Where the query backs user-visible
content, degrade instead of 500ing — fall back to a narrower query and finish the
work in memory, and log a warning so the fallback is visible:

```ts
try {
  return await approvedQuery.orderBy("createdAt", "desc").limit(10).get();
} catch (orderError) {
  console.warn("Falling back to unordered testimonials query:", orderError);
  const snap = await approvedQuery.get();
  return snap.docs.sort(byCreatedAtDesc).slice(0, 10);
}
```

This is a safety net, not a substitute for the index. Ship both.

## The checker

`scripts/check-firestore-indexes.mjs` parses `src/` and `scripts/` for query
chains — including ones split across statements, which is the shape that hides a
missing index — works out which need a composite index, and diffs that against
`firestore.indexes.json`. On a miss it prints the file:line and the exact JSON to
paste in.

It reads static code, so it cannot see a collection name or field that is only
known at runtime. Run `npm run check:firestore-indexes -- --verbose` to list the
dynamically built queries it had to skip, and check those by hand.

## Debugging a query that returns nothing in production

1. `curl -sL -o /dev/null -w "%{http_code}" https://www.codewithahsan.dev/api/<route>`
   — a 500 with an empty payload is the signature.
2. Check whether another Firestore route returns 200. If it does, credentials are
   fine and the failure is index-specific.
3. `grep` the collection in `firestore.indexes.json`. No entry is the answer.
4. Add the index, run the checker, deploy indexes, then redeploy the app.
