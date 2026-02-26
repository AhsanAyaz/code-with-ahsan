"use client";

import AnimatedBackground from "./components/AnimatedBackground";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import FeaturesSection from "./components/FeaturesSection";
import EventStructureSection from "./components/EventStructureSection";

const CwaPromptathon2026Page = () => {
  return (
    <main className="min-h-screen relative bg-gradient-to-b from-base-100 via-base-100/80 to-base-100">
      <AnimatedBackground />
      <HeroSection />
      <AboutSection />
      <FeaturesSection />
      <EventStructureSection />
    </main>
  );
};

export default CwaPromptathon2026Page;
