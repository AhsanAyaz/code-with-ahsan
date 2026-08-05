"use client";

import AnimatedBackground from "./components/AnimatedBackground";
import HeroSection from "./components/HeroSection";
import AboutSection from "./components/AboutSection";
import TracksSection from "./components/TracksSection";
import ScheduleSection from "./components/ScheduleSection";
import MentorsSection from "./components/MentorsSection";
import VenueSection from "./components/VenueSection";
import EventStructureSection from "./components/EventStructureSection";
import JudgesSection from "./components/JudgesSection";
import SponsorshipPackagesSection from "./components/SponsorshipPackagesSection";
import CurrentSponsorsSection from "./components/CurrentSponsorsSection";
import ContactSection from "./components/ContactSection";
import OrganizersSection from "./components/OrganizersSection";
import WinnersDisplay from "./components/WinnersDisplay";
import CommunityStats from "@/components/home/CommunityStats";
import SocialStats from "@/components/social/SocialStats";

const CwaShipKarachi2026Page = () => {
  return (
    <main className="min-h-screen relative bg-[#0c0a14]" data-theme="dark">
      <AnimatedBackground />
      <HeroSection />
      <TracksSection />
      <CommunityStats />
      <SocialStats />
      <AboutSection />
      <ScheduleSection />
      <EventStructureSection />
      <MentorsSection />
      <JudgesSection />
      <VenueSection />
      <SponsorshipPackagesSection />
      <CurrentSponsorsSection />
      <ContactSection />
      <OrganizersSection />
      <WinnersDisplay />
    </main>
  );
};

export default CwaShipKarachi2026Page;
