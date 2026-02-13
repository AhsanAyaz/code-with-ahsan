"use client";

import { useState, useEffect, useContext } from "react";
import { AuthContext } from "@/contexts/AuthContext";
import { useMentorship } from "@/contexts/MentorshipContext";

export const ADMIN_TOKEN_KEY = "mentorship_admin_token";

interface AdminAuthGateProps {
  children: React.ReactNode;
}

export default function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { setShowLoginPopup } = useContext(AuthContext);
  const { user, loading } = useMentorship();

  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [adminPassword, setAdminPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Check for existing admin session on mount
  useEffect(() => {
    const checkAdminSession = async () => {
      const token = localStorage.getItem(ADMIN_TOKEN_KEY);
      if (!token) {
        setCheckingAuth(false);
        return;
      }
      try {
        const response = await fetch("/api/mentorship/admin/auth", {
          method: "GET",
          headers: { "x-admin-token": token },
        });
        const data = await response.json();
        if (data.valid) {
          setIsAdminAuthenticated(true);
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
      } catch (error) {
        console.error("Error checking admin session:", error);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkAdminSession();
  }, []);

  // Prompt login if Firebase user is not signed in
  useEffect(() => {
    if (!loading && !user) {
      setShowLoginPopup(true);
    }
  }, [loading, user, setShowLoginPopup]);

  // Handle admin login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const response = await fetch("/api/mentorship/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: adminPassword }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        setIsAdminAuthenticated(true);
        setAdminPassword("");
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (error) {
      console.error("Admin login error:", error);
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  // Handle admin logout
  const handleAdminLogout = async () => {
    const token = localStorage.getItem(ADMIN_TOKEN_KEY);
    if (token) {
      try {
        await fetch("/api/mentorship/admin/auth", {
          method: "DELETE",
          headers: { "x-admin-token": token },
        });
      } catch (error) {
        console.error("Logout error:", error);
      }
    }
    localStorage.removeItem(ADMIN_TOKEN_KEY);
    setIsAdminAuthenticated(false);
  };

  // Loading state - checking auth or loading user
  if (checkingAuth || loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  // Not logged in with Firebase - prompt will show via AuthContext
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-base-content/70">
            Please sign in to access the admin dashboard
          </p>
        </div>
      </div>
    );
  }

  // Not admin authenticated - show admin password form
  if (!isAdminAuthenticated) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-base-200">
        <div className="card w-96 bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Admin Authentication</h2>
            <p className="text-sm text-base-content/70 mb-4">
              Enter the admin password to continue
            </p>
            <form onSubmit={handleAdminLogin}>
              <div className="form-control">
                <label className="label">
                  <span className="label-text">Admin Password</span>
                </label>
                <input
                  type="password"
                  placeholder="Enter admin password"
                  className="input input-bordered"
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  disabled={loggingIn}
                  autoFocus
                />
                {authError && (
                  <label className="label">
                    <span className="label-text-alt text-error">{authError}</span>
                  </label>
                )}
              </div>
              <div className="form-control mt-6">
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loggingIn || !adminPassword}
                >
                  {loggingIn ? (
                    <>
                      <span className="loading loading-spinner loading-sm"></span>
                      Authenticating...
                    </>
                  ) : (
                    "Login"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated - show admin UI with header and logout button
  return (
    <div className="bg-base-100 min-h-screen">
      {/* Admin header banner */}
      <div className="bg-warning text-warning-content px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
          <span className="font-semibold">ADMIN MODE - Viewing as Administrator</span>
        </div>
        <button onClick={handleAdminLogout} className="btn btn-sm btn-ghost">
          Logout
        </button>
      </div>

      {/* Main content area */}
      {children}
    </div>
  );
}
