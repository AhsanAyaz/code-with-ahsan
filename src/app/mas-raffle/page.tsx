import { MasRaffleClient } from "./MasRaffleClient";

export const dynamic = "force-dynamic";

export default function MasRafflePage() {
  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-10"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(251,191,36,0.12) 0%, transparent 70%), #080b14",
      }}
    >
      <MasRaffleClient />
    </main>
  );
}
