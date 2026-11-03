"use client";

import { useContext, useEffect } from "react";
import { getAuth } from "firebase/auth";
import { getApp } from "firebase/app";
import { AuthContext } from "@/contexts/AuthContext";
import { useAdminAccess } from "@/lib/adminAccess/client";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

function signOut() {
  getAuth(getApp())
    .signOut()
    .catch((error) => console.error("Sign out failed:", error));
}

/**
 * Gate for the admin portal. Access is per person: the signed-in Firebase user
 * must have a role in admin_roles (resolved by AdminAccessProvider through
 * GET /api/admin/me). Must render inside AdminAccessProvider.
 */
export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { status, role, email } = useAdminAccess();

  // Prompt sign-in when nobody is signed in
  useEffect(() => {
    if (status === "signed-out") {
      setShowLoginPopup(true);
    }
  }, [status, setShowLoginPopup]);

  if (status === "loading") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (status === "signed-out") {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-base-content/70">Please sign in to access the admin dashboard</p>
          <button className="btn btn-primary mt-6" onClick={() => setShowLoginPopup(true)}>
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (status === "no-access") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200 px-4">
        <div className="card w-full max-w-md bg-base-100 shadow-xl">
          <div className="card-body items-center text-center">
            <div className="rounded-full bg-base-200 p-4 mb-2" aria-hidden="true">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-8 w-8 text-base-content/60"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
                />
              </svg>
            </div>
            <h2 className="card-title">You don&apos;t have access to the admin portal</h2>
            {email && (
              <p className="text-sm text-base-content/70">
                Signed in as <span className="font-medium text-base-content">{email}</span>
              </p>
            )}
            <p className="text-sm text-base-content/70">
              Ask an admin to add you, then reload this page.
            </p>
            <div className="card-actions mt-4">
              <button className="btn btn-outline btn-sm" onClick={signOut}>
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isAdmin = role === "admin";

  return (
    <div className="bg-base-100 min-h-screen">
      {/* Staff role banner */}
      <div
        className={`${
          isAdmin ? "bg-warning text-warning-content" : "bg-info text-info-content"
        } px-4 py-2 flex justify-between items-center gap-4`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5 shrink-0"
            viewBox="0 0 20 20"
            fill="currentColor"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold">{isAdmin ? "ADMIN MODE" : "MODERATOR MODE"}</span>
          {email && <span className="text-sm opacity-80 truncate hidden sm:inline">{email}</span>}
        </div>
        <button onClick={signOut} className="btn btn-sm btn-ghost">
          Sign out
        </button>
      </div>

      {/* Main content area */}
      {children}
    </div>
  );
}
