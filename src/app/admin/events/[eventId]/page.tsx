"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";
import WinnersEditor from "@/components/events/WinnersEditor";
import { getAdminEvent } from "../registry";

export default function AdminEventWinnersPage() {
  const { eventId } = useParams<{ eventId: string }>();

  // Teams and the display name come from the registry, so this screen works for
  // any event listed there rather than one hardcoded hackathon.
  const event = getAdminEvent(eventId);
  const teams = event?.teams ?? [];

  const [loadedAt, setLoadedAt] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Manage Winners — {event?.name ?? eventId}</h1>
        <p className="text-base-content/60 mt-1">
          Set the winning teams and their project details for the public display.
        </p>
        {!event && (
          <div className="alert alert-warning mt-3 py-2 text-sm">
            <span>
              <span className="font-mono">{eventId}</span> is not in the admin event registry, so
              there are no teams to pick from. Add it to{" "}
              <span className="font-mono">src/app/admin/events/registry.ts</span>.
            </span>
          </div>
        )}
        {event && teams.length === 0 && (
          <div className="alert alert-warning mt-3 py-2 text-sm">
            No teams registered for this event yet.
          </div>
        )}
        {loadedAt && (
          <div className="alert alert-info mt-3 py-2 text-sm">
            Winners currently saved — announced {new Date(loadedAt).toLocaleString()}
          </div>
        )}
      </div>

      <WinnersEditor
        eventId={eventId}
        teams={teams}
        tokenHeader="x-admin-token"
        tokenKey={ADMIN_TOKEN_KEY}
        onLoadedAtChange={setLoadedAt}
      />
    </div>
  );
}
