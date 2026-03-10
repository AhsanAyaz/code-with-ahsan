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
    period: "Feb 2024 - Present",
    location: "Stockholm, Sweden",
    description:
      "Leading frontend architecture in the platform team, establishing best practices across the organization.",
    current: true,
  },
  {
    company: "School of Applied Technology </salt>",
    role: "Software Architect & Head Instructor - JavaScript",
    period: "Nov 2022 - Feb 2024",
    location: "Stockholm, Sweden",
    description:
      "Trained developers via the bootcamp program, led junior instructors, and facilitated the up-skill program for professional software developers.",
  },
  {
    company: "Syncron",
    role: "Software Architect",
    period: "Jul 2021 - Nov 2022",
    location: "Stockholm, Sweden",
    description:
      "Unified UI/UX across products as Frontend Architect. Led the core frontend/design system team, consulted engineering managers and designers on scalable architecture practices.",
  },
  {
    company: "Klarna",
    role: "Senior Software Engineer",
    period: "Oct 2019 - Jul 2021",
    location: "Stockholm, Sweden",
    description:
      "Worked as a Senior Software Engineer at one of Europe's largest fintech companies.",
  },
  {
    company: "Modus Create, Inc",
    role: "Software Architect",
    period: "Jul 2017 - Jul 2019",
    location: "Reston, VA (Remote)",
    description:
      "Architected Web & Hybrid mobile applications using Angular & Ionic. Previously Senior Full Stack Engineer focusing on Angular, AngularJS, and NodeJS.",
  },
  {
    company: "Packt",
    role: "Author & Tech Advisory Board Member",
    period: "Jan 2019 - Present",
    location: "Remote",
    description:
      "Authored multiple technical books. Currently serving on the Tech Advisory Board shaping the roadmap for future Web-focused publications.",
    current: true,
  },
  {
    company: "Recurship",
    role: "Senior Software Engineer",
    period: "Mar 2017 - Jul 2017",
    location: "Karachi, Pakistan",
    description:
      "Focused on MEAN stack with Angular and Loopback (NodeJS). Led a small team of developers.",
  },
  {
    company: "KoderLabs",
    role: "Senior Software Engineer",
    period: "Oct 2014 - Feb 2017",
    location: "Karachi, Pakistan",
    description:
      "Web Development & Hybrid Mobile Applications Lead. Led teams on AngularJS, Ionic, Angular, and full-stack web technologies.",
  },
  {
    company: "Colwiz Private Ltd",
    role: "System Engineer",
    period: "Jul 2013 - Oct 2014",
    location: "Karachi, Pakistan",
    description:
      "Front-end development of HTML5 product features including an interactive PDF reader using AngularJS.",
  },
];
