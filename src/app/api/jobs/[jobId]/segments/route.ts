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

  const { data: statusRows } = await supabase
    .from("segment_status")
    .select("segment_index, video_status, audio_status, regenerated")
    .eq("job_id", jobId);
  const statusByIndex = new Map(
    (statusRows ?? []).map((s) => [s.segment_index, s])
  );

  const listResp = await r2.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `videos/segments/${jobId}/`,
    })
  );
  const videoUrlByIndex = new Map<number, string>();
  await Promise.all(
    (listResp.Contents ?? [])
      .map((o) => o.Key!)
      .filter((k) => k.endsWith(".mp4"))
      .map(async (key) => {
        const match = key.match(/seg_(\d+)\.mp4$/);
        if (!match) return;
        const url = await getSignedUrl(
          r2,
          new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
          { expiresIn: 86400 }
        );
        videoUrlByIndex.set(parseInt(match[1], 10), url);
      })
  );

  // Audio finishes segment-by-segment well before video — same narration used in the
  // final render, played back so there's something real to see/hear while waiting.
  const audioListResp = await r2.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME!,
      Prefix: `videos/audio/${jobId}/`,
    })
  );
  const audioUrlByIndex = new Map<number, string>();
  await Promise.all(
    (audioListResp.Contents ?? [])
      .map((o) => o.Key!)
      .filter((k) => k.endsWith(".mp3"))
      .map(async (key) => {
        const match = key.match(/seg_(\d+)\.mp3$/);
        if (!match) return;
        const url = await getSignedUrl(
          r2,
          new GetObjectCommand({ Bucket: process.env.R2_BUCKET_NAME!, Key: key }),
          { expiresIn: 86400 }
        );
        audioUrlByIndex.set(parseInt(match[1], 10), url);
      })
  );

  // segments.json is uploaded early (right after the audio stage) — narration text
  // and, indirectly, the full segment count become available well before every
  // segment finishes rendering. Its absence just means the job hasn't reached that
  // point yet (or is an older job from before this existed) — not an error.
  const narrationByIndex = new Map<number, string>();
  const durationByIndex = new Map<number, number>();
  try {
    const segsObj = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: `videos/other/${jobId}/segments.json`,
      })
    );
    const body = await segsObj.Body!.transformToString();
    const segmentsJson: { narration_text?: string; duration?: number }[] = JSON.parse(body);
    segmentsJson.forEach((s, i) => {
      if (s.narration_text) narrationByIndex.set(i, s.narration_text);
      if (typeof s.duration === "number") durationByIndex.set(i, s.duration);
    });
  } catch {
    // Not uploaded yet — fine, script dock/timeline just stay empty/loading.
  }

  // script.md uploads the moment the script is written (on_script_ready in
  // modal_app.py), well before segments.json exists — that needs the full audio
  // stage to finish first. Expose the raw script as an early fallback so the script
  // dock has real content to show long before per-segment narration_text is ready,
  // instead of a loading skeleton for the whole audio stage.
  let rawScript: string | null = null;
  try {
    const scriptObj = await r2.send(
      new GetObjectCommand({
        Bucket: process.env.R2_BUCKET_NAME!,
        Key: `videos/finals/${jobId}/script.md`,
      })
    );
    rawScript = await scriptObj.Body!.transformToString();
  } catch {
    // Not uploaded yet — fine, script dock falls back to its loading state.
  }

  const indices = new Set<number>([...statusByIndex.keys(), ...videoUrlByIndex.keys()]);
  const segments = Array.from(indices)
    .sort((a, b) => a - b)
    .map((index) => {
      const row = statusByIndex.get(index);
      const hasVideo = videoUrlByIndex.has(index);
      return {
        index,
        video_url: videoUrlByIndex.get(index) ?? null,
        // A row not yet seeded but with a rendered mp4 is only possible for jobs
        // created before per-segment seeding existed — infer "ready" from the mp4
        // being there, same as this endpoint's original (pre-seeding) behavior.
        video_status: row?.video_status ?? (hasVideo ? "ready" : "pending"),
        audio_status: row?.audio_status ?? (hasVideo ? "ready" : "pending"),
        audio_url: audioUrlByIndex.get(index) ?? null,
        narration_text: narrationByIndex.get(index) ?? null,
        duration: durationByIndex.get(index) ?? null,
        regenerated: row?.regenerated ?? false,
      };
    });

  return NextResponse.json({ job_status: job.status, segments, script: rawScript });
}
