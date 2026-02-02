/**
 * Firestore Security Rules Integration Tests
 *
 * REQUIREMENTS:
 * - Firebase emulator must be running: `npx firebase emulators:start --only firestore`
 * - Or run with: `npm run test:rules` (uses emulators:exec)
 *
 * These tests validate PERM-01 through PERM-04 by running actual security rules
 * against a local Firestore emulator.
 */

import { describe, it, beforeAll, afterAll, beforeEach } from "vitest";
import {
  initializeTestEnvironment,
  assertSucceeds,
  assertFails,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import * as fs from "fs";
import * as path from "path";

let testEnv: RulesTestEnvironment;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "test-project-" + Date.now(),
    firestore: {
      rules: fs.readFileSync(
        path.resolve(__dirname, "../../../firestore.rules"),
        "utf8"
      ),
    },
  });
});

afterAll(async () => {
  await testEnv.cleanup();
});

beforeEach(async () => {
  await testEnv.clearFirestore();
});

// Helper: get authenticated context with custom claims
function asAcceptedMentor(uid = "mentor1") {
  return testEnv.authenticatedContext(uid, {
    role: "mentor",
    status: "accepted",
  });
}

function asPendingMentor(uid = "pending-mentor") {
  return testEnv.authenticatedContext(uid, {
    role: "mentor",
    status: "pending",
  });
}

function asMentee(uid = "mentee1") {
  return testEnv.authenticatedContext(uid, {
    role: "mentee",
    status: "accepted",
  });
}

function asAdmin(uid = "admin1") {
  return testEnv.authenticatedContext(uid, {
    admin: true,
  });
}

function asUnauthenticated() {
  return testEnv.unauthenticatedContext();
}

describe("Project Security Rules", () => {
  describe("Create", () => {
    it("PERM-01: allows accepted mentor to create project", async () => {
      const ctx = asAcceptedMentor();
      await assertSucceeds(
        ctx.firestore().collection("projects").add({
          title: "Test Project",
          creatorId: "mentor1",
          status: "pending",
          techStack: ["TypeScript"],
        })
      );
    });

    it("PERM-01: denies pending mentor", async () => {
      const ctx = asPendingMentor();
      await assertFails(
        ctx.firestore().collection("projects").add({
          title: "Test",
          creatorId: "pending-mentor",
          status: "pending",
        })
      );
    });

    it("PERM-01: denies mentee", async () => {
      const ctx = asMentee();
      await assertFails(
        ctx.firestore().collection("projects").add({
          title: "Test",
          creatorId: "mentee1",
          status: "pending",
        })
      );
    });

    it("denies unauthenticated user", async () => {
      const ctx = asUnauthenticated();
      await assertFails(
        ctx.firestore().collection("projects").add({
          title: "Test",
          creatorId: "anon",
          status: "pending",
        })
      );
    });

    it("denies mentor from setting creatorId to someone else", async () => {
      const ctx = asAcceptedMentor("mentor1");
      await assertFails(
        ctx.firestore().collection("projects").add({
          title: "Test",
          creatorId: "someone-else",
          status: "pending",
        })
      );
    });

    it("denies mentor from creating project with approved status", async () => {
      const ctx = asAcceptedMentor();
      await assertFails(
        ctx.firestore().collection("projects").add({
          title: "Test",
          creatorId: "mentor1",
          status: "approved",
        })
      );
    });
  });

  describe("Update (status changes)", () => {
    it("PERM-03: allows admin to change project status", async () => {
      // Setup: create project via admin (bypass rules)
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("projects").doc("proj1").set({
          title: "Test",
          creatorId: "mentor1",
          status: "pending",
        });
      });

      const admin = asAdmin();
      await assertSucceeds(
        admin.firestore().collection("projects").doc("proj1").update({
          status: "approved",
          approvedBy: "admin1",
        })
      );
    });

    it("PERM-03: denies non-admin from changing status", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("projects").doc("proj2").set({
          title: "Test",
          creatorId: "mentor1",
          status: "pending",
        });
      });

      const mentor = asAcceptedMentor("mentor1");
      await assertFails(
        mentor.firestore().collection("projects").doc("proj2").update({
          status: "approved",
        })
      );
    });
  });

  describe("Update (non-status)", () => {
    it("allows owner to update non-status fields", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("projects").doc("proj3").set({
          title: "Old Title",
          creatorId: "mentor1",
          status: "pending",
        });
      });

      const owner = asAcceptedMentor("mentor1");
      await assertSucceeds(
        owner.firestore().collection("projects").doc("proj3").update({
          title: "New Title",
          status: "pending",
          creatorId: "mentor1",
        })
      );
    });

    it("denies non-owner from updating project", async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        await context.firestore().collection("projects").doc("proj4").set({
          title: "Test",
          creatorId: "mentor1",
          status: "pending",
        });
      });

      const other = asAcceptedMentor("other-mentor");
      await assertFails(
        other.firestore().collection("projects").doc("proj4").update({
          title: "Hacked Title",
          status: "pending",
          creatorId: "mentor1",
        })
      );
    });
  });
});

