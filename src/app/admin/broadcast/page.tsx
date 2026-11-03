import { BroadcastClient } from "./BroadcastClient";
import AdminOnlyPage from "@/components/admin/AdminOnlyPage";

export const dynamic = "force-dynamic";

export default function BroadcastPage() {
  return (
    <AdminOnlyPage action="comms.broadcast">
      <BroadcastClient />
    </AdminOnlyPage>
  );
}
