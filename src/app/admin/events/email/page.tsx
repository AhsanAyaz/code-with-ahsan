import { EmailBlastClient } from "./EmailBlastClient";
import AdminOnlyPage from "@/components/admin/AdminOnlyPage";

export const dynamic = "force-dynamic";

export default function EmailBlastPage() {
  return (
    <AdminOnlyPage action="comms.emailBlast">
      <EmailBlastClient />
    </AdminOnlyPage>
  );
}
