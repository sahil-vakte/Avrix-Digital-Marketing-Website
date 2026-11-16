import { NextRequest } from "next/server";
import { availableSlots } from "@/lib/booking";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date") ?? "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return Response.json({ slots: [] });
  return Response.json({ slots: await availableSlots(date) });
}
