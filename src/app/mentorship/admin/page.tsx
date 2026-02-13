"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function LegacyAdminRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/admin");
  }, [router]);

  return (
    <div className="flex justify-center items-center min-h-screen">
      <span className="loading loading-spinner loading-lg"></span>
      <span className="ml-2">Redirecting to new admin dashboard...</span>
    </div>
  );
}
