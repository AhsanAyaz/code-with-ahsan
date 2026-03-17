---
phase: 72-update-rates-card
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/content/rates.json
  - src/components/Footer.tsx
autonomous: true
requirements:
  - RATES-72
must_haves:
  truths:
    - "YouTube section shows 34k+ subscribers and updated Short/Mention prices"
    - "YouTube Packages reflect updated prices and include new Scale Package"
    - "Instagram section shows 64k+ followers"
    - "Facebook section shows 53k+ followers"
    - "TikTok Video price shows $700"
    - "Newsletter & Community section exists between TikTok and Usage Rights"
    - "All other content, formatting, and usage rights are unchanged"
  artifacts:
    - path: "src/content/rates.json"
      provides: "Updated rate card article markdown"
      contains: "34k+"
  key_links:
    - from: "src/content/rates.json"
      to: "rates page rendered HTML"
      via: "article markdown field"
      pattern: "34k\\+"
---

<objective>
Update the Creator Rate Card content in rates.json with revised subscriber counts, updated prices, a new YouTube package, and a new Newsletter & Community section.

Purpose: Keep the public rate card accurate and add new monetization channels.
Output: Updated rates.json with all specified changes applied.
</objective>

<execution_context>
@/Users/amu1o5/.claude/get-shit-done/workflows/execute-plan.md
@/Users/amu1o5/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@src/content/rates.json
</context>

<tasks>

<task type="auto">
  <name>Task 1: Apply all rate card updates to rates.json</name>
  <files>src/content/rates.json</files>
  <action>
    Edit the `article` field in src/content/rates.json applying every change below. Preserve all existing markdown formatting, heading styles, link syntax, bullet indentation, and spacing exactly.

    **Subscriber/follower count updates:**
    - YouTube heading: change `33k+ Subscribers` to `34k+ Subscribers`
    - All body-text references to subscriber counts in YouTube section (e.g. "nearly 31,000", "over 30,000", "nearly 31,000"): update each to `34,700+` where an exact number appears, and `34k+` where the abbreviated form is used. Specifically:
      - "nearly 31,000 YouTube subscribers" → "34,700+ YouTube subscribers" (appears in Long-Form, Short, and Mention descriptions)
      - "over 30,000 YouTube subscribers" → "34,700+ YouTube subscribers"
    - Instagram heading: change `62k+ Followers` to `64k+ Followers`
    - LinkedIn heading: change `22k+ Followers` to `23k+ Followers`
    - Facebook heading: change `52k+ Followers` to `53k+ Followers`
    - TikTok heading and body: keep `9k+ Followers` unchanged

    **YouTube rate changes:**
    - YouTube Short price: change `$800` to `$900`
    - YouTube Mention/Integration price: change `$1,100` to `$1,200`

    **YouTube Packages changes:**
    - Starter Package: change `$2,800` to `$2,900` (save amount stays `$200`)
    - Growth Package: keep at `$4,000` (save `$400`) — no change
    - Max Visibility Package: change `$3,400` to `$3,600` and change `Save $400` to `Save $300`
    - Add new package line after Max Visibility Package:
      `- **Scale Package:** 3 Full Videos: **$5,500** *(Save $1,100)*`

    **TikTok rate change:**
    - TikTok Video price: change `$400` to `$700`

    **New section — insert between TikTok section and Usage Rights section:**

    ```
    ### **Newsletter & Community (2,100+ Subscribers · 4,400+ Discord Members)**

    *Direct access to an active, high-intent developer community.*

    - **Newsletter Feature (dedicated slot in issue):** **$500**
        - *Details:* Sponsored segment in the Code with Ahsan newsletter, delivered to 2,100+ subscribed developers. Includes intro copy, product description, and a direct CTA link.
    - **Discord Announcement/Pinned Post:** **$400**
        - *Details:* Sponsored announcement posted and pinned in the Code with Ahsan Discord server (4,400+ developer members). Includes a custom message, brand link, and 7-day pin.
    - **Newsletter + Discord Bundle:** **$750** *(Save $150)*
        - *Details:* Combined newsletter feature and Discord announcement for maximum community reach.



    ```

    The existing `## **Usage Rights & Campaign Add-Ons**` section and everything after it must remain unchanged.

    NOTE: The `exportedAt` and `source` fields at the top of the JSON must not be changed. The `id`, `title`, `slug`, `description`, and `resources` fields must also remain unchanged.
  </action>
  <verify>
    <automated>node -e "
    const d = require('./src/content/rates.json');
    const a = d.rateCard.article;
    const checks = [
      [a.includes('34k+ Subscribers'), '34k+ Subscribers'],
      [a.includes('34,700+'), '34,700+ exact count'],
      [a.includes('64k+ Followers'), '64k+ Instagram'],
      [a.includes('23k+ Followers'), '23k+ LinkedIn'],
      [a.includes('53k+ Followers'), '53k+ Facebook'],
      [a.includes('\$900'), '\$900 Short'],
      [a.includes('\$1,200'), '\$1,200 Mention'],
      [a.includes('\$2,900'), '\$2,900 Starter'],
      [a.includes('\$3,600'), '\$3,600 Max Visibility'],
      [a.includes('Scale Package'), 'Scale Package'],
      [a.includes('\$5,500'), '\$5,500 Scale'],
      [a.includes('\$700'), '\$700 TikTok'],
      [a.includes('Newsletter & Community'), 'Newsletter & Community section'],
      [a.includes('2,100+ Subscribers'), '2,100+ newsletter subs'],
      [a.includes('4,400+ Discord'), '4,400+ Discord members'],
      [a.includes('\$750'), '\$750 bundle'],
      [a.includes('Usage Rights'), 'Usage Rights preserved'],
    ];
    let pass = true;
    checks.forEach(([ok, label]) => { if (!ok) { console.error('FAIL:', label); pass = false; } });
    if (pass) console.log('All checks passed');
    process.exit(pass ? 0 : 1);
    "
    </automated>
  </verify>
  <done>
    All subscriber counts and prices updated, Scale Package added, Newsletter & Community section inserted before Usage Rights, JSON parses without error, all 17 automated checks pass.
  </done>
