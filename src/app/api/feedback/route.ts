import { NextRequest, NextResponse } from "next/server";
import { createClient as createAuthedClient } from "@/lib/supabase-server";
import { createAdminClient } from "@/lib/supabase-admin";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "shwets.ven@gmail.com";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const {
    job_id,
    role,
    field,
    accurate,
    clarity,
    animations,
    improve,
    use_again,
    purpose,
    extra,
  } = body;

  if (!job_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const authedClient = await createAuthedClient();
  const {
    data: { user: authUser },
  } = await authedClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { data: job } = await authedClient
    .from("jobs")
    .select("id")
    .eq("id", job_id)
    .eq("user_id", authUser.id)
    .maybeSingle();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 403 });
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("feedback").insert({
    job_id,
    user_id: authUser.id,
    role,
    field,
    accuracy_rating: accurate,
    clarity_rating: clarity,
    animation_helpfulness: animations,
    improvement_suggestions: improve,
    would_return: use_again,
    content_type: purpose,
    additional_comments: extra,
  });

  if (dbError) {
    console.error("feedback insert failed", dbError);
    return NextResponse.json({ error: "Failed to save feedback" }, { status: 500 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const lines = Object.entries(body)
      .map(([k, v]) => `${k}: ${v}`)
      .join("\n");
    await resend.emails.send({
      from: "stemvid.ai <notifications@stemvid.ai>",
      to: ADMIN_EMAIL,
      subject: `[stemvid] New feedback for job ${job_id}`,
      text: lines,
    });
  }

  return NextResponse.json({ ok: true });
}
