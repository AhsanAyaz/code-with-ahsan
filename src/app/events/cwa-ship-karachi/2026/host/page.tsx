import HostAuthGate from "@/components/admin/HostAuthGate";
import HostPanel from "../components/host/HostPanel";
import { EVENT } from "../constants";

export default function HostPage() {
  return (
    <HostAuthGate eventName={EVENT.name}>
      <HostPanel />
    </HostAuthGate>
  );
}
