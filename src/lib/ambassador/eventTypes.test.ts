import { describe, it, expect } from "vitest";

// These tests will fail (RED) until eventTypes.ts is created.
// They validate the D-02 behavior specified in the plan.

describe("EVENT_TYPE_LABELS", () => {
  it('returns "Workshop" for workshop', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["workshop"]).toBe("Workshop");
  });

  it('returns "Blog post" for blog_post', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["blog_post"]).toBe("Blog post");
  });

  it('returns "Talk / Webinar" for talk_webinar', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["talk_webinar"]).toBe("Talk / Webinar");
  });

  it('returns "Community stream" for community_stream', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["community_stream"]).toBe("Community stream");
  });

  it('returns "Study group" for study_group', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["study_group"]).toBe("Study group");
  });

  it('returns "Other" for other', async () => {
    const { EVENT_TYPE_LABELS } = await import("./eventTypes");
    expect(EVENT_TYPE_LABELS["other"]).toBe("Other");
  });
});

describe("EventTypeSchema", () => {
  it("accepts workshop as a valid event type", async () => {
    const { EventTypeSchema } = await import("./eventTypes");
    expect(EventTypeSchema.safeParse("workshop").success).toBe(true);
  });

  it("rejects webinar (not in enum)", async () => {
    const { EventTypeSchema } = await import("./eventTypes");
    expect(EventTypeSchema.safeParse("webinar").success).toBe(false);
  });

  it("accepts all six enum values", async () => {
    const { EventTypeSchema } = await import("./eventTypes");
    const values = [
      "workshop",
      "blog_post",
      "talk_webinar",
      "community_stream",
      "study_group",
      "other",
    ];
    for (const v of values) {
      expect(EventTypeSchema.safeParse(v).success).toBe(true);
    }
  });
});
