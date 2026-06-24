import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const MODAL_WEBHOOK_URL = process.env.MODAL_WEBHOOK_URL;

export async function POST(req: NextRequest) {
  if (!MODAL_WEBHOOK_URL) {
    return NextResponse.json(
      { error: "Pipeline not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { type, job_id, course_id, video_index } = body;

  if (type === "paper") {
    if (!job_id) {
      return NextResponse.json({ error: "job_id required" }, { status: 400 });
    }
    const { data: job } = await supabase
      .from("jobs")
      .select("id, user_id")
      .eq("id", job_id)
      .eq("user_id", user.id)
      .single();
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }
  } else if (type === "book" || type === "course_next") {
    if (!course_id) {
      return NextResponse.json(
        { error: "course_id required" },
        { status: 400 }
      );
    }
    const { data: course } = await supabase
      .from("courses")
      .select("id, user_id")
      .eq("id", course_id)
      .eq("user_id", user.id)
      .single();
    if (!course) {
      return NextResponse.json(
        { error: "Course not found" },
        { status: 404 }
      );
    }
  } else {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const payload: Record<string, unknown> = { type };
  if (job_id) payload.job_id = job_id;
  if (course_id) payload.course_id = course_id;
  if (video_index !== undefined) payload.video_index = video_index;

  const resp = await fetch(MODAL_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!resp.ok) {
    const text = await resp.text();
    console.error("[generate] Modal webhook error:", resp.status, text);
    return NextResponse.json(
      { error: "Failed to start pipeline" },
      { status: 502 }
    );
  }

  const result = await resp.json();
  return NextResponse.json(result);
}
