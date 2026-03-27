"use client";

import AnimatedBackground from "./components/AnimatedBackground";
import HeroSection from "./components/HeroSection";
import CommunityStatsSection from "./components/CommunityStatsSection";
import AboutSection from "./components/AboutSection";
import EventStructureSection from "./components/EventStructureSection";
import JudgesMentorsSection from "./components/JudgesMentorsSection";
import SponsorshipPackagesSection from "./components/SponsorshipPackagesSection";
import CurrentSponsorsSection from "./components/CurrentSponsorsSection";
import WinnersDisplay from "./components/WinnersDisplay";

const CwaPromptathon2026Page = () => {
  return (
    <main className="min-h-screen relative bg-[#0c0a14]" data-theme="dark">
      <AnimatedBackground />
      <HeroSection />
      <CommunityStatsSection />
      <AboutSection />
      <EventStructureSection />
      <JudgesMentorsSection />
      <SponsorshipPackagesSection />
      <CurrentSponsorsSection />
      <WinnersDisplay />
    </main>
  );
};

export default CwaPromptathon2026Page;
