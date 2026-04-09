"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Zap } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError("Invalid email or password");
    } else if (res?.ok) {
      router.push("/");
      router.refresh(); // forces Next.js to re-evaluate middleware/session
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4"
      style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-2 justify-center mb-8">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ background: "var(--accent)" }}>
            <Zap size={16} className="text-black" />
          </div>
          <span className="font-bold text-xl" style={{ fontFamily: "Syne, sans-serif" }}>
            VitalTrack
          </span>
        </div>
        <div className="rounded-2xl p-6 border" style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}>
          <h1 className="text-xl font-bold mb-6">Sign in</h1>
          {error && (
            <div className="mb-4 px-3 py-2 rounded-lg text-sm"
              style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
              {error}
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--text-muted)" }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                required className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            </div>
            <div>
              <label className="text-sm mb-1 block" style={{ color: "var(--text-muted)" }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                required className="w-full px-3 py-2 rounded-xl border text-sm outline-none"
                style={{ background: "var(--bg)", borderColor: "var(--border)", color: "var(--text)" }} />
            </div>
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-xl font-semibold text-sm transition-opacity disabled:opacity-50"
              style={{ background: "var(--accent)", color: "black" }}>
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
          <p className="text-sm text-center mt-4" style={{ color: "var(--text-muted)" }}>
            No account?{" "}
            <Link href="/auth/register" style={{ color: "var(--accent)" }}>Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}