import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

export async function POST(
  req: NextRequest,
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
  // "rendering" is included alongside "reviewing" because of chunked render
  // pipelining: segments now generate/review/render in groups, so a job can sit in
  // "rendering" for a while with some segments individually done (ready or failed)
  // while later chunks are still in progress. Regen only needs the target segment
  // to already be in a terminal state, not the whole job — the studio UI already
  // only shows the regen control once that segment's own video_status says so.
  if (job.status !== "reviewing" && job.status !== "rendering") {
    return NextResponse.json(
      { error: "Job is not far enough along yet — segments can only be regenerated once they've finished their first render" },
      { status: 400 }
    );
  }

  const body = await req.json();
  const { segment_index, instructions } = body;
  if (typeof segment_index !== "number" || !instructions || !instructions.trim()) {
    return NextResponse.json(
      { error: "segment_index and instructions are required" },
      { status: 400 }
    );
  }

  const webhookUrl = process.env.MODAL_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Pipeline not configured" }, { status: 500 });
  }

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      type: "user_regenerate",
      job_id: jobId,
      segment_index,
      instructions: instructions.trim(),
    }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: "Failed to start regeneration" }, { status: 502 });
  }

  return NextResponse.json({ status: "queued" });
}
