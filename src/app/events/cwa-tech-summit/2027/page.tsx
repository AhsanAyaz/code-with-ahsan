import AboutSection from "./components/AboutSection";
import AgendaSection from "./components/AgendaSection";
import AnimatedBackground from "./components/AnimatedBackground";
import CommunityNumbersSection from "./components/CommunityNumbersSection";
import ContactSection from "./components/ContactSection";
import HeroSection from "./components/HeroSection";
import InKindSection from "./components/InKindSection";
import JudgesSection from "./components/JudgesSection";
import MarqueeBand from "./components/MarqueeBand";
import OrganizersSection from "./components/OrganizersSection";
import PastEventsSection from "./components/PastEventsSection";
import PitchSection from "./components/PitchSection";
import ScrollProgress from "./components/ScrollProgress";
import SpeakersSection from "./components/SpeakersSection";
import SponsorsSection from "./components/SponsorsSection";
import SponsorshipTiersSection from "./components/SponsorshipTiersSection";
import VenueSection from "./components/VenueSection";
import { SUMMIT_THEME_VARS } from "./constants";

const CwaTechSummit2027Page = () => {
  return (
    <main
      className="relative min-h-screen overflow-x-clip bg-(--sm-ink) text-(--sm-paper)"
      data-theme="dark"
      style={SUMMIT_THEME_VARS}
    >
      <AnimatedBackground />
      <ScrollProgress />
      <div className="relative z-10">
        <HeroSection />
        <MarqueeBand />
        <AboutSection />
        <AgendaSection />
        <PitchSection />
        <SpeakersSection />
        <JudgesSection />
        <SponsorsSection />
        <SponsorshipTiersSection />
        <OrganizersSection />
        <InKindSection />
        <VenueSection />
        <CommunityNumbersSection />
        <PastEventsSection />
        <ContactSection />
      </div>
    </main>
  );
};

export default CwaTechSummit2027Page;
