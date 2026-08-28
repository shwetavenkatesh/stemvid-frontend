import { NextRequest, NextResponse } from "next/server";
import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
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

  const { data: statuses } = await supabase
    .from("segment_status")
    .select("segment_index, status")
    .eq("job_id", jobId);
  const statusByIndex = new Map(
    (statuses ?? []).map((s) => [s.segment_index, s.status])
  );

  const listResp = await r2.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `videos/segments/${jobId}/`,
    })
  );
  const keys = (listResp.Contents ?? [])
    .map((o) => o.Key!)
    .filter((k) => k.endsWith(".mp4"));

  const segments = await Promise.all(
    keys.map(async (key) => {
      const match = key.match(/seg_(\d+)\.mp4$/);
      const index = match ? parseInt(match[1], 10) : -1;
      const video_url = await getSignedUrl(
        r2,
        new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
        { expiresIn: 3600 }
      );
      return {
        index,
        video_url,
        status: statusByIndex.get(index) ?? "ready",
      };
    })
  );
  segments.sort((a, b) => a.index - b.index);

  return NextResponse.json({ job_status: job.status, segments });
}
