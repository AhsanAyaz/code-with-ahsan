import { MasRaffleClient } from "./MasRaffleClient";

export const dynamic = "force-dynamic";

export default function MasRafflePage() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-base-200">
      <MasRaffleClient />
    </main>
  );
}
