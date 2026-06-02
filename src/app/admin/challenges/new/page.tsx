import ChallengeForm from "@/components/admin/ChallengeForm";

/**
 * Admin Page to create a new challenge.
 * Renders the ChallengeForm without initial data.
 */
export default function NewChallengePage() {
  return (
    <div className="max-w-4xl mx-auto  p-8 space-y-6">
      <h1 className="text-3xl font-bold px-8">Create New Challenge</h1>
      <ChallengeForm />
    </div>
  );
}
