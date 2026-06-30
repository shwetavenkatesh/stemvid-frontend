import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";

const ADMIN_EMAIL = "shwets.ven@gmail.com";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || user.email !== ADMIN_EMAIL) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const webhookUrl = process.env.MODAL_WEBHOOK_URL;
  if (!webhookUrl) {
    return NextResponse.json({ error: "Pipeline not configured" }, { status: 500 });
  }

  const resp = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "admin_finalize", job_id: jobId }),
  });

  if (!resp.ok) {
    return NextResponse.json({ error: "Failed to start finalize" }, { status: 502 });
  }

  return NextResponse.json({ status: "queued" });
}
