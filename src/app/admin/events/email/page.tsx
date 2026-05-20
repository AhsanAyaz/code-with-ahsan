import AdminAuthGate from "@/components/admin/AdminAuthGate";
import { EmailBlastClient } from "./EmailBlastClient";

export const dynamic = "force-dynamic";

export default function EmailBlastPage() {
  return (
    <AdminAuthGate>
      <EmailBlastClient />
    </AdminAuthGate>
  );
}
