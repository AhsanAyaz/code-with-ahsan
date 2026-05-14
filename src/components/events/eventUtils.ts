import type { EventContent } from "@/types/content";

type DisplayStatus = "upcoming" | "happening today" | "completed" | "cancelled";

interface StatusDisplay {
  label: string;
  badgeClass: string;
}

export function getEventDisplayStatus(event: EventContent): DisplayStatus {
  if (event.status === "cancelled") return "cancelled";

  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  const start = event.date.slice(0, 10);
  const end = event.endDate ? event.endDate.slice(0, 10) : start;

  if (today >= start && today <= end) return "happening today";
  if (today > end) return "completed";
  return "upcoming";
}

export function getStatusDisplay(status: DisplayStatus): StatusDisplay {
  switch (status) {
    case "upcoming":
      return { label: "Upcoming", badgeClass: "badge-primary" };
    case "happening today":
      return { label: "Happening Today", badgeClass: "badge-success" };
    case "completed":
      return { label: "Completed", badgeClass: "badge-ghost" };
    case "cancelled":
      return { label: "Cancelled", badgeClass: "badge-error" };
  }
}
