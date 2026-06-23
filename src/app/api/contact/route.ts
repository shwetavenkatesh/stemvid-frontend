import { NextRequest, NextResponse } from "next/server";

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? "shwets.ven@gmail.com";

export async function POST(req: NextRequest) {
  let name: string, email: string, type: string, message: string;
  try {
    ({ name, email, type, message } = await req.json());
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  if (!email || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("RESEND_API_KEY not set — skipping email delivery");
    return NextResponse.json({ ok: true });
  }

  const { Resend } = await import("resend");
  const resend = new Resend(apiKey);

  const subject =
    type === "more_videos"
      ? `[stemvid] More videos request from ${email}`
      : `[stemvid] Contact from ${name || email}`;

  await resend.emails.send({
    from: "stemvid.ai <notifications@stemvid.ai>",
    to: ADMIN_EMAIL,
    subject,
    text: `Name: ${name || "—"}\nEmail: ${email}\nType: ${type || "general"}\n\n${message}`,
  });

  return NextResponse.json({ ok: true });
}
