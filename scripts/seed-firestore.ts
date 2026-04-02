/**
 * scripts/seed-firestore.ts
 *
 * Seeds the Firebase emulator Firestore with sample data so new contributors
 * can explore the app without needing production credentials.
 *
 * Usage:
 *   npm run seed                    # writes data to the emulator
 *   npm run seed -- --dry-run       # prints what would be written, no writes
 *
 * Prerequisites:
 *   firebase emulators:start        # must be running on localhost:8080
 */

import * as admin from "firebase-admin";
import {
  randFullName,
  randEmail,
  randPhrase,
  randParagraph,
  randWord,
  randNumber,
  randPastDate,
  randUrl,
} from "@ngneat/falso";

// ─── Init ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const PROJECT_ID = "demo-codewithahsan";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";

if (!DRY_RUN) {
  // Must be set before initialising firebase-admin so it points at the emulator
  process.env.FIRESTORE_EMULATOR_HOST = EMULATOR_HOST;
}

if (!admin.apps.length) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

// ─── Helpers ─────────────────────────────────────────────────────────────────

function log(msg: string) {
  console.log(msg);
}

function fakeUserId(n: number) {
  return `seed-user-${String(n).padStart(4, "0")}`;
}

function now() {
  return admin.firestore.FieldValue.serverTimestamp();
}

function pastDate() {
  return admin.firestore.Timestamp.fromDate(
    randPastDate({ years: 1 }) as unknown as Date
  );
}

async function clearCollection(collectionName: string) {
  if (DRY_RUN) return;
  const snap = await db.collection(collectionName).get();
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  log(`  Cleared ${snap.size} existing docs from "${collectionName}"`);
}

// ─── Seed functions ───────────────────────────────────────────────────────────

const TECH_STACKS = [
  ["React", "Next.js", "TypeScript", "Firebase"],
  ["Angular", "Node.js", "MongoDB", "Tailwind CSS"],
  ["Vue.js", "Express", "PostgreSQL", "Docker"],
  ["React Native", "Expo", "Firebase", "TypeScript"],
  ["SvelteKit", "PocketBase", "Tailwind CSS"],
];

