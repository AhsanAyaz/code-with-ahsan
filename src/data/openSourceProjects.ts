// TODO: Update with actual GitHub URLs and star counts
export type OpenSourceProject = {
  name: string;
  description: string;
  url: string;
  stars?: string;
  tech: string[];
};

export const openSourceProjects: OpenSourceProject[] = [
  {
    name: "ng-cookbook",
    description: "Code samples and recipes from the Angular Cookbook",
    url: "https://github.com/nickalchemist/ng-cookbook",
    tech: ["Angular", "TypeScript"],
  },
  {
    name: "ng-logicbuddy",
    description: "A Logic Buddy game built with Angular",
    url: "https://github.com/ahsanayaz/ng-logicbuddy",
    tech: ["Angular", "TypeScript"],
  },
  {
    name: "code-with-ahsan",
    description:
      "Community platform for mentorship, projects, and learning",
    url: "https://github.com/ahsanayaz/code-with-ahsan",
    tech: ["Next.js", "TypeScript", "Firebase"],
  },
];
