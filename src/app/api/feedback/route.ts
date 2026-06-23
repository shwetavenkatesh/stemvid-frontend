import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "shwets.ven@gmail.com";

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email delivery");
    return NextResponse.json({ ok: true });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const lines = Object.entries(body)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");

  await resend.emails.send({
    from: "stemvid.ai <notifications@stemvid.ai>",
    to: ADMIN_EMAIL,
    subject: `[stemvid] New feedback from ${body.email || "anonymous"}`,
    text: lines,
  });

  return NextResponse.json({ ok: true });
}
