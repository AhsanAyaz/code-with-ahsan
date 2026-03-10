"use client";

import Link from "next/link";
import { Users, FolderGit2, Map, BookOpen, BookText, ArrowUpRight } from "lucide-react";

const pillars = [
  {
    title: "Mentorship",
    description:
      "Get matched with experienced developers for 1-on-1 guidance. Set goals, track progress, and level up your career with a dedicated mentor.",
    icon: Users,
    color: "text-primary",
    borderColor: "group-hover:border-primary",
    href: "/mentorship",
  },
  {
    title: "Projects",
    description:
      "Collaborate on real-world projects with structured team support. Build your portfolio and gain practical experience working with other developers.",
    icon: FolderGit2,
    color: "text-secondary",
    borderColor: "group-hover:border-secondary",
    href: "/projects",
  },
  {
    title: "Roadmaps",
    description:
      "Follow curated learning paths from beginner to advanced. Know exactly what to learn next with community-vetted progression guides.",
    icon: Map,
    color: "text-accent",
    borderColor: "group-hover:border-accent",
    href: "/roadmaps",
  },
  {
    title: "Courses",
    description:
      "In-depth video courses on Angular, React, and modern web development. Structured learning with real-world projects and exercises.",
    icon: BookOpen,
    color: "text-info",
    borderColor: "group-hover:border-info",
    href: "/courses",
  },
  {
    title: "Books",
    description:
      "Comprehensive guides and cookbooks for web development. Deep-dive references you can return to again and again as you grow.",
    icon: BookText,
    color: "text-success",
    borderColor: "group-hover:border-success",
    href: "/books",
  },
];

export default function PillarsGrid() {
  return (
    <section className="py-16 px-4 sm:px-8 md:px-12 lg:px-16 bg-base-100 relative overflow-hidden">
      {/* Section header */}
      <div className="mb-12 text-center">
        <h2 className="text-3xl md:text-5xl font-bold mb-4 text-base-content">
          Community{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
            Pillars
          </span>
        </h2>
        <p className="text-base-content/70 max-w-2xl mx-auto text-lg">
          Everything you need to learn, grow, and build — in one community.
        </p>
      </div>

      {/* Pillars grid: 3 on top + 2 centered on bottom for lg, 2-col md, 1-col mobile */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pillars.slice(0, 3).map((pillar, index) => (
          <PillarCard key={index} pillar={pillar} />
        ))}
        {/* Bottom row: 2 cards centered on lg */}
        <div className="md:col-span-2 lg:col-span-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 lg:w-2/3 lg:mx-auto">
          {pillars.slice(3).map((pillar, index) => (
            <PillarCard key={index + 3} pillar={pillar} />
          ))}
        </div>
      </div>
    </section>
  );
}

type Pillar = {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  borderColor: string;
  href: string;
};

function PillarCard({ pillar }: { pillar: Pillar }) {
  return (
    <Link
      href={pillar.href}
      className={`group card bg-base-200 border border-base-300 hover:shadow-lg transition-all duration-300 ${pillar.borderColor}`}
    >
      <div className="card-body">
        <div
          className={`w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center mb-4 ${pillar.color}`}
        >
          <pillar.icon className="w-6 h-6" />
        </div>
        <h3 className="card-title text-base-content flex items-center justify-between">
          {pillar.title}
          <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-base-content/50" />
        </h3>
        <p className="text-base-content/70 text-sm leading-relaxed">
          {pillar.description}
        </p>
      </div>
    </Link>
  );
}
