import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/layout/Nav";
import { SessionProvider } from "@/components/SessionProvider";

export const metadata: Metadata = {
  title: "VitalTrack — Health & Fitness",
  description: "Your personal health and fitness companion",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen">
        <SessionProvider>
          <div className="flex min-h-screen">
            <Nav />
            <main className="flex-1 md:ml-64 pb-20 md:pb-0">
              <div className="max-w-5xl mx-auto px-4 py-6">
                {children}
              </div>
            </main>
          </div>
        </SessionProvider>
      </body>
    </html>
  );
}