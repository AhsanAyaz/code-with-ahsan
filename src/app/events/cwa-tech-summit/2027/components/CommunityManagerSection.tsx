import { EVENT, SECTION_IDS, SPONSOR_CONTACT, sponsorMailto } from "../constants";
import { ContactCard } from "./ContactSection";
import KineticHeading from "./KineticHeading";
import { CONTAINER, SECTION_SPACING } from "./styles";

/** Target of every sponsorship tier button. scroll-mt keeps the heading clear of the sticky header. */
const CommunityManagerSection = () => {
  return (
    <section
      id={SECTION_IDS.communityManager}
      aria-labelledby="community-manager-heading"
      className={`${SECTION_SPACING} scroll-mt-24`}
    >
      <div className={CONTAINER}>
        <div className="mb-10 max-w-3xl">
          <KineticHeading id="community-manager-heading" text="Contact our Community Lead" />
          <p className="mt-5 text-lg leading-relaxed text-(--sm-paper)/85">
            Picked a tier, or want help choosing one? Reach out to {SPONSOR_CONTACT.name} to lock in
            your sponsorship and talk through the next steps.
          </p>
        </div>

        <div className="max-w-2xl">
          <ContactCard
            contact={SPONSOR_CONTACT}
            highlight
            emailHref={sponsorMailto(`Sponsoring ${EVENT.name}`)}
          />
        </div>
      </div>
    </section>
  );
};

export default CommunityManagerSection;
