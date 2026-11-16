import { NextRequest, NextResponse } from "next/server";
import { recordClick } from "@/lib/tracking";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const linkId = req.nextUrl.searchParams.get("l");
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? null;
  let url: string | null = null;
  try {
    url = await recordClick(token, linkId, req.headers.get("user-agent"), ip);
  } catch (e) {
    console.error("click tracking", e);
  }
  const safe = url && /^https?:\/\//i.test(url) ? url : env.appUrl;
  return NextResponse.redirect(safe, { status: 302, headers: { "Cache-Control": "no-store" } });
}
