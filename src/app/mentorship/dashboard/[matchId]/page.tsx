import { redirect } from "next/navigation";

export default async function DashboardRedirect({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  redirect(`/mentorship/dashboard/${matchId}/bookings`);
}
