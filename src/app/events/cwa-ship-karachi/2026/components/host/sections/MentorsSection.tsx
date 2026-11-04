"use client";

import SlideShell from "../SlideShell";
import PersonCard from "../PersonCard";
import { MENTOR_PROFILES } from "../../../constants";

export default function MentorsSection() {
  return (
    <SlideShell eyebrow="On the floor all day" title="Mentors" maxWidth={1240}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "center", gap: 20 }}>
        {MENTOR_PROFILES.map((mentor, i) => (
          <PersonCard
            key={mentor.name}
            name={mentor.name}
            role={mentor.position}
            detail={mentor.organization}
            avatarUrl={mentor.avatarUrl}
            index={i}
          />
        ))}
      </div>
    </SlideShell>
  );
}
