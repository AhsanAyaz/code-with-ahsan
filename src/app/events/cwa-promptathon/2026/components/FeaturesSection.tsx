"use client";

import { motion } from "framer-motion";
import { Users, GraduationCap, Rocket, type LucideIcon } from "lucide-react";

const features: { icon: LucideIcon; title: string; description: string; color: string }[] = [
  {
    icon: Users,
    title: "Collaboration",
    description: "Experts and beginners coding side-by-side. Cultivating the next generation of engineers.",
    color: "primary",
  },
  {
    icon: GraduationCap,
    title: "Mentorship",
    description: "Mentors guiding teams, providing real-time code reviews and architectural advice.",
    color: "accent",
  },
  {
    icon: Rocket,
    title: "Innovation",
    description: "Build incredible AI apps, scaling ideas to reality in a high-energy sprint.",
    color: "primary",
  },
];

const FeatureCard = ({ feature, index }: { feature: typeof features[0]; index: number }) => {
  const isPrimary = feature.color === "primary";

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.2, delay: index * 0.08, type: "spring" }}
      whileHover={{ y: -8 }} // Added hover effect
      className="bg-base-200 rounded-2xl p-6 sm:p-8 text-center relative overflow-hidden shadow-lg border border-base-300 transition-all duration-300 group hover:border-primary/40"
    >
      {/* Top glow line - simplified without motion */}
      <div
        className={`absolute top-0 left-1/2 -translate-x-1/2 h-px ${isPrimary ? 'bg-primary' : 'bg-accent'}`}
        style={{ width: "60%" }} // Static width
      />

      {/* Icon */}
      <div className={`w-14 h-14 rounded-xl ${isPrimary ? 'bg-primary/10' : 'bg-accent/10'} flex items-center justify-center mx-auto mb-5`}>
        <feature.icon className={`w-7 h-7 ${isPrimary ? 'text-primary' : 'text-accent'}`} />
      </div>

      <h3 className="text-lg sm:text-xl font-semibold font-mono text-base-content mb-3">
        {feature.title}
      </h3>
      <p className="text-base-content/70 text-sm leading-relaxed">
        {feature.description}
      </p>

      {/* Bottom corner decoration */}
      <div className={`absolute bottom-0 right-0 w-12 h-12 ${isPrimary ? 'border-primary/10' : 'border-accent/10'} border-b border-r rounded-br-2xl opacity-0 group-hover:opacity-100 transition-opacity`} />
    </motion.div>
  );
};

const FeaturesSection = () => {
  const headingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
  };

  return (
    <section className="bg-base-100 py-16 sm:py-24 relative overflow-hidden">
      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <motion.h2
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={headingVariants}
          className="text-2xl sm:text-3xl font-bold font-mono text-center text-primary mb-10 sm:mb-14"
        >
          Why Join the Sprint?
        </motion.h2>
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-5 sm:gap-6 max-w-5xl mx-auto">
          {features.map((feature, index) => (
            <FeatureCard key={feature.title} feature={feature} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
