"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap, CheckCircle, XCircle } from "lucide-react";

type Status = "idle" | "loading" | "success" | "error";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<Status>("idle");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("loading");

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (res?.ok) {
      setStatus("success");
      setTimeout(() => {
        window.location.href = "/";
      }, 1500); // show success for 1.5s then redirect
    } else {
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000); // reset after 3s
    }
  }

  // Success screen
  if (status === "success") {
    return (
      <div
        className="min-h-screen flex items-center justify-center px-4"
        style={{ background: "var(--bg)" }}
      >
        <div className="flex flex-col items-center gap-4 text-center">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center"
            style={{
              background: "rgba(74, 222, 128, 0.15)",
              border: "2px solid var(--accent)",
              animation: "pop 0.3s ease-out",
            }}
          >
            <CheckCircle size={32} style={{ color: "var(--accent)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold">Signed in successfully!</h2>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              Redirecting to your dashboard...
            </p>
          </div>
          <div
            className="w-48 h-1 rounded-full overflow-hidden"
            style={{ background: "var(--border)" }}
          >
            <div
              className="h-full rounded-full"
              style={{
                background: "var(--accent)",
                animation: "progress 1.5s linear forwards",
              }}
            />
          </div>
        </div>
        <style>{`
          @keyframes pop {
            0% { transform: scale(0.5); opacity: 0; }
            70% { transform: scale(1.1); }
            100% { transform: scale(1); opacity: 1; }
          }
          @keyframes progress {
            from { width: 0%; }
            to { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-2 justify-center mb-8">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}
          >
            <Zap size={16} className="text-black" />
          </div>
          <span
            className="font-bold text-xl"
            style={{ fontFamily: "Syne, sans-serif" }}
          >
            VitalTrack
          </span>
        </div>

        <div
          className="rounded-2xl p-6 border"
          style={{
            background: "var(--bg-card)",
            borderColor:
              status === "error" ? "rgba(239,68,68,0.5)" : "var(--border)",
            transition: "border-color 0.3s",
          }}
        >
          <h1 className="text-xl font-bold mb-6">Sign in</h1>

          {/* Error banner */}
          {status === "error" && (
            <div
              className="mb-4 px-3 py-2 rounded-lg text-sm flex items-center gap-2"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}
            >
              <XCircle size={15} />
              Invalid email or password
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                className="text-sm mb-1 block"
                style={{ color: "var(--text-muted)" }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={status === "loading"}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none disabled:opacity-50"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
            <div>
              <label
                className="text-sm mb-1 block"
                style={{ color: "var(--text-muted)" }}
              >
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={status === "loading"}
                className="w-full px-3 py-2 rounded-xl border text-sm outline-none disabled:opacity-50"
                style={{
                  background: "var(--bg)",
                  borderColor: "var(--border)",
                  color: "var(--text)",
                }}
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ background: "var(--accent)", color: "black" }}
            >
              {status === "loading" ? (
                <>
                  <div
                    className="w-4 h-4 border-2 rounded-full animate-spin"
                    style={{
                      borderColor: "rgba(0,0,0,0.3)",
                      borderTopColor: "black",
                    }}
                  />
                  Signing in...
                </>
              ) : (
                "Sign in"
              )}
            </button>
          </form>

          <p
            className="text-sm text-center mt-4"
            style={{ color: "var(--text-muted)" }}
          >
            No account?{" "}
            <Link href="/auth/register" style={{ color: "var(--accent)" }}>
              Register
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}