"use client";

import React from "react";
// @ts-ignore
import NoSSRWrapper from "@/components/NoSSRWrapper";
import { useTheme } from "next-themes";

const SPONSORS = [
  {
    tier: "Platinum",
    amount: "$5,000",
    color: "from-gray-300 to-gray-400",
    features: [
      "Mention in Social Media Coverage (All posts)",
      "1 Speaker Slot",
      "CVs of participants",
      "Swag Distribution",
      "Logo on Conference Page",
      "Logo on Stream Overlays",
      "Product use in hackathon",
      "Dedicated Discord channel",
    ],
  },
  {
    tier: "Gold",
    amount: "$3,500",
    color: "from-yellow-300 to-yellow-500",
    features: [
      "Partial Social Media Coverage",
      "1 Speaker Slot",
      "Swag Distribution",
      "Logo on Conference Page",
      "Logo on Stream Overlays",
      "Product use in hackathon",
      "Dedicated Discord channel",
    ],
  },
  {
    tier: "Silver",
    amount: "$2,000",
    color: "from-gray-300 to-gray-400",
    features: [
      "2-3 Social Media posts",
      "Swag Distribution",
      "Logo on Conference Page",
      "Product use in hackathon",
    ],
  },
  {
    tier: "Bronze",
    amount: "$1,000",
    color: "from-orange-300 to-orange-500",
    features: ["1-2 Social Media posts", "Swag Distribution"],
  },
];

const SponsorshipsBase = () => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col gap-16">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto mt-12 mb-8">
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-purple-600 mb-6">
          Sponsor CWA Prompt-a-thon 2026
        </h1>
        <p className="text-xl md:text-2xl font-light text-gray-700 dark:text-gray-300">
          Reach 4,000+ global tech enthusiasts, access a powerful talent
          pipeline, and place your brand in a high-trust technical environment.
        </p>
      </section>

      {/* Sponsorship Section */}
      <section className="flex flex-col gap-8 md:px-12">
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 items-stretch">
          {SPONSORS.map((sponsor) => (
            <div
              key={sponsor.tier}
              className={`flex flex-col rounded-2xl overflow-hidden border ${isDark ? "bg-gray-800/50 border-gray-700" : "bg-white border-gray-200 shadow-sm"}`}
            >
              <div
                className={`p-6 bg-gradient-to-br ${sponsor.color} text-gray-900`}
              >
                <h3 className="text-2xl font-bold">{sponsor.tier}</h3>
                <div className="text-3xl font-extrabold mt-2">
                  {sponsor.amount}
                </div>
              </div>
              <div className="p-6 flex-1">
                <ul className="space-y-3">
                  {sponsor.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-3">
                      <svg
                        className="h-5 w-5 text-green-500 shrink-0 mt-0.5"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Footnote */}
      <section className="text-center mt-8 pb-12 text-lg text-gray-600 dark:text-gray-400">
        <p>
          Interested in a custom sponsorship package? Contact us at{" "}
          <br className="sm:hidden" />
          <a
            href="mailto:maham.visionwiseab@gmail.com"
            className="text-primary-600 hover:underline font-semibold mx-2"
          >
            maham.visionwiseab@gmail.com
          </a>
          or
          <a
            href="mailto:ahsan.ubitian@gmail.com"
            className="text-primary-600 hover:underline font-semibold mx-2"
          >
            ahsan.ubitian@gmail.com
          </a>
        </p>
      </section>
    </div>
  );
};

const Sponsorships = () => {
  return (
    <NoSSRWrapper>
      <SponsorshipsBase />
    </NoSSRWrapper>
  );
};

export default Sponsorships;
