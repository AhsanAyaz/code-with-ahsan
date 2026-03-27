import HostAuthGate from "@/components/admin/HostAuthGate";
import HostPanel from "../components/host/HostPanel";

export default function HostPage() {
  return (
    <HostAuthGate>
      <HostPanel />
    </HostAuthGate>
  );
}
