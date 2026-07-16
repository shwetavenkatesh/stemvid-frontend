import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase-admin";

export async function POST(req: NextRequest) {
  let name: string, email: string, type: string, message: string;
  try {
    ({ name, email, type, message } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("contact_submissions").insert({
    name: name || null,
    email,
    subject: type || "general",
    message,
  });

  if (dbError) {
    console.error("contact insert failed", dbError);
    return NextResponse.json({ error: "Failed to send message" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