</task>

<task type="auto">
  <name>Task 2: Add Rates link to Footer</name>
  <files>src/components/Footer.tsx</files>
  <action>
    In src/components/Footer.tsx, add a "Rates" link to the existing nav that contains Privacy Policy and Terms of Service links:

    Add this link alongside the existing ones:
    ```tsx
    <Link href="/rates" className="link link-hover text-sm">
      Rates
    </Link>
    ```

    Place it before the Privacy Policy link or after Terms of Service — either position is acceptable. Preserve all existing formatting and links.
  </action>
  <verify>
    <automated>grep -q 'href="/rates"' src/components/Footer.tsx && echo "Rates link present" || (echo "FAIL: Rates link missing" && exit 1)</automated>
  </verify>
  <done>
    Footer nav contains a link to /rates alongside Privacy Policy and Terms of Service.
  </done>
</task>

</tasks>

<verification>
Run the automated verification command from Task 1 to confirm all 17 checks pass. Visually confirm the JSON is valid by ensuring `node -e "require('./src/content/rates.json')"` exits 0.
</verification>

<success_criteria>
- rates.json contains all updated subscriber counts (YouTube 34k+, Instagram 64k+, LinkedIn 23k+, Facebook 53k+)
- YouTube Short is $900, Mention/Integration is $1,200
- YouTube Packages: Starter $2,900, Max Visibility $3,600 (save $300), Scale Package $5,500 (save $1,100) added
- TikTok Video is $700
- Newsletter & Community section present with correct prices and member counts
- Usage Rights & Campaign Add-Ons section and all other content unchanged
- JSON file parses without error
</success_criteria>

<output>
After completion, create `.planning/quick/72-update-the-rates-card-according-to-feedb/72-SUMMARY.md`
</output>
