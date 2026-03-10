import Link from "next/link";
import { MessageCircle, Users, FolderGit2, Map } from "lucide-react";

const DISCORD_INVITE = "https://discord.gg/KSPpuxD8SG";

interface OnrampCard {
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  title: string;
  description: string;
  ctaLabel: string;
  href: string;
  external?: boolean;
}

const onrampCards: OnrampCard[] = [
  {
    icon: MessageCircle,
    iconColor: "text-info",
    title: "Join Discord",
    description:
      "Connect with 4,300+ developers, get help, share knowledge, and collaborate in real time.",
    ctaLabel: "Join",
    href: DISCORD_INVITE,
    external: true,
  },
  {
    icon: Users,
    iconColor: "text-primary",
    title: "Find a Mentor",
    description:
      "Get matched with an experienced developer for 1-on-1 guidance tailored to your goals.",
    ctaLabel: "Explore",
    href: "/mentorship",
  },
  {
    icon: FolderGit2,
    iconColor: "text-secondary",
    title: "Join a Project",
    description:
      "Collaborate on real-world projects with structured team support and dedicated channels.",
    ctaLabel: "Explore",
    href: "/projects",
  },
  {
    icon: Map,
    iconColor: "text-accent",
    title: "Follow a Roadmap",
    description:
      "Structured learning paths from beginner to advanced, curated to help you level up.",
    ctaLabel: "Explore",
    href: "/roadmaps",
  },
];

export default function CommunityGetInvolved() {
  return (
    <section className="bg-base-100 page-padding py-16">
      <div className="max-w-6xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl md:text-4xl font-bold mb-3 text-base-content">
            Get Involved
          </h2>
          <p className="text-base-content/60 text-base max-w-xl mx-auto">
            There are many ways to be part of the CodeWithAhsan community —
            pick the one that fits where you are right now.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {onrampCards.map((card) => (
            <div
              key={card.title}
              className="card bg-base-200 border border-base-300"
            >
              <div className="card-body">
                <div
                  className={`w-10 h-10 rounded-lg bg-base-100 flex items-center justify-center mb-3 ${card.iconColor}`}
                >
                  <card.icon className="w-5 h-5" />
                </div>
                <h3 className="card-title text-base-content text-lg">
                  {card.title}
                </h3>
                <p className="text-base-content/70 text-sm flex-1">
                  {card.description}
                </p>
                <div className="card-actions mt-4">
                  {card.external ? (
                    <a
                      href={card.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-sm btn-outline"
                    >
                      {card.ctaLabel}
                    </a>
                  ) : (
                    <Link href={card.href} className="btn btn-sm btn-outline">
                      {card.ctaLabel}
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
