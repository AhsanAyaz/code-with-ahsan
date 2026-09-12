"use client";

import Link from "next/link";
import HostAuthGate, { HOST_TOKEN_KEY } from "@/components/admin/HostAuthGate";
import WinnersEditor from "@/components/events/WinnersEditor";
import { EVENT, HACKATHON_TEAMS } from "../../constants";

const DECK_PATH = `${EVENT.path}/host`;

export default function HostWinnersPage() {
  return (
    <HostAuthGate eventName={EVENT.name}>
      <div
        style={{
          background: "#07020F",
          minHeight: "100vh",
          overflowY: "auto",
          padding: "32px 24px 64px",
          fontFamily: "var(--font-space-mono, monospace)",
        }}
      >
        <div style={{ maxWidth: 760, margin: "0 auto" }}>
          <Link
            href={DECK_PATH}
            style={{
              display: "inline-block",
              marginBottom: 20,
              color: "#00F5FF",
              fontSize: 12,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            ← Back to deck
          </Link>

          <h1
            style={{
              fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
              fontSize: 40,
              letterSpacing: "0.06em",
              color: "#F0EEFF",
              marginBottom: 4,
            }}
          >
            Announce Winners
          </h1>
          <p
            style={{
              color: "rgba(240,238,255,0.4)",
              fontSize: 12,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              marginBottom: 28,
            }}
          >
            {EVENT.name}
          </p>

          {/* daisyUI form on a dark card so it stays readable inside the deck theme. */}
          <div
            data-theme="dark"
            style={{
              background: "rgba(7,2,15,0.92)",
              border: "1px solid rgba(108,43,217,0.4)",
              borderRadius: 12,
              padding: 24,
            }}
          >
            <WinnersEditor
              eventId={EVENT.eventId}
              teams={HACKATHON_TEAMS}
              tokenHeader="x-host-token"
              tokenKey={HOST_TOKEN_KEY}
            />
          </div>
        </div>
      </div>
    </HostAuthGate>
  );
}
