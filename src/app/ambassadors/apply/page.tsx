import ApplyWizard from "./ApplyWizard";

/**
 * /ambassadors/apply — server component shell.
 *
 * Feature-flag gate is inherited from src/app/ambassadors/layout.tsx which
 * calls notFound() when FEATURE_AMBASSADOR_PROGRAM is off (D-10).
 *
 * Auth handling lives in the client component (ApplyWizard) because Firebase
 * auth is client-driven; this server component only renders the static shell.
 */
export default function ApplyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-bold">Apply to be a Student Ambassador</h1>
        <p className="text-base-content/70 mt-2">
          Tell us about yourself. You can complete this in one sitting (~10 minutes).
        </p>
      </header>
      <ApplyWizard />
    </div>
  );
}
