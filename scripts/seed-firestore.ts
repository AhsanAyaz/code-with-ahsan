/**
 * scripts/seed-firestore.ts
 *
 * Seeds the Firebase emulator Firestore with sample data so new contributors
 * can explore the app without needing production credentials.
 *
 * Usage:
 *   npm run seed                    # clears and writes fresh data
 *   npm run seed -- --dry-run       # prints what would be written, no writes
 *   npm run seed:clear              # clears all seed data without re-seeding
 *
 * Prerequisites:
 *   npm run emulators               # must be running on localhost:8080
 */

import * as admin from "firebase-admin";
import { randUser, randParagraph, randPastDate, randJobTitle } from "@ngneat/falso";
import bcrypt from "bcryptjs";

// ─── Init ────────────────────────────────────────────────────────────────────

const DRY_RUN = process.argv.includes("--dry-run");
const CLEAR_ONLY = process.argv.includes("--clear");
const PROJECT_ID = "demo-codewithahsan";
const EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST ?? "localhost:8080";

if (!DRY_RUN) {
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

function userId(n: number) {
  return `seed-user-${String(n).padStart(4, "0")}`;
}

function pastTimestamp() {
  return admin.firestore.Timestamp.fromDate(
    randPastDate({ years: 1 }) as unknown as Date
  );
}

const SEED_COLLECTIONS = [
  "users",
  "mentorship_profiles",
  "mentorship_sessions",
  "mentor_ratings",
  "projects",
  "roadmaps",
  "admin_sessions",
];

async function clearCollection(name: string) {
  if (DRY_RUN) return;
  const snap = await db.collection(name).get();
  if (snap.empty) return;
  const batches: admin.firestore.WriteBatch[] = [];
  let batch = db.batch();
  let count = 0;
  for (const doc of snap.docs) {
    batch.delete(doc.ref);
    count++;
    if (count % 500 === 0) {
      batches.push(batch);
      batch = db.batch();
    }
  }
  batches.push(batch);
  await Promise.all(batches.map((b) => b.commit()));
  log(`  Cleared ${snap.size} docs from "${name}"`);
}

async function clearAll() {
  log("\nClearing all seed collections...");
  await Promise.all(SEED_COLLECTIONS.map(clearCollection));
}

// ─── Users (generated once, reused across all seed functions) ─────────────────

const FAKE_USERS = Array.from({ length: 8 }, () => randUser({ gender: "male" }));

function fakeUser(n: number) { return FAKE_USERS[n - 1]; } // 1-indexed
function displayName(n: number) { const u = fakeUser(n); return `${u.firstName} ${u.lastName}`; }
function photoURL(n: number) { return fakeUser(n).img + `?u=${fakeUser(n).id}`; }
function email(n: number) { return fakeUser(n).email; }
function username(n: number) { return fakeUser(n).username.toLowerCase(); }

// ─── Seed: Users (Firebase Auth stand-ins) ───────────────────────────────────

async function seedUsers() {
  log("\n[users] Seeding 8 sample users...");

  const roles = ["mentor", "mentor", "mentor", "mentor", "member", "member", "member", "member"];

  for (let i = 1; i <= 8; i++) {
    const id = userId(i);
    const name = displayName(i);
    const role = roles[i - 1];
    const data = {
      uid: id,
      displayName: name,
      email: email(i),
      photoURL: photoURL(i),
      role,
      createdAt: pastTimestamp(),
      updatedAt: pastTimestamp(),
    };
    if (DRY_RUN) {
      log(`  [dry-run] Would create user ${name} (${role})`);
    } else {
      await db.collection("users").doc(id).set(data);
      log(`  Created user ${name} (${role})`);
    }
  }
}

// ─── Seed: Mentorship Profiles ────────────────────────────────────────────────

const EXPERTISE_SETS = [
  ["React", "Next.js", "TypeScript", "Firebase"],
  ["Python", "FastAPI", "Machine Learning", "Docker"],
  ["Node.js", "PostgreSQL", "GraphQL", "AWS"],
  ["Angular", "Java", "Spring Boot", "Kubernetes"],
];

async function seedMentorshipProfiles() {
  log("\n[mentorship_profiles] Seeding mentor and mentee profiles...");

  const mentorRoles = ["Senior Frontend Engineer", "ML Engineer", "Staff Backend Engineer", "Engineering Manager"];

  for (let i = 1; i <= 4; i++) {
    const id = userId(i);
    const name = displayName(i);
    const data = {
      uid: id,
      displayName: name,
      photoURL: photoURL(i),
      email: email(i),
      role: "mentor",
      status: "accepted",
      isPublic: true,
      currentRole: mentorRoles[i - 1],
      expertise: EXPERTISE_SETS[i - 1],
      bio: randParagraph({ length: 1 }),
      username: username(i),
      discordUsername: `${username(i)}#0001`,
      maxMentees: 3,
      createdAt: pastTimestamp(),
      updatedAt: pastTimestamp(),
    };
    if (DRY_RUN) {
      log(`  [dry-run] Would create mentor profile: ${name}`);
    } else {
      await db.collection("mentorship_profiles").doc(id).set(data);
      log(`  Created mentor profile: ${name} (${mentorRoles[i - 1]})`);
    }
  }

  for (let i = 5; i <= 8; i++) {
    const id = userId(i);
    const name = displayName(i);
    const data = {
      uid: id,
      displayName: name,
      photoURL: photoURL(i),
      email: email(i),
      role: "mentee",
      status: "accepted",
      isPublic: false,
      currentRole: randJobTitle(),
      expertise: [],
      bio: randParagraph({ length: 1 }),
      username: username(i),
      createdAt: pastTimestamp(),
      updatedAt: pastTimestamp(),
    };
    if (DRY_RUN) {
      log(`  [dry-run] Would create mentee profile: ${name}`);
    } else {
      await db.collection("mentorship_profiles").doc(id).set(data);
      log(`  Created mentee profile: ${name}`);
    }
  }
}

// ─── Seed: Mentorship Sessions ────────────────────────────────────────────────

async function seedMentorshipSessions() {
  log("\n[mentorship_sessions] Seeding mentorship sessions...");

  const sessions = [
    { mentorId: userId(1), menteeId: userId(5), status: "active" },
    { mentorId: userId(1), menteeId: userId(6), status: "active" },
    { mentorId: userId(2), menteeId: userId(7), status: "active" },
    { mentorId: userId(3), menteeId: userId(8), status: "active" },
    { mentorId: userId(2), menteeId: userId(5), status: "completed" },
    { mentorId: userId(4), menteeId: userId(6), status: "completed" },
  ];

  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    const data = { mentorId: s.mentorId, menteeId: s.menteeId, status: s.status, createdAt: pastTimestamp(), updatedAt: pastTimestamp() };
    if (DRY_RUN) {
      log(`  [dry-run] Would create session ${s.mentorId} → ${s.menteeId} (${s.status})`);
    } else {
      await db.collection("mentorship_sessions").doc(`seed-session-${String(i + 1).padStart(3, "0")}`).set(data);
      log(`  Created session: ${s.mentorId} → ${s.menteeId} (${s.status})`);
    }
  }
}