async function seedProjects() {
  log("\n[projects] Seeding 4 sample projects...");
  await clearCollection("projects");

  const projects = [
    {
      id: "seed-project-001",
      data: {
        name: "Community Learning Dashboard",
        description: randParagraph({ length: 3 }),
        status: "active",
        creatorId: fakeUserId(1),
        creatorName: randFullName(),
        techStack: TECH_STACKS[0],
        repoUrl: randUrl(),
        lookingFor: ["Frontend Developer", "Designer"],
        maxTeamSize: 5,
        currentTeamSize: 2,
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
    {
      id: "seed-project-002",
      data: {
        name: "Open-Source Blog Engine",
        description: randParagraph({ length: 2 }),
        status: "approved",
        creatorId: fakeUserId(2),
        creatorName: randFullName(),
        techStack: TECH_STACKS[1],
        repoUrl: randUrl(),
        lookingFor: ["Backend Developer"],
        maxTeamSize: 3,
        currentTeamSize: 1,
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
    {
      id: "seed-project-003",
      data: {
        name: "Mobile Mentorship Tracker",
        description: randParagraph({ length: 2 }),
        status: "pending",
        creatorId: fakeUserId(3),
        creatorName: randFullName(),
        techStack: TECH_STACKS[3],
        repoUrl: "",
        lookingFor: ["Mobile Developer", "Backend Developer"],
        maxTeamSize: 4,
        currentTeamSize: 1,
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
    {
      id: "seed-project-004",
      data: {
        name: "AI Code Review Bot",
        description: randParagraph({ length: 3 }),
        status: "active",
        creatorId: fakeUserId(4),
        creatorName: randFullName(),
        techStack: ["Python", "FastAPI", "OpenAI", "GitHub Actions"],
        repoUrl: randUrl(),
        lookingFor: ["ML Engineer"],
        maxTeamSize: 3,
        currentTeamSize: 2,
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
  ];

  for (const { id, data } of projects) {
    if (DRY_RUN) {
      log(`  [dry-run] Would create project "${data.name}" (${data.status})`);
    } else {
      await db.collection("projects").doc(id).set(data);
      log(`  Created project "${data.name}" (${data.status})`);
    }
  }
}

async function seedRoadmaps() {
  log("\n[roadmaps] Seeding 2 sample roadmaps...");
  await clearCollection("roadmaps");

  const roadmaps = [
    {
      id: "seed-roadmap-001",
      data: {
        title: "Full-Stack Web Development with Next.js",
        description: randParagraph({ length: 2 }),
        status: "approved",
        creatorId: fakeUserId(5),
        creatorName: randFullName(),
        tags: ["Next.js", "React", "TypeScript", "Firebase"],
        estimatedWeeks: randNumber({ min: 8, max: 24 }),
        milestones: [
          {
            title: "HTML & CSS Fundamentals",
            description: randPhrase(),
            order: 1,
          },
          {
            title: "JavaScript Essentials",
            description: randPhrase(),
            order: 2,
          },
          {
            title: "React Basics",
            description: randPhrase(),
            order: 3,
          },
          {
            title: "Next.js & SSR",
            description: randPhrase(),
            order: 4,
          },
        ],
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
    {
      id: "seed-roadmap-002",
      data: {
        title: "Backend Engineering with Node.js",
        description: randParagraph({ length: 2 }),
        status: "draft",
        creatorId: fakeUserId(6),
        creatorName: randFullName(),
        tags: ["Node.js", "Express", "PostgreSQL", "Docker"],
        estimatedWeeks: randNumber({ min: 12, max: 20 }),
        milestones: [
          {
            title: "Node.js Core Concepts",
            description: randPhrase(),
            order: 1,
          },
          {
            title: "REST API Design",
            description: randPhrase(),
            order: 2,
          },
          {
            title: "Database Design & SQL",
            description: randPhrase(),
            order: 3,
          },
        ],
        createdAt: pastDate(),
        updatedAt: pastDate(),
      },
    },
  ];

  for (const { id, data } of roadmaps) {
    if (DRY_RUN) {
      log(`  [dry-run] Would create roadmap "${data.title}" (${data.status})`);
    } else {
      await db.collection("roadmaps").doc(id).set(data);
      log(`  Created roadmap "${data.title}" (${data.status})`);
    }
  }
}

async function seedUsers() {
  log("\n[users] Seeding 6 sample users...");
  await clearCollection("users");

  const roles = ["member", "member", "mentor", "mentor", "member", "mentor"];

  for (let i = 1; i <= 6; i++) {
    const id = fakeUserId(i);
    const role = roles[i - 1];
    const data = {
      uid: id,
      displayName: randFullName(),
      email: randEmail(),
      photoURL: `https://i.pravatar.cc/150?u=${id}`,
      role,
      status: role === "mentor" ? "accepted" : "active",
      bio: randPhrase(),
      skills: [randWord(), randWord(), randWord()],
      linkedinUrl: randUrl(),
      createdAt: pastDate(),
      updatedAt: pastDate(),
    };

    if (DRY_RUN) {
      log(`  [dry-run] Would create user ${data.displayName} (${role})`);
    } else {
      await db.collection("users").doc(id).set(data);
      log(`  Created user ${data.displayName} (${role})`);
    }
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("CodeWithAhsan — Firestore Emulator Seed Script");
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log("\nMode: DRY RUN (no data will be written)\n");
  } else {
    console.log(`\nTarget: Firestore emulator at ${EMULATOR_HOST}`);
    console.log("Clearing existing seed data and writing fresh records...\n");
  }

  await seedUsers();
  await seedProjects();
  await seedRoadmaps();

  console.log("\n" + "=".repeat(60));
  if (DRY_RUN) {
    console.log("Dry run complete. Run without --dry-run to write data.");
  } else {
    console.log("Seed complete. Open the Emulator UI to browse the data:");
    console.log("  http://localhost:4000/firestore");
  }
  console.log("=".repeat(60));
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
