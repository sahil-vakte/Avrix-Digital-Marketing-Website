// RFC 8058 one-click unsubscribe (POST from Gmail/Yahoo) and the form on /u/[token].
import { NextRequest, NextResponse } from "next/server";
import { unsubscribeByToken } from "@/lib/tracking";
import { env } from "@/lib/env";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ct = req.headers.get("content-type") ?? "";
  let fromPage = false;
  if (ct.includes("form")) {
    const fd = await req.formData();
    fromPage = fd.get("source") === "page";
  }
  await unsubscribeByToken(token, fromPage ? "page" : "one-click").catch((e) => console.error("unsubscribe", e));
  if (fromPage) return NextResponse.redirect(`${env.appUrl}/u/${token}?done=1`, 303);
  return new NextResponse("Unsubscribed", { status: 200 });
}
