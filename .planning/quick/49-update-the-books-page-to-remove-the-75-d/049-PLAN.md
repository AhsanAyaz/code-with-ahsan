---
phase: 049
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/booksData.js
autonomous: true

must_haves:
  truths:
    - "Mastering Angular Signals book no longer shows 75% OFF discount badge"
    - "Zero to Website book links to https://z2website.com instead of showing interest form"
  artifacts:
    - path: "src/data/booksData.js"
      provides: "Book data configuration"
      min_lines: 50
  key_links:
    - from: "src/components/books/BookCard.tsx"
      to: "booksData"
      via: "imported and mapped in BooksList"
      pattern: "booksData.map"
---

<objective>
Update book promotion details: remove the 75% discount from Mastering Angular Signals and change Zero to Website to link to https://z2website.com.

Purpose: Reflect current pricing and availability
Output: Updated booksData.js with corrected discount and link information
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/data/booksData.js
@src/components/books/BookCard.tsx
</context>

<tasks>

<task type="auto">
  <name>Update book data for promotions and links</name>
  <files>src/data/booksData.js</files>
  <action>
    Update the booksData.js file to make two specific changes:

    1. **Mastering Angular Signals** (id: 3):
       - Remove the `discount: "75% OFF"` field entirely
       - Keep all other fields unchanged (link, btnText, actionType remain the same)

    2. **Zero to Website** (id: 4):
       - Change `link: null` to `link: "https://z2website.com"`
       - Change `actionType: "interest-form"` to `actionType: "link"`
       - Change `btnText: "Get Notified"` to `btnText: "Get your copy"`
       - Remove the `discount: "Coming Soon"` field entirely
       - Keep all other fields unchanged

    These changes will:
    - Remove the discount badge from the Mastering Angular Signals card
    - Make Zero to Website open z2website.com in a new tab instead of showing the interest form modal
  </action>
  <verify>
    Visit http://localhost:3000/books and confirm:
    1. Mastering Angular Signals book card has no discount badge in the top-right corner
    2. Zero to Website book card has no "Coming Soon" badge
    3. Clicking "Get your copy" on Zero to Website opens https://z2website.com in a new tab
  </verify>
  <done>
    - booksData.js updated with both books' changes
    - No discount field for Mastering Angular Signals
    - Zero to Website configured as direct link with correct URL
  </done>
</task>

</tasks>

<verification>
Manual verification:
1. Start dev server (`npm run dev`)
2. Visit /books page
3. Verify Mastering Angular Signals has no discount badge
4. Verify Zero to Website button opens https://z2website.com
</verification>

<success_criteria>
- [ ] Mastering Angular Signals book entry has no discount field
- [ ] Zero to Website book links to https://z2website.com
- [ ] Zero to Website actionType changed to "link"
- [ ] Zero to Website btnText changed to "Get your copy"
- [ ] Zero to Website has no discount field
- [ ] All other book data remains unchanged
</success_criteria>

<output>
After completion, create `.planning/quick/49-update-the-books-page-to-remove-the-75-d/049-SUMMARY.md`
</output>
