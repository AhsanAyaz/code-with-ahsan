import Link from "next/link";

type ContactOption = {
  icon: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  external?: boolean;
};

const contactOptions: ContactOption[] = [
  {
    icon: "🎤",
    title: "Speaking",
    description: "Invite me to speak at your conference or meetup on Angular, AI, or modern web development.",
    cta: "Send invite",
    href: "mailto:muhd.ahsanayaz@gmail.com?subject=Speaking%20Inquiry",
    external: false,
  },
  {
    icon: "🔧",
    title: "Consulting",
    description: "Need Angular or AI expertise? I'm available for architecture reviews, team training, and technical consulting.",
    cta: "Connect on LinkedIn",
    href: "https://www.linkedin.com/in/ahsanayaz",
    external: true,
  },
  {
    icon: "🚀",
    title: "Mentorship",
    description: "Join the Code With Ahsan mentorship program — structured guidance, real projects, and a supportive community.",
    cta: "Learn more",
    href: "/mentorship",
    external: false,
  },
  {
    icon: "🤝",
    title: "Collaboration",
    description: "Let's build something together. Open to partnerships, open-source contributions, and content collaborations.",
    cta: "Get in touch",
    href: "mailto:muhd.ahsanayaz@gmail.com?subject=Collaboration%20Inquiry",
    external: false,
  },
];

export default function ContactSection() {
  return (
    <section className="border-t border-base-300 bg-base-100 py-16">
      <div className="page-padding">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-base-content mb-3">
            Work With Me
          </h2>
          <p className="text-base-content/70 mb-8 max-w-2xl leading-relaxed">
            I&apos;m available for conference talks, technical consulting,
            mentorship, and collaborations. Whether you need an expert speaker,
            architecture guidance, or a dedicated mentor — let&apos;s talk.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {contactOptions.map((option) => (
              <Link
                key={option.title}
                href={option.href}
                target={option.external ? "_blank" : undefined}
                rel={option.external ? "noopener noreferrer" : undefined}
                className="bg-base-100 border border-base-300 rounded-xl p-6 flex flex-col gap-3 hover:border-primary/40 hover:shadow-sm transition-all group"
              >
                <div className="text-3xl" aria-hidden="true">
                  {option.icon}
                </div>
                <div>
                  <h3 className="font-bold text-base-content text-lg group-hover:text-primary transition-colors">
                    {option.title}
                  </h3>
                  <p className="text-base-content/70 text-sm mt-1 leading-relaxed">
                    {option.description}
                  </p>
                </div>
                <span className="text-primary text-sm font-medium mt-auto">
                  {option.cta} &rarr;
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
