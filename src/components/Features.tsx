"use client";

import Link from "next/link";
import { BookOpen, Users, Video, BookText, ArrowUpRight } from "lucide-react";

const features = [
  {
    title: "Courses",
    description:
      "In-depth video courses covering Angular, React, System Design, and modern web architecture.",
    icon: BookOpen,
    color: "text-primary",
    borderColor: "group-hover:border-primary",
    href: "/courses",
  },
  {
    title: "Books",
    description:
      "Comprehensive guides and cookbooks to master Angular and web development fundamentals.",
    icon: BookText,
    color: "text-secondary",
    borderColor: "group-hover:border-secondary",
    href: "/books",
  },
  {
    title: "YouTube Content",
    description:
      "Weekly tutorials, live coding sessions, and tech talks for the developer community.",
    icon: Video,
    color: "text-accent",
    borderColor: "group-hover:border-accent",
    href: "https://youtube.com/c/CodeWithAhsan",
  },
  {
    title: "Community",
    description:
      "Join our Discord community to connect with 3000+ fellow developers and get help on your projects.",
    icon: Users,
    color: "text-info",
    borderColor: "group-hover:border-info",
    href: "https://discord.gg/KSPpuxD8SG",
  },
];

export default function Features() {
  return (
    <section className="py-16 px-4 sm:px-8 md:px-12 lg:px-16 bg-base-100 relative overflow-hidden">
      <div className="mb-12">
        <h2 className="text-3xl md:text-5xl font-bold mb-6 text-base-content">
          <span className="text-primary">//</span> Expertise
        </h2>
        <p className="text-base-content/70 max-w-2xl text-lg">
          Sharing knowledge through multiple channels to help you become a
          world-class engineer.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Link
            key={index}
            href={feature.href}
            className={`group card bg-base-200 border border-base-300 hover:shadow-lg transition-all duration-300 ${feature.borderColor}`}
          >
            <div className="card-body">
              <div
                className={`w-12 h-12 rounded-lg bg-base-300 flex items-center justify-center mb-4 ${feature.color}`}
              >
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="card-title text-base-content flex items-center justify-between">
                {feature.title}
                <ArrowUpRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity text-base-content/50" />
              </h3>
              <p className="text-base-content/70 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