describe("Roadmap Security Rules", () => {
  it("PERM-02: allows accepted mentor to create roadmap", async () => {
    const ctx = asAcceptedMentor();
    await assertSucceeds(
      ctx.firestore().collection("roadmaps").add({
        title: "Web Dev Roadmap",
        creatorId: "mentor1",
        status: "draft",
        version: 1,
      })
    );
  });

  it("PERM-02: denies mentee from creating roadmap", async () => {
    const ctx = asMentee();
    await assertFails(
      ctx.firestore().collection("roadmaps").add({
        title: "Roadmap",
        creatorId: "mentee1",
        status: "draft",
      })
    );
  });

  it("PERM-03: allows admin to approve roadmap", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("roadmaps").doc("road1").set({
        title: "Roadmap",
        creatorId: "mentor1",
        status: "pending",
      });
    });

    const admin = asAdmin();
    await assertSucceeds(
      admin.firestore().collection("roadmaps").doc("road1").update({
        status: "approved",
        approvedBy: "admin1",
      })
    );
  });

  it("denies mentor from approving own roadmap", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("roadmaps").doc("road2").set({
        title: "Roadmap",
        creatorId: "mentor1",
        status: "pending",
      });
    });

    const mentor = asAcceptedMentor("mentor1");
    await assertFails(
      mentor.firestore().collection("roadmaps").doc("road2").update({
        status: "approved",
      })
    );
  });
});

describe("Roadmap Versions", () => {
  it("allows creator to add version", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("roadmaps").doc("road3").set({
        title: "Roadmap",
        creatorId: "mentor1",
        status: "draft",
      });
    });

    const mentor = asAcceptedMentor("mentor1");
    await assertSucceeds(
      mentor.firestore()
        .collection("roadmaps").doc("road3")
        .collection("versions").add({
          version: 1,
          content: "# Version 1",
          createdBy: "mentor1",
        })
    );
  });

  it("denies version deletion (immutable)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("roadmaps").doc("road4").set({
        title: "Roadmap",
        creatorId: "mentor1",
      });
      await context.firestore()
        .collection("roadmaps").doc("road4")
        .collection("versions").doc("v1").set({
          version: 1,
          content: "Content",
          createdBy: "mentor1",
        });
    });

    const mentor = asAcceptedMentor("mentor1");
    await assertFails(
      mentor.firestore()
        .collection("roadmaps").doc("road4")
        .collection("versions").doc("v1").delete()
    );
  });

  it("denies version update (immutable)", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("roadmaps").doc("road5").set({
        title: "Roadmap",
        creatorId: "mentor1",
      });
      await context.firestore()
        .collection("roadmaps").doc("road5")
        .collection("versions").doc("v1").set({
          version: 1,
          content: "Content",
          createdBy: "mentor1",
        });
    });

    const mentor = asAcceptedMentor("mentor1");
    await assertFails(
      mentor.firestore()
        .collection("roadmaps").doc("road5")
        .collection("versions").doc("v1").update({
          content: "Modified",
        })
    );
  });
});

describe("Project Members Security Rules", () => {
  it("PERM-04: allows project owner to add member", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("projects").doc("proj-team").set({
        title: "Team Project",
        creatorId: "mentor1",
        status: "active",
      });
    });

    const owner = asAcceptedMentor("mentor1");
    await assertSucceeds(
      owner.firestore().collection("project_members").add({
        projectId: "proj-team",
        userId: "mentee1",
        role: "member",
      })
    );
  });

  it("PERM-04: allows admin to add member", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("projects").doc("proj-team2").set({
        title: "Team Project",
        creatorId: "mentor1",
        status: "active",
      });
    });

    const admin = asAdmin();
    await assertSucceeds(
      admin.firestore().collection("project_members").add({
        projectId: "proj-team2",
        userId: "mentee1",
        role: "member",
      })
    );
  });

  it("PERM-04: denies non-owner non-admin from adding member", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await context.firestore().collection("projects").doc("proj-team3").set({
        title: "Team Project",
        creatorId: "mentor1",
        status: "active",
      });
    });

    const other = asMentee("mentee-other");
    await assertFails(
      other.firestore().collection("project_members").add({
        projectId: "proj-team3",
        userId: "mentee1",
        role: "member",
      })
    );
  });
});
