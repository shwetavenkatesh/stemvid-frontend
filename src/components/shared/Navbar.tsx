"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase";

export default function Navbar({
  user,
}: {
  user: { email: string } | null;
}) {
  const pathname = usePathname();
  const isLanding = pathname === "/";

  return (
    <nav className="w-full border-b border-gray-200 bg-background">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-base font-medium text-teal-dark">
          stemvid.ai
        </Link>

        <div className="flex items-center gap-6">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className={`text-sm ${
                  pathname?.startsWith("/dashboard")
                    ? "border-b-2 border-teal-light pb-0.5 font-medium text-teal-dark"
                    : "text-gray-700 hover:text-teal"
                }`}
              >
                Dashboard
              </Link>
              <Link
                href="/settings"
                className="text-sm text-gray-700 hover:text-teal"
              >
                Settings
              </Link>
              <Link
                href="/feedback"
                className="text-sm text-gray-700 hover:text-teal"
              >
                Feedback
              </Link>
              <button
                onClick={async () => {
                  const supabase = createClient();
                  await supabase.auth.signOut();
                  window.location.href = "/";
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Log out
              </button>
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-teal-light text-[11px] font-medium text-teal-dark">
                {user.email.charAt(0).toUpperCase()}
              </div>
            </>
          ) : isLanding ? (
            <>
              <a href="#how-it-works" className="text-sm text-gray-700 hover:text-teal">
                How it works
              </a>
              <a href="#who-its-for" className="text-sm text-gray-700 hover:text-teal">
                Who it&apos;s for
              </a>
              <Link href="/auth" className="text-sm text-gray-700 hover:text-teal">
                Log in
              </Link>
              <Link
                href="/auth"
                className="rounded-lg bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
              >
                Try it free
              </Link>
            </>
          ) : (
            <Link
              href="/auth"
              className="text-sm text-gray-700 hover:text-teal"
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
