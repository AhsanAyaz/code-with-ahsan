# Events Content

Each event lives in its own folder: `src/content/events/<slug>/event.mdx`

The build script reads all `event.mdx` files and generates `events.generated.json` automatically when you run `npm run build` (or `npm run build:events` standalone).

## Adding a New Event

1. Create a folder matching the event slug: `src/content/events/my-event-2027/`
2. Add an `event.mdx` file using the template below
3. Run `npm run build:events` to regenerate the index (or just `npm run build`)

## Template

```mdx
---
slug: my-event-2027
title: "My Event 2027"
description: "A short description shown on the events listing page (1–2 sentences)."
type: workshop
date: "2027-06-15"
endDate: "2027-06-16"
location: "Online"
speaker: "Speaker Name"
bannerImage: "https://example.com/banner.png"
dedicatedRoute:
isVisible: true
status: upcoming
visibilityOrder: 10
---

# My Event 2027

Write the full event description here using standard Markdown.

## What to Expect

- Point one
- Point two

## Who Should Attend

Anyone interested in...
```

## Frontmatter Reference

| Field | Required | Values | Notes |
|---|---|---|---|
| `slug` | ✅ | string | Must match the folder name |
| `title` | ✅ | string | Shown on card and detail page |
| `description` | ✅ | string | Short summary for the card |
| `type` | ✅ | `workshop` `hackathon` `tech-talk` `webinar` `conference` `other` | Controls the type badge colour |
| `date` | ✅ | ISO date `"YYYY-MM-DD"` | Event start date |
| `status` | ✅ | `upcoming` `completed` `cancelled` | Controls the status badge |
| `endDate` | — | ISO date | Optional end date |
| `location` | — | string | e.g. `"Online"` or `"Karachi, Pakistan"` |
| `speaker` | — | string | Shown with a 🎤 icon on the card |
| `bannerImage` | — | URL | Used for Open Graph when the detail page renders |
| `dedicatedRoute` | — | path string | If set, visiting `/events/<slug>` redirects here instead of rendering the MDX body |
| `isVisible` | — | `true` / `false` | Defaults to `true`; set `false` to hide from the listing |
| `visibilityOrder` | — | number | Higher = shown first when dates are equal; defaults to `0` |

## Dedicated Routes

If an event has its own hand-crafted page (e.g. `/events/my-event/2027`), set `dedicatedRoute` to that path:

```yaml
dedicatedRoute: "/events/my-event/2027"
```

Visitors who click "View Event" will land on `/events/my-event-2027`, which immediately redirects to `/events/my-event/2027`. Leave `dedicatedRoute` empty (or omit it) to render the MDX body as the detail page instead.
