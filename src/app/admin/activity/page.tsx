import AdminOnlyPage from "@/components/admin/AdminOnlyPage";
import ActivityClient from "./ActivityClient";

export default function ActivityPage() {
  return (
    <AdminOnlyPage action="audit.read">
      <ActivityClient />
    </AdminOnlyPage>
  );
}
