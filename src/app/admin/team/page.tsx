import AdminOnlyPage from "@/components/admin/AdminOnlyPage";
import TeamClient from "./TeamClient";

export default function TeamPage() {
  return (
    <AdminOnlyPage action="staff.manage">
      <TeamClient />
    </AdminOnlyPage>
  );
}
