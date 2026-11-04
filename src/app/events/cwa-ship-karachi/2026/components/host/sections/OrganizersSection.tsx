"use client";

import SlideShell from "../SlideShell";
import PersonCard from "../PersonCard";
import { ORGANIZER_PROFILES } from "../../../constants";

export default function OrganizersSection() {
  return (
    <SlideShell eyebrow="The people who made today happen" title="Organising Team" maxWidth={1240}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
        {ORGANIZER_PROFILES.map((organizer, i) => (
          <PersonCard
            key={organizer.name}
            name={organizer.name}
            role={organizer.title}
            avatarUrl={organizer.avatarUrl}
            index={i}
          />
        ))}
      </div>
    </SlideShell>
  );
}