// ─── Seed: Mentor Ratings ─────────────────────────────────────────────────────

async function seedMentorRatings() {
  log("\n[mentor_ratings] Seeding mentor ratings...");

  const ratings = [
    { mentorId: userId(1), menteeId: userId(5), rating: 5 },
    { mentorId: userId(2), menteeId: userId(5), rating: 4 },
    { mentorId: userId(3), menteeId: userId(8), rating: 5 },
    { mentorId: userId(4), menteeId: userId(6), rating: 4 },
    { mentorId: userId(1), menteeId: userId(7), rating: 5 },
  ];

  for (let i = 0; i < ratings.length; i++) {
    const r = ratings[i];
    const data = { mentorId: r.mentorId, menteeId: r.menteeId, rating: r.rating, createdAt: pastTimestamp() };
    if (DRY_RUN) {
      log(`  [dry-run] Would create rating ${r.rating}★ for ${r.mentorId}`);
    } else {
      await db.collection("mentor_ratings").doc(`seed-rating-${String(i + 1).padStart(3, "0")}`).set(data);
      log(`  Created rating: ${r.rating}★ for ${r.mentorId}`);
    }
  }
}

// ─── Seed: Projects ───────────────────────────────────────────────────────────

const TECH_STACKS = [
  ["React", "Next.js", "TypeScript", "Firebase"],
  ["Python", "FastAPI", "OpenAI", "GitHub Actions"],
  ["React Native", "Expo", "Firebase", "TypeScript"],
  ["Angular", "Node.js", "MongoDB", "Tailwind CSS"],
];

function creatorProfile(n: number) {
  return { displayName: displayName(n), photoURL: photoURL(n), username: username(n) };
}

