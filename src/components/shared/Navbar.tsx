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
        <Link href="/" className="text-xl font-bold text-teal">
          stemvid.ai
        </Link>

        <div className="flex items-center gap-4">
          {user ? (
            <>
              <Link
                href="/dashboard"
                className="text-sm text-gray-700 hover:text-teal"
              >
                Dashboard
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
            </>
          ) : isLanding ? (
            <Link
              href="/auth"
              className="rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark"
            >
              Login
            </Link>
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
