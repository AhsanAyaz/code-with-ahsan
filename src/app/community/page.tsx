import { Metadata } from "next";
// @ts-ignore
import siteMetadata from "@/data/siteMetadata";

export const metadata: Metadata = {
  title: `Community Hub - ${siteMetadata.title}`,
  description:
    "Join 4,300+ developers in the CodeWithAhsan Discord community. Explore channels for mentorship, projects, Angular, AI/ML, and more.",
  openGraph: {
    title: `Community Hub - ${siteMetadata.title}`,
    description:
      "Join 4,300+ developers in the CodeWithAhsan Discord community. Explore channels for mentorship, projects, Angular, AI/ML, and more.",
    images: ["/images/community-og.png"],
  },
  twitter: {
    card: "summary_large_image",
    title: `Community Hub - ${siteMetadata.title}`,
    description:
      "Join 4,300+ developers in the CodeWithAhsan Discord community. Explore channels for mentorship, projects, Angular, AI/ML, and more.",
    images: ["/images/community-og.png"],
  },
};

const GUILD_ID = "814191682282717194";
const DISCORD_INVITE = "https://discord.gg/KSPpuxD8SG";

function channelUrl(channelId: string) {
  return `https://discord.com/channels/${GUILD_ID}/${channelId}`;
}

interface ChannelItem {
  name: string;
  id: string;
}

interface ChannelCategory {
  emoji: string;
  name: string;
  description: string;
  channels: ChannelItem[];
  extraLink?: { label: string; href: string };
}

const channelCategories: ChannelCategory[] = [
  {
    emoji: "📢",
    name: "Important",
    description: "Official announcements, rules, and onboarding",
    channels: [
      { name: "announcements", id: "814191683570237522" },
      { name: "welcome", id: "814191683570237521" },
      { name: "rules", id: "874565618458824714" },
      { name: "roles", id: "874568557277614110" },
      { name: "introduction", id: "814427796221984789" },
    ],
  },
  {
    emoji: "💬",
    name: "General",
    description: "Casual conversation, memes, and community ideas",
    channels: [
      { name: "chit-chat", id: "940556712702771221" },
      { name: "memes", id: "814486999364272168" },
      { name: "giveaways", id: "1430145340471902308" },
      { name: "community-ideas", id: "1438131731784794162" },
      { name: "tech-news", id: "1455944081527275561" },
    ],
  },
  {
    emoji: "🆘",
    name: "Help & Support",
    description: "Ask questions and get help from the community",
    channels: [
      { name: "help-me", id: "1215694101912096808" },
      { name: "faqs", id: "1107610829613957200" },
    ],
  },
  {
    emoji: "🤝",
    name: "Collaboration",
    description: "Find projects, jobs, workshops, and learning resources",
    channels: [
      { name: "projects-collaboration", id: "1419645803751805111" },
      { name: "job-opportunities", id: "892183658121809940" },
      { name: "learning-resources", id: "1419645950003122196" },
      { name: "workshops", id: "1465005149239115952" },
      { name: "promote-yourself", id: "1442612033064276009" },
      { name: "call-for-papers", id: "1441935700227395625" },
    ],
  },
  {
    emoji: "🎓",
    name: "Mentorship",
    description: "Public mentorship discussions and program updates",
    channels: [
      { name: "mentorship-public", id: "1419645845258768385" },
      { name: "mentors-chat", id: "1445678445408288850" },
      { name: "mentees-chat", id: "1445764987405467689" },
    ],
  },
  {
    emoji: "🌐",
    name: "Zero to Website",
    description: "Community for the Zero to Website program",
    channels: [
      { name: "z2w-announcements", id: "1469990176771276882" },
      { name: "z2w-support", id: "1469990293100040294" },
      { name: "z2w-legends-lounge", id: "1469990359726559282" },
      { name: "z2w-boost", id: "1469990417545035907" },
      { name: "z2w-deep-dive", id: "1469990558188437620" },
    ],
    extraLink: { label: "Visit z2website.com", href: "https://z2website.com" },
  },
  {
    emoji: "⚙️",
    name: "Tech Topics",
    description: "Deep-dives into specific technologies",
    channels: [
      { name: "angular", id: "1419570727249514557" },
      { name: "ai-ml", id: "1419572262096343121" },
      { name: "web-dev-bootcamp", id: "962799684479508540" },
      { name: "mern", id: "1419646052969091072" },
      { name: "google-gemini", id: "1418244830622122167" },
    ],
  },
  {
    emoji: "🏆",
    name: "Hackathons & Events",
    description: "Past and upcoming hackathons and coding challenges",
    channels: [
      { name: "cwa-prompt-a-thon-2026", id: "1462803913177829500" },
      { name: "hacktoberfest", id: "1025745719065313401" },
      { name: "hackstack-pakistan-2023", id: "1145277445214318662" },
    ],
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
      "CodeWithAhsan is a developer community built by Muhammad Ahsan Ayaz — a Software Architect, Google Developer Expert (GDE) in Angular, and author of the Angular Cookbook. With 4,300+ members, we connect learners and professionals through Discord, mentorship, collaborative projects, and learning roadmaps.",
  },
  {
    question: "Is it free to join?",
    answer:
      "Yes! Joining the Discord server and accessing all community channels is completely free. Some programs like mentorship have a structured application process, but there is no membership fee.",
  },
  {
    question: "What kind of channels are there?",
    answer:
      "Our server has channels for announcements, general chat, help and support, project collaboration, job opportunities, mentorship, Zero to Website, tech topics (Angular, AI/ML, MERN, Google Gemini), and hackathons.",
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
      "Zero to Website (Z2W) is a structured learning program for beginners building their first website. Members get dedicated channels for announcements, support, and showcasing progress. Visit z2website.com to learn more.",
  },
  {
    question: "Are there any events or hackathons?",
    answer:
      "Yes! We run hackathons like the CWA Prompt-a-thon, Hacktoberfest participation, and HackStack Pakistan. Watch #announcements for upcoming events.",
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
            4,300+ developers learning, building, and growing together. Jump
            into our Discord to connect, get help, and collaborate on real
            projects.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
              href={DISCORD_INVITE}
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
        <div className="max-w-6xl mx-auto">
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
                  <p className="text-base-content/70 text-sm">
                    {category.description}
                  </p>
                  <ul className="mt-3 space-y-1">
                    {category.channels.map((channel) => (
                      <li key={channel.id}>
                        <a
                          href={channelUrl(channel.id)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-base-content/60 hover:text-primary transition-colors"
                        >
                          #{channel.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                  <div className="card-actions mt-4 flex flex-wrap gap-2">
                    <a
                      href={DISCORD_INVITE}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      Join Server
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
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="bg-base-200 page-padding py-16">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold mb-10 text-base-content text-center">
            Frequently Asked Questions
          </h2>
          <div className="join join-vertical w-full">
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
        </div>
      </section>
    </div>
  );
}
