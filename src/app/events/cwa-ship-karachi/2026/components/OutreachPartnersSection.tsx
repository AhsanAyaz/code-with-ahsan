import { Megaphone } from "lucide-react";
import { OUTREACH_PARTNERS, SECTION_IDS } from "../constants";
import PartnerGrid from "./PartnerGrid";

const OutreachPartnersSection = () => {
  if (OUTREACH_PARTNERS.length === 0) return null;

  return (
    <section id={SECTION_IDS.outreachPartners} className="relative overflow-hidden pb-16 sm:pb-24">
      <div className="container relative z-10 mx-auto px-4 sm:px-6">
        <div className="mb-8 text-center">
          <div className="mb-3 flex items-center justify-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            <h2 className="text-2xl font-bold text-primary sm:text-3xl">Outreach Partners</h2>
          </div>
          <p className="mx-auto max-w-2xl text-sm text-base-content/70 sm:text-base">
            Campus communities helping us reach builders across Karachi.
          </p>
        </div>

        <PartnerGrid partners={OUTREACH_PARTNERS} />
      </div>
    </section>
  );
};

export default OutreachPartnersSection;
