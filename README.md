# CodeWithAhsan

A community platform for mentorship, open-source project collaboration, learning roadmaps, and courses — built by [Ahsan Ayaz](https://codewithahsan.dev).

[![Twitch](https://img.shields.io/badge/Twitch-9146FF?style=for-the-badge&logo=twitch&logoColor=white)](https://twitch.tv/codewithahsan)
[![GitHub Profile](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://www.github.com/ahsanayaz)
[![LinkedIn Profile](https://img.shields.io/badge/Twitter-1DA1F2?style=for-the-badge&logo=twitter&logoColor=white)](https://www.linkedin.com/in/ahsanayaz)
[![Twitter Profile](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://twitter.com/codewith_ahsan)
[![Instagram Profile](https://img.shields.io/badge/Facebook-1877F2?style=for-the-badge&logo=facebook&logoColor=white)](https://instagram.com/muhd.ahsanayaz)
[![Facebook Profile](https://img.shields.io/badge/Instagram-E4405F?style=for-the-badge&logo=instagram&logoColor=white)](https://facebook.com/muhd.ahsanayaz)
[![TikTok Profile](https://img.shields.io/badge/TikTok-000000?style=for-the-badge&logo=tiktok&logoColor=white)](https://www.tiktok.com/@muhd.ahsanayaz)
[![CodeWithAhsan Discord](https://img.shields.io/discord/814191682282717194.svg?label=CodeWithAhsan&logo=Discord&colorB=7289da&style=for-the-badge)](https://discord.gg/rEBSSh926k)

---

## Features

- **Mentorship program** — Apply to become a mentee, get matched with an accepted mentor
- **Project collaboration** — Submit open-source projects, recruit contributors, manage teams
- **Learning roadmaps** — Mentors publish structured learning paths; community members follow them
- **Courses & content** — MDX-based course posts, YouTube integration, and a blog
- **Events / Promptathon** — Live interactive events with presenter panels and winner display
- **Discord integration** — Automatic channel provisioning and role assignment on signup

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| UI | React 19, Tailwind CSS v4, DaisyUI |
| Language | TypeScript |
| Backend | Next.js API Routes (serverless) |
| Database | Firebase Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Storage |
| Testing | Vitest, @firebase/rules-unit-testing |
| Deployment | Vercel |

---

## Local Development Setup

### Prerequisites

- **Node.js 18+** — [nodejs.org](https://nodejs.org)
- **npm** (comes with Node.js)
- **Firebase CLI** — `npm install -g firebase-tools`
- **Java Runtime (JRE)** — required by Firebase emulators ([download](https://adoptium.net))

### Steps

1. **Clone the repository**

   ```bash
   git clone https://github.com/ahsanayaz/code-with-ahsan.git
   cd code-with-ahsan
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   ```

   For local development with Firebase emulators, the default placeholder values in `.env.local` are sufficient — you do **not** need real Firebase credentials. See `.env.example` for documentation on each variable.

4. **Start Firebase emulators**

   ```bash
   firebase emulators:start
   ```

   This starts Auth (port 9099), Firestore (port 8080), Storage (port 9199), and Functions (port 5001). The emulator UI is available at <http://localhost:4000>.

5. **Seed the emulator with sample data**

   In a new terminal:

   ```bash
   npm run seed
   ```

   This populates Firestore with sample users, projects, and roadmaps so you can explore the app immediately.

6. **Start the development server**

   ```bash
   npm run dev
   ```

   The app is now running at <http://localhost:3000>.

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start Next.js dev server with Turbopack |
| `npm run build` | Production build (also runs content prebuild and sitemap) |
| `npm start` | Start production server (after build) |
| `npm run lint` | Run ESLint |
| `npm test` | Run all Vitest unit tests |
| `npm run test:watch` | Run Vitest in watch mode |
| `npm run test:rules` | Run Firestore security rules tests against emulator |
| `npm run seed` | Seed Firebase emulator with sample data |

---

## Project Structure

```
src/
  app/               # Next.js App Router — pages, layouts, API routes
  components/        # Reusable React components
  lib/               # Firebase client/admin init, utility libraries
  services/          # Data access layer (Firestore queries, external APIs)
  types/             # Shared TypeScript types and interfaces
scripts/             # Utility and maintenance scripts (tsx)
content/             # MDX course and blog content
firestore.rules      # Firestore security rules
storage.rules        # Storage security rules
firebase.json        # Firebase project config (emulator ports, etc.)
```

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full contributor guide.

Quick summary:
- Fork the repo and create a branch from `main`
- Follow the local setup steps above
- Run `npm test` and `npm run test:rules` before opening a PR
- Open a pull request with a clear description

---

## About the Author

<img style="border-radius: 50%;" src="./public/static/images/pfp.jpeg"/>

I'm a Muslim, an author of [3 world-wide published books](https://codewithahsan.dev/books), a Google Developers Expert in AI & Angular, an international speaker, and a Software Architect. I create tech tutorials on [YouTube](https://codewithahsan.dev/youtube) and write articles at my blog <https://blog.codewithahsan.dev>.

<a title="Like Ahsan's work? Buy him a coffee" class="bmac" href="https://www.buymeacoffee.com/codewithahsan">
<img src="https://img.buymeacoffee.com/button-api/?text=Buy%20me%20a%20coffee&emoji=&slug=codewithahsan&button_colour=BD5FFF&font_colour=ffffff&font_family=Comic&outline_colour=000000&coffee_colour=FFDD00" />
</a>

---

## License

This project does not currently have an open-source license. Please contact the author before reusing code commercially.
