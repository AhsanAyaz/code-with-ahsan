import { MemberDetailClient } from "./MemberDetailClient";

export const dynamic = "force-dynamic";

export default async function AdminMemberDetailPage({
  params,
}: {
  params: Promise<{ uid: string }>;
}) {
  const { uid } = await params;
  return (
    <main className="page-padding mx-auto max-w-6xl space-y-6 py-8">
      <MemberDetailClient uid={uid} />
    </main>
  );
}
