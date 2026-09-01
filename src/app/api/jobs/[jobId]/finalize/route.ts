import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, status")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }
  if (job.status !== "reviewing") {
    return NextResponse.json(
      { error: "Job is not in review — nothing to finalize" },
      { status: 400 }
    );
  }

  const { data: inFlight } = await supabase
    .from("segment_status")
    .select("segment_index")
    .eq("job_id", jobId)
    .eq("status", "regenerating");
  if (inFlight && inFlight.length > 0) {
    return NextResponse.json(
      { error: "Some segments are still regenerating — wait for them to finish first" },
      { status: 409 }
    );
  }

  const webhookUrl = process.env.MODAL_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Pipeline not configured" }, { status: 500 });
  }

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "user_finalize", job_id: jobId }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: "Failed to start finalize" }, { status: 502 });
  }

  return NextResponse.json({ status: "queued" });
}
