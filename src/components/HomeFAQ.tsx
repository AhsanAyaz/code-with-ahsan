"use client";

import Link from "next/link";

const faqs = [
  {
    question: "What is the CodeWithAhsan community?",
    answer:
      "CodeWithAhsan is a developer community built by Muhammad Ahsan Ayaz — a Software Architect, Google Developer Expert (GDE) in Angular, and author of the Angular Cookbook. With 4,300+ members, we connect learners and professionals through Discord, mentorship, projects, and learning roadmaps.",
  },
  {
    question: "Is it free to join?",
    answer:
      "Yes! Joining the Discord server and accessing all community channels is completely free. Some programs like mentorship have a structured application process, but there is no membership fee.",
  },
  {
    question: "What kind of channels are there?",
    answer:
      "Our server has channels for announcements, general chat, help and support, project collaboration, job opportunities, mentorship, Zero to Website, tech topics (Angular, AI/ML, MERN), and hackathons.",
  },
  {
    question: "How does the mentorship program work?",
    answer:
      "Mentors apply and are vetted by the community. Once accepted, mentees can browse mentor profiles and request a match. Active mentorships get a private Discord channel for focused collaboration.",
  },
  {
    question: "What is Logic Buddy?",
    answer:
      "Logic Buddy is an AI-powered coding assistant built for the CodeWithAhsan community. It helps you work through logic problems and coding challenges step by step.",
  },
];

export default function HomeFAQ() {
  return (
    <section className="py-16 page-padding bg-base-200 border-t border-base-300">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold text-base-content mb-2">
            Got Questions?
          </h2>
          <p className="text-base-content/60 text-sm">
            <Link href="/community#faq" className="link link-hover">
              See all FAQs on the Community page →
            </Link>
          </p>
        </div>
        <div className="join join-vertical w-full">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="collapse collapse-arrow join-item border border-base-300"
            >
              <input type="radio" name="home-faq" />
              <div className="collapse-title font-semibold text-base-content">
                {faq.question}
              </div>
              <div className="collapse-content text-base-content/70">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link href="/community" className="btn btn-primary">
            Explore the Community
          </Link>
        </div>
      </div>
    </section>
  );
}
