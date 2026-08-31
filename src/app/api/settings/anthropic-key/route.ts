import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

// Cheap, free validation: listing models is metadata-only, no generation tokens
// spent. Confirms the key is real before we ever store it, instead of only
// finding out the first time a job actually tries to use it.
async function isValidAnthropicKey(key: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: {
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
      },
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("anthropic_api_key_id")
    .eq("id", user.id)
    .single();

  return NextResponse.json({ hasKey: !!profile?.anthropic_api_key_id });
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => ({}));
  const key = typeof body.key === "string" ? body.key.trim() : "";
  if (!key) {
    return NextResponse.json({ error: "API key is required" }, { status: 400 });
  }

  const valid = await isValidAnthropicKey(key);
  if (!valid) {
    return NextResponse.json(
      { error: "That key didn't validate with Anthropic — double-check it and try again" },
      { status: 400 }
    );
  }

  // SECURITY DEFINER + auth.uid() inside means this can only ever write the
  // calling user's own row — see byok_schema.sql. The key itself never round-trips
  // back through this response; only success/failure does.
  const { error } = await supabase.rpc("save_byok_anthropic_key", { new_key: key });
  if (error) {
    return NextResponse.json({ error: "Failed to save key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { error } = await supabase.rpc("remove_byok_anthropic_key");
  if (error) {
    return NextResponse.json({ error: "Failed to remove key" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
