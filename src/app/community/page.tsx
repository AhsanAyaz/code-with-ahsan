import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";

export const metadata: Metadata = {
  title: `Community Hub - ${siteMetadata.title}`,
  description:
    "Join 3,000+ developers in the CodeWithAhsan Discord community. Explore channels for mentorship, projects, Angular, AI/ML, and more.",
};

interface ChannelCategory {
  emoji: string;
  name: string;
  description: string;
  channels: string[];
  extraLink?: { label: string; href: string };
}

const channelCategories: ChannelCategory[] = [
  {
    emoji: "📢",
    name: "Important",
    description: "Official announcements, rules, and onboarding",
    channels: ["announcements", "welcome", "rules", "roles", "introduction"],
  },
  {
    emoji: "💬",
    name: "General",
    description: "Casual conversation, memes, and community ideas",
    channels: ["chit-chat", "memes", "community-ideas", "tech-news", "giveaways"],
  },
  {
    emoji: "🆘",
    name: "Help & Support",
    description: "Ask questions and get help from the community",
    channels: ["help-me", "faqs"],
  },
  {
    emoji: "🤝",
    name: "Collaboration",
    description: "Find projects, jobs, workshops, and learning resources",
    channels: [
      "projects-collaboration",
      "job-opportunities",
      "learning-resources",
      "workshops",
      "promote-yourself",
    ],
  },
  {
    emoji: "🎓",
    name: "Mentorship",
    description: "Public mentorship discussions and program updates",
    channels: ["mentorship-public", "mentors-chat", "mentees-chat"],
  },
  {
    emoji: "🌐",
    name: "Zero to Website",
    description: "Community for the Zero to Website program",
    channels: ["z2w-announcements", "z2w-support", "z2w-legends-lounge"],
    extraLink: { label: "Visit Z2W", href: "https://z2website.com" },
  },
  {
    emoji: "⚙️",
    name: "Tech Topics",
    description: "Deep-dives into specific technologies",
    channels: ["web-dev-bootcamp", "angular", "ai-ml", "mern", "google-gemini"],
  },
  {
    emoji: "🏆",
    name: "Hackathons & Events",
    description: "Past and upcoming hackathons and coding challenges",
    channels: ["hacktoberfest", "cwa-prompt-a-thon-2026", "hackstack-pakistan-2023"],
  },
];

interface FaqItem {
  question: string;
  answer: string;
}

const faqs: FaqItem[] = [
  {
    question: "What is the CodeWithAhsan community?",
    answer:
      "CodeWithAhsan is a developer community built by Ahsan Tariq focused on web development, Angular, and modern engineering practices. We connect learners and professionals through Discord, mentorship, projects, and learning roadmaps.",
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
    question: "How can I collaborate on projects?",
    answer:
      "Browse active projects on the Projects page, apply to join an existing team, or propose your own project. Approved projects get a dedicated Discord channel for team communication.",
  },
  {
    question: "What is the Zero to Website community?",
    answer:
      "Zero to Website (Z2W) is a structured learning program for beginners building their first website. Members get their own channels for announcements, support, and showcasing progress.",
  },
  {
    question: "Are there any events or hackathons?",
    answer:
      "Yes! We run hackathons like Hacktoberfest participation, HackStack Pakistan, and the CWA Prompt-a-thon. Watch #announcements for upcoming events.",
  },
  {
    question: "What is Logic Buddy?",
    answer:
      "Logic Buddy is an AI-powered coding assistant built for the CodeWithAhsan community. It helps you work through logic problems and coding challenges step by step.",
  },
];

export default function CommunityPage() {
  return (
    <div>
      {/* Hero Section */}
      <section className="bg-base-200 page-padding py-16">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-6 text-base-content">
            Join the CodeWithAhsan Community
          </h1>
          <p className="text-lg text-base-content/70 mb-10">
            3,000+ developers learning, building, and growing together. Jump into our Discord to
            connect, get help, and collaborate on real projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href="https://discord.gg/KSPpuxD8SG"
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary"
            >
              Join Discord
            </a>
            <a href="#channels" className="btn btn-outline">
              Browse Channels
            </a>
          </div>
        </div>
      </section>

      {/* Discord Channels Section */}
      <section id="channels" className="bg-base-100 page-padding py-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-base-content text-center">
          Explore Our Channels
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {channelCategories.map((category) => (
            <div
              key={category.name}
              className="card bg-base-200 border border-base-300"
            >
              <div className="card-body">
                <h3 className="card-title text-base-content">
                  <span className="text-2xl">{category.emoji}</span>
                  {category.name}
                </h3>
                <p className="text-base-content/70 text-sm">{category.description}</p>
                <ul className="mt-3 space-y-1">
                  {category.channels.map((channel) => (
                    <li key={channel} className="text-sm text-base-content/60">
                      #{channel}
                    </li>
                  ))}
                </ul>
                <div className="card-actions mt-4 flex flex-wrap gap-2">
                  <a
                    href="https://discord.gg/KSPpuxD8SG"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline"
                  >
                    Join Channel
                  </a>
                  {category.extraLink && (
                    <a
                      href={category.extraLink.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-ghost"
                    >
                      {category.extraLink.label}
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-base-200 page-padding py-16">
        <h2 className="text-3xl md:text-4xl font-bold mb-10 text-base-content text-center">
          Frequently Asked Questions
        </h2>
        <div className="join join-vertical w-full max-w-3xl mx-auto">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className="collapse collapse-arrow join-item border border-base-300"
            >
              <input type="radio" name="community-faq" />
              <div className="collapse-title font-semibold text-base-content">
                {faq.question}
              </div>
              <div className="collapse-content text-base-content/70">
                <p>{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
