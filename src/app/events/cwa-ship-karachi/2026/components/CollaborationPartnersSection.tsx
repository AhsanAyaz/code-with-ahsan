import { Handshake } from "lucide-react";
import { COLLABORATION_PARTNERS, SECTION_IDS } from "../constants";
import PartnerGrid from "./PartnerGrid";

const CollaborationPartnersSection = () => {
  if (COLLABORATION_PARTNERS.length === 0) return null;

  return (
    <section
      id={SECTION_IDS.collaborationPartners}
      className="relative overflow-hidden pb-12 sm:pb-16"
    >
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Handshake className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Collaboration Partners</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Communities and organisations helping us put the day together.
          </p>
        </div>

        <PartnerGrid partners={COLLABORATION_PARTNERS} />
      </div>
    </section>
  );
};

export default CollaborationPartnersSection;
