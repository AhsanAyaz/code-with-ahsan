"use client";

import { useState, useEffect } from "react";
import { ADMIN_TOKEN_KEY } from "@/components/admin/AdminAuthGate";

interface HostAuthGateProps {
  children: React.ReactNode;
}

export default function HostAuthGate({ children }: HostAuthGateProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  // Check for existing admin session on mount
  useEffect(() => {
    const checkSession = async () => {
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
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem(ADMIN_TOKEN_KEY);
        }
      } catch (error) {
        console.error("Error checking host auth session:", error);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      } finally {
        setCheckingAuth(false);
      }
    };
    checkSession();
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoggingIn(true);
    setAuthError("");
    try {
      const response = await fetch("/api/mentorship/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const data = await response.json();
      if (response.ok && data.token) {
        localStorage.setItem(ADMIN_TOKEN_KEY, data.token);
        setIsAuthenticated(true);
        setPassword("");
      } else {
        setAuthError(data.error || "Invalid password");
      }
    } catch (error) {
      console.error("Host auth login error:", error);
      setAuthError("Authentication failed. Please try again.");
    } finally {
      setLoggingIn(false);
    }
  };

  if (checkingAuth) {
    return (
      <div
        style={{
          background: "#07020F",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            border: "3px solid #6C2BD9",
            borderTopColor: "#00F5FF",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          background: "#07020F",
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "monospace",
          backgroundImage:
            "linear-gradient(rgba(108,43,217,0.12) 1px, transparent 1px), linear-gradient(90deg, rgba(108,43,217,0.12) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }}
      >
        <div
          style={{
            background: "rgba(7,2,15,0.92)",
            border: "1px solid rgba(108,43,217,0.5)",
            borderRadius: 12,
            padding: "48px 40px",
            width: 380,
            boxShadow: "0 0 60px rgba(108,43,217,0.15)",
          }}
        >
          <h1
            style={{
              fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
              fontSize: 36,
              letterSpacing: "0.08em",
              color: "#F0EEFF",
              marginBottom: 8,
              textAlign: "center",
            }}
          >
            HOST PANEL
          </h1>
          <p
            style={{
              color: "rgba(240,238,255,0.4)",
              fontSize: 12,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              textAlign: "center",
              marginBottom: 32,
              fontFamily: "var(--font-space-mono, monospace)",
            }}
          >
            CWA Prompt-a-thon 2026
          </p>

          <form onSubmit={handleLogin}>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  color: "rgba(240,238,255,0.5)",
                  fontSize: 11,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  marginBottom: 8,
                  fontFamily: "var(--font-space-mono, monospace)",
                }}
              >
                Admin Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loggingIn}
                autoFocus
                placeholder="Enter password"
                style={{
                  width: "100%",
                  background: "rgba(108,43,217,0.08)",
                  border: "1px solid rgba(108,43,217,0.35)",
                  borderRadius: 6,
                  padding: "12px 14px",
                  color: "#F0EEFF",
                  fontSize: 14,
                  outline: "none",
                  fontFamily: "var(--font-space-mono, monospace)",
                  boxSizing: "border-box",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "rgba(108,43,217,0.8)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "rgba(108,43,217,0.35)")
                }
              />
              {authError && (
                <p
                  style={{
                    color: "#FF4D6A",
                    fontSize: 12,
                    marginTop: 6,
                    fontFamily: "var(--font-space-mono, monospace)",
                  }}
                >
                  {authError}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={loggingIn || !password}
              style={{
                width: "100%",
                padding: "12px",
                background: loggingIn || !password ? "rgba(108,43,217,0.3)" : "#6C2BD9",
                border: "none",
                borderRadius: 6,
                color: "#F0EEFF",
                fontSize: 14,
                letterSpacing: "0.08em",
                cursor: loggingIn || !password ? "not-allowed" : "pointer",
                fontFamily: "var(--font-bebas, 'Bebas Neue', sans-serif)",
                transition: "background 0.2s",
              }}
            >
              {loggingIn ? "AUTHENTICATING..." : "ACCESS HOST PANEL"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
