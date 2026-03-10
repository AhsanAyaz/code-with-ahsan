export type WorkEntry = {
  company: string;
  role: string;
  period: string;
  location: string;
  description: string;
  current?: boolean;
};

export const workHistory: WorkEntry[] = [
  {
    company: "Scania Group",
    role: "Software Architect",
    period: "2021 - Present",
    location: "Stockholm, Sweden",
    description:
      "Leading frontend architecture and developer experience for connected vehicle platforms.",
    current: true,
  },
  {
    company: "Visionarea / Ciklum",
    role: "Senior Software Engineer",
    period: "2019 - 2021",
    location: "Stockholm, Sweden",
    description:
      "Built enterprise Angular applications and mentored junior developers.",
  },
  {
    company: "Creatix / Gaditek",
    role: "Software Engineer",
    period: "2015 - 2019",
    location: "Karachi, Pakistan",
    description:
      "Full-stack development on multiple product lines serving millions of users.",
  },
  {
    company: "7Vals",
    role: "Frontend Developer",
    period: "2013 - 2015",
    location: "Karachi, Pakistan",
    description:
      "Built responsive web applications and contributed to UI component libraries.",
  },
];
