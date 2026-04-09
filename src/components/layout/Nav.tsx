"use client";
// src/components/layout/Nav.tsx
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard, User, Utensils, Flame, BarChart3, Zap, LogOut,
} from "lucide-react";
import clsx from "clsx";

const links = [
  { href: "/",             icon: LayoutDashboard, label: "Dashboard",    exact: true  },
  { href: "/profile",      icon: User,            label: "Profile",      exact: true  },
  { href: "/log",          icon: Utensils,        label: "Log Food",     exact: true  },
  { href: "/log/activity", icon: Flame,           label: "Log Activity", exact: true  },
  { href: "/insights",     icon: BarChart3,       label: "Insights",     exact: false },
];

export default function Nav() {
  const path = usePathname();
  const { data: session } = useSession();

  const isActive = (href: string, exact: boolean) => {
    if (exact) return path === href;
    return path === href || path.startsWith(href + "/");
  };

  return (
    <>
      {/* Desktop sidebar */}
      <aside
        className="hidden md:flex fixed left-0 top-0 h-full w-64 flex-col border-r z-40"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        <div className="p-6 border-b" style={{ borderColor: "var(--border)" }}>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "var(--accent)" }}>
              <Zap size={16} className="text-black" />
            </div>
            <span className="font-bold text-lg" style={{ fontFamily: "Syne, sans-serif" }}>
              VitalTrack
            </span>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          {links.map(({ href, icon: Icon, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-sm font-medium",
                  active ? "nav-active" : "hover:bg-white/5"
                )}
                style={{ color: active ? "var(--accent)" : "var(--text-muted)" }}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t space-y-3" style={{ borderColor: "var(--border)" }}>
          {session?.user && (
            <div className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
              {session.user.name || session.user.email}
            </div>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/auth/login" })}
            className="flex items-center gap-2 text-sm w-full px-3 py-2 rounded-xl hover:bg-white/5 transition-colors"
            style={{ color: "var(--text-muted)" }}
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <div
        className="fixed bottom-0 left-0 right-0 md:hidden border-t z-40 flex"
        style={{ background: "var(--bg-card)", borderColor: "var(--border)" }}
      >
        {links.map(({ href, icon: Icon, label, exact }) => {
          const active = isActive(href, exact);
          return (
            <Link
              key={href}
              href={href}
              className="flex-1 flex flex-col items-center py-2 text-xs gap-1 transition-colors"
              style={{ color: active ? "var(--accent)" : "var(--text-dim)" }}
            >
              <Icon size={20} />
              <span className="truncate w-full text-center px-1">{label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </div>
    </>
  );
}