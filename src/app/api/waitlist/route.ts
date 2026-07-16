import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email) {
    return NextResponse.json({ error: "Missing email" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("waitlist").insert({ email });

  if (dbError) {
    if (dbError.code === "23505") {
      return NextResponse.json({ error: "duplicate" }, { status: 409 });
    }
    console.error("waitlist insert failed", dbError);
    return NextResponse.json({ error: "Failed to join waitlist" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
