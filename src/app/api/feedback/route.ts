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
    feedback_type,
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
    top_missing_feature,
    features_wanted,
    nps_score,
  } = body;

  // "video" (per-finished-video quality feedback, tied to a job) is the default —
  // the only type the existing widget has ever sent, and its job_id requirement
  // must be checked here, before any Supabase call, so a malformed video-type
  // request still fails cleanly. "product" (general, not tied to a job — the
  // Feedback nav tab) skips this entirely.
  const type = feedback_type === "product" ? "product" : "video";

  if (type === "video" && !job_id) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const authedClient = await createAuthedClient();
  const {
    data: { user: authUser },
  } = await authedClient.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  if (type === "video") {
    const { data: job } = await authedClient
      .from("jobs")
      .select("id")
      .eq("id", job_id)
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 403 });
    }
  }

  const supabase = createAdminClient();
  const { error: dbError } = await supabase.from("feedback").insert({
    feedback_type: type,
    job_id: type === "video" ? job_id : null,
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
    top_missing_feature,
    features_wanted,
    nps_score,
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
      subject:
        type === "product"
          ? "[stemvid] New product feedback"
          : `[stemvid] New feedback for job ${job_id}`,
      text: lines,
    });
  }

  return NextResponse.json({ ok: true });
}
