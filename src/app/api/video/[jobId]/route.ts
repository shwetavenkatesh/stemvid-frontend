import { NextRequest, NextResponse } from "next/server";
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { createClient } from "@/lib/supabase-server";

const r2 = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT!,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ jobId: string }> }
) {
  const { jobId } = await params;
  const wantsDownload = new URL(req.url).searchParams.get("download") === "1";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: job } = await supabase
    .from("jobs")
    .select("id, user_id, title, status, video_url")
    .eq("id", jobId)
    .eq("user_id", user.id)
    .single();

  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  if (job.status !== "ready" || !job.video_url) {
    return NextResponse.json({ error: "Video not ready" }, { status: 400 });
  }

  const filename = `${job.title || "video"}.mp4`.replace(/[^a-zA-Z0-9._-]/g, "_");

  // Same endpoint serves two different callers: the in-page player (fetches this to
  // populate a <video src>) and the explicit Download button. "attachment" used to be
  // hardcoded, which forces every browser to treat the URL as a forced download rather
  // than something a <video> tag can play inline — confirmed real: the final video was
  // never actually watchable in the studio, only downloadable, for exactly this reason.
  // Only apply it when the caller explicitly asks to download.
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: job.video_url,
    ...(wantsDownload ? { ResponseContentDisposition: `attachment; filename="${filename}"` } : {}),
  });

  try {
    const url = await getSignedUrl(r2, command, { expiresIn: 300 });
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json(
      { error: "Failed to generate download link" },
      { status: 500 }
    );
  }
}