async function seedProjects() {
  log("\n[projects] Seeding 4 sample projects...");

  const projects = [
    {
      id: "seed-project-001",
      title: "Community Learning Dashboard",
      description: "A collaborative dashboard where learners track their progress, share resources, and celebrate milestones together. Integrates with GitHub to pull commit activity and visualises learning streaks.",
      status: "active",
      creatorId: userId(1),
      creatorProfile: creatorProfile(1),
      techStack: TECH_STACKS[0],
      githubRepo: "https://github.com/demo/community-learning-dashboard",
      difficulty: "intermediate",
      maxTeamSize: 5,
      memberCount: 2,
    },
    {
      id: "seed-project-002",
      title: "AI Code Review Bot",
      description: "A GitHub bot that uses OpenAI to give constructive code review comments on pull requests. Catches common patterns, suggests improvements, and explains reasoning for each suggestion.",
      status: "active",
      creatorId: userId(2),
      creatorProfile: creatorProfile(2),
      techStack: TECH_STACKS[1],
      githubRepo: "https://github.com/demo/ai-code-review-bot",
      difficulty: "advanced",
      maxTeamSize: 3,
      memberCount: 2,
    },
    {
      id: "seed-project-003",
      title: "Mobile Mentorship Tracker",
      description: "Cross-platform mobile app for mentors and mentees to schedule sessions, set goals, track progress, and share resources — all in one place.",
      status: "active",
      creatorId: userId(3),
      creatorProfile: creatorProfile(3),
      techStack: TECH_STACKS[2],
      githubRepo: "",
      difficulty: "intermediate",
      maxTeamSize: 4,
      memberCount: 1,
    },
    {
      id: "seed-project-004",
      title: "Open-Source Blog Engine",
      description: "A lightweight, markdown-first blog engine built for developers. Supports syntax highlighting, RSS feeds, dark mode, and deploys to any static host in seconds.",
      status: "completed",
      creatorId: userId(4),
      creatorProfile: creatorProfile(4),
      techStack: TECH_STACKS[3],
      githubRepo: "https://github.com/demo/open-source-blog-engine",
      difficulty: "beginner",
      maxTeamSize: 3,
      memberCount: 3,
    },
  ];

  for (const p of projects) {
    const { id, ...data } = p;
    const doc = { ...data, lastActivityAt: pastTimestamp(), createdAt: pastTimestamp(), updatedAt: pastTimestamp() };
    if (DRY_RUN) {
      log(`  [dry-run] Would create project "${data.title}" (${data.status})`);
    } else {
      await db.collection("projects").doc(id).set(doc);
      log(`  Created project "${data.title}" (${data.status})`);
    }
  }
}

// ─── Seed: Roadmaps ───────────────────────────────────────────────────────────

async function seedRoadmaps() {
  log("\n[roadmaps] Seeding 3 sample roadmaps...");

  const roadmaps = [
    {
      id: "seed-roadmap-001",
      title: "Full-Stack Web Development with Next.js",
      description: "Go from zero to deploying production Next.js apps. Covers React fundamentals, server components, Firebase, and CI/CD.",
      domain: "web-dev",
      difficulty: "beginner",
      estimatedHours: 120,
      status: "approved",
      contentUrl: null,
      creatorId: userId(1),
      creatorProfile: creatorProfile(1),
    },
    {
      id: "seed-roadmap-002",
      title: "Backend Engineering with Node.js",
      description: "Master server-side development: REST APIs, databases, authentication, and cloud deployment with Node.js and PostgreSQL.",
      domain: "backend",
      difficulty: "intermediate",
      estimatedHours: 80,
      status: "approved",
      contentUrl: null,
      creatorId: userId(3),
      creatorProfile: creatorProfile(3),
    },
    {
      id: "seed-roadmap-003",
      title: "Practical Machine Learning with Python",
      description: "Hands-on ML: from data wrangling with pandas to deploying scikit-learn and PyTorch models in production.",
      domain: "ml",
      difficulty: "advanced",
      estimatedHours: 160,
      status: "approved",
      contentUrl: null,
      creatorId: userId(2),
      creatorProfile: creatorProfile(2),
    },
  ];

  for (const r of roadmaps) {
    const { id, ...data } = r;
    const doc = { ...data, version: 1, createdAt: pastTimestamp(), updatedAt: pastTimestamp() };
    if (DRY_RUN) {
      log(`  [dry-run] Would create roadmap "${data.title}" (${data.domain} / ${data.difficulty})`);
    } else {
      await db.collection("roadmaps").doc(id).set(doc);
      log(`  Created roadmap "${data.title}" (${data.domain})`);
    }
  }
}

// ─── Seed: Admin Config ───────────────────────────────────────────────────────

async function seedAdminConfig() {
  log("\n[config/admin] Seeding admin password (password: \"admin\")...");
  if (DRY_RUN) {
    log('  [dry-run] Would set config/admin with bcrypt hash of "admin"');
    return;
  }
  const passwordHash = await bcrypt.hash("admin", 10);
  await db.collection("config").doc("admin").set({ passwordHash });
  log('  Set admin password to "admin" (bcrypt hashed)');
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("=".repeat(60));
  console.log("CodeWithAhsan — Firestore Emulator Seed Script");
  console.log("=".repeat(60));

  if (DRY_RUN) {
    console.log("\nMode: DRY RUN (no data will be written)\n");
  } else if (CLEAR_ONLY) {
    console.log("\nMode: CLEAR ONLY\n");
    await clearAll();
    console.log("\nDone. All seed collections cleared.");
    console.log("=".repeat(60));
    return;
  } else {
    console.log(`\nTarget: Firestore emulator at ${EMULATOR_HOST}`);
    console.log("Clearing and re-seeding all collections...\n");
    await clearAll();
  }

  await seedUsers();
  await seedMentorshipProfiles();
  await seedMentorshipSessions();
  await seedMentorRatings();
  await seedProjects();
  await seedRoadmaps();
  await seedAdminConfig();

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
