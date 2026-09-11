"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase";
import Navbar from "@/components/shared/Navbar";

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
      <div className="flex flex-1">{children}</div>
    </>
  );
}
