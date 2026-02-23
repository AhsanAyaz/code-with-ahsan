"use client";

import React from "react";
// @ts-ignore
import Button from "@/components/Button";
// @ts-ignore
import NoSSRWrapper from "@/components/NoSSRWrapper";
import InteractiveHero from "./InteractiveHero";
import Image from "next/image";
import { useTheme } from "next-themes";

const Promptathon2026Base = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
      {/* Hero Section */}
      <section>
        <InteractiveHero />
      </section>

      {/* Main CTA */}
      <section className="flex justify-center">
        <Button
          onClick={() => {
            window.open("https://forms.gle/spjYMMC58Si3RoP49", "_blank");
          }}
          className="text-lg px-8 py-4 shadow-lg hover:shadow-xl transform hover:-translate-y-1 transition-all"
          color="hackstack"
          title="Register Now"
          href={undefined}
        >
          Register Now (10 Teams Maximum)
        </Button>
      </section>

      {/* About Section */}
      <section className="flex flex-col gap-6 md:px-12">
        <h2 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-400 via-purple-400 to-pink-400 border-b pb-4">
          What is Prompt-a-thon 2026?
        </h2>
        <div className="prose dark:prose-invert max-w-none text-lg">
          <p>
            The <strong>Code With Ahsan Prompt-a-thon 2026</strong> is an
            exciting Hackathon & Innovation Sprint focused on the theme of{" "}
            <strong>Generative AI & Build with AI</strong>.
          </p>
          <p>
            This event brings together developers, AI enthusiasts, and
            problem-solvers to collaborate, build, and showcase innovative
            solutions using Generative AI. Whether you are a beginner or an
            expert, this hackathon provides a platform to pair program, receive
            mentorship from industry leaders, and build the future of tech
            together.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <div
            className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="text-3xl mb-2">🤝</div>
            <h3 className="text-xl font-semibold mb-2">Collaboration</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Experts and beginners coding side-by-side. Cultivating the next
              generation of engineers.
            </p>
          </div>
          <div
            className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="text-3xl mb-2">🎓</div>
            <h3 className="text-xl font-semibold mb-2">Mentorship</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Mentors guiding teams, providing real-time code reviews and
              architectural advice.
            </p>
          </div>
          <div
            className={`p-6 rounded-xl border ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
          >
            <div className="text-3xl mb-2">🚀</div>
            <h3 className="text-xl font-semibold mb-2">Innovation</h3>
            <p className="text-gray-600 dark:text-gray-400">
              Build incredible AI apps, scaling ideas to reality in a
              high-energy sprint.
            </p>
          </div>
        </div>
      </section>

      {/* Structure Document */}
      <section
        className={`p-8 md:p-12 rounded-2xl flex flex-col items-center text-center gap-6 ${isDark ? "bg-primary-900/20 border border-primary-800" : "bg-primary-50 border border-primary-100"}`}
      >
        <h2 className="text-3xl font-bold">Event Structure</h2>
        <p className="text-lg max-w-2xl text-gray-700 dark:text-gray-300">
          Want a detailed breakdown of the schedule, guidelines, and rules for
          the hackathon? Please read our official structure document.
        </p>
        <Button
          onClick={() => {
            window.open(
              "https://docs.google.com/document/d/1bTcMa4r5XBHabCD-OiH2Bzn714hK-8NdnaUwJXrIf3M/edit?tab=t.0",
              "_blank",
            );
          }}
          color="primary"
          title="View Event Structure"
          href={undefined}
        >
          View Event Structure Doc
        </Button>
      </section>

      {/* Contact Footnote */}
      <section className="text-center mt-8 pb-12 text-gray-500 text-sm">
        <p>
          Interested in sponsoring? Contact us at{" "}
          <a
            href="mailto:maham.visionwiseab@gmail.com"
            className="text-primary-600 hover:underline"
          >
            maham.visionwiseab@gmail.com
          </a>{" "}
          or{" "}
          <a
            href="mailto:ahsan.ubitian@gmail.com"
            className="text-primary-600 hover:underline"
          >
            ahsan.ubitian@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
};

const Promptathon2026 = () => {
  return (
    <NoSSRWrapper>
      <Promptathon2026Base />
    </NoSSRWrapper>
  );
};

export default Promptathon2026;
