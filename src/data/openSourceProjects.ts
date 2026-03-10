export type OpenSourceProject = {
  name: string;
  description: string;
  url: string;
  stars: number;
  forks: number;
  tech: string[];
};

export const openSourceProjects: OpenSourceProject[] = [
  {
    name: "code-with-ahsan",
    description:
      "Community platform for mentorship, projects, and learning",
    url: "https://github.com/AhsanAyaz/code-with-ahsan",
    stars: 0,
    forks: 0,
    tech: ["Next.js", "TypeScript", "Firebase"],
  },
  {
    name: "ngx-device-detector",
    description:
      "An Angular v7+ library to detect the device, OS, and browser details",
    url: "https://github.com/AhsanAyaz/ngx-device-detector",
    stars: 555,
    forks: 106,
    tech: ["Angular", "TypeScript", "Device Detection"],
  },
  {
    name: "Angular Cookbook",
    description: "Code samples and recipes from the Angular Cookbook, published by Packt",
    url: "https://github.com/PacktPublishing/Angular-Cookbook",
    stars: 133,
    forks: 156,
    tech: ["Angular", "TypeScript"],
  },
  {
    name: "Angular Cookbook 2E",
    description:
      "Code samples and recipes from the Angular Cookbook, Second Edition",
    url: "https://github.com/PacktPublishing/Angular-Cookbook-2E",
    stars: 71,
    forks: 51,
    tech: ["Angular", "JavaScript"],
  },
  {
    name: "angular-deploy-gh-pages-actions",
    description:
      "GitHub Actions to automagically deploy your Angular app to GitHub Pages",
    url: "https://github.com/AhsanAyaz/angular-deploy-gh-pages-actions",
    stars: 62,
    forks: 23,
    tech: ["GitHub Actions", "Angular", "CI/CD"],
  },
  {
    name: "angular-in-90ish",
    description:
      "Slides and app for the \"Angular Crash Course | Learn Angular in 90 minutes\" tutorial",
    url: "https://github.com/AhsanAyaz/angular-in-90ish",
    stars: 51,
    forks: 41,
    tech: ["Angular", "TypeScript"],
  },
  {
    name: "ai-agents-google-adk",
    description:
      "Example of Google ADK (Agent Development Kit) with a marketing campaign assistant agent",
    url: "https://github.com/AhsanAyaz/ai-agents-google-adk",
    stars: 48,
    forks: 30,
    tech: ["Python", "AI", "Google ADK"],
  },
  {
    name: "react-in-90ish",
    description: "Course materials for the React crash course tutorial",
    url: "https://github.com/AhsanAyaz/react-in-90ish",
    stars: 45,
    forks: 9,
    tech: ["React", "AI"],
  },
  {
    name: "angular-year-calendar",
    description:
      "A powerful and performant Angular year calendar library",
    url: "https://github.com/IOMechs/angular-year-calendar",
    stars: 24,
    forks: 10,
    tech: ["Angular", "TypeScript", "Calendar"],
  },
  {
    name: "quran-notes-keeper",
    description: "A web app to keep and manage notes for Quran verses",
    url: "https://github.com/AhsanAyaz/quran-notes-keeper",
    stars: 13,
    forks: 6,
    tech: ["TypeScript", "Quran"],
  },
  {
    name: "audiencemeter-cli",
    description: "CLI tool for audience meter",
    url: "https://github.com/AhsanAyaz/audiencemeter-cli",
    stars: 1,
    forks: 0,
    tech: ["TypeScript", "CLI"],
  },
];
