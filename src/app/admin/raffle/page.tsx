import AdminAuthGate from "@/components/admin/AdminAuthGate";
import { AdminRaffleClient } from "./AdminRaffleClient";

export const dynamic = "force-dynamic";

export default function AdminRafflePage() {
  return (
    <AdminAuthGate>
      <AdminRaffleClient />
    </AdminAuthGate>
  );
}
