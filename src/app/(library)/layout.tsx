"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";
import LibraryRail from "@/components/dashboard/LibraryRail";

export default function LibraryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createClient();
  const [user, setUser] = useState<{ email: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) setUser({ email: data.user.email ?? "" });
    });
  }, [supabase]);

  return (
    <>
      <Navbar user={user} />
      <div className="flex flex-1">
        <LibraryRail />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </>
  );
}
