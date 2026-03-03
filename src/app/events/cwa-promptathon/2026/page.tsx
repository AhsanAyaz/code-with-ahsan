"use client";

import AnimatedBackground from "./components/AnimatedBackground";
import HeroSection from "./components/HeroSection";
import CommunityStatsSection from "./components/CommunityStatsSection";
import AboutSection from "./components/AboutSection";
import FeaturesSection from "./components/FeaturesSection";
import EventStructureSection from "./components/EventStructureSection";
import JudgesMentorsSection from "./components/JudgesMentorsSection";
import SponsorshipPackagesSection from "./components/SponsorshipPackagesSection";
import CurrentSponsorsSection from "./components/CurrentSponsorsSection";

const CwaPromptathon2026Page = () => {
  return (
    <main className="min-h-screen relative bg-[#0c0a14]">
      <AnimatedBackground />
      <HeroSection />
      <CommunityStatsSection />
      <AboutSection />
      <FeaturesSection />
      <EventStructureSection />
      <JudgesMentorsSection />
      <SponsorshipPackagesSection />
      <CurrentSponsorsSection />
    </main>
  );
};

export default CwaPromptathon2026Page;
