import type { Metadata } from "next";
import { findMessageByToken } from "@/lib/tracking";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false } };

export default async function Unsubscribe({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ done?: string }> }) {
  const { token } = await params;
  const { done } = await searchParams;
  const m = await findMessageByToken(token);
  const masked = m ? m.toEmail.replace(/^(.)(.*)(@.*)$/, (_x, a, b, c) => a + "*".repeat(Math.min(6, b.length)) + c) : null;
  return (
    <div className="container-x flex min-h-[60vh] max-w-lg flex-col justify-center py-16 text-center">
      {done ? (
        <>
          <h1 className="h-display text-3xl">You've been unsubscribed</h1>
          <p className="mt-3 text-ink-500">{masked} won't receive any more marketing emails from Avrix UK &amp; Europe. If this was a mistake, just reply to any of our emails.</p>
        </>
      ) : m ? (
        <>
          <h1 className="h-display text-3xl">Unsubscribe from our emails?</h1>
          <p className="mt-3 text-ink-500">Confirm below and we'll stop sending marketing emails to <b>{masked}</b>.</p>
          <form method="post" action={`/api/unsubscribe/${token}`} className="mt-6">
            <input type="hidden" name="source" value="page" />
            <button className="btn-primary">Unsubscribe me</button>
          </form>
        </>
      ) : (
        <>
          <h1 className="h-display text-3xl">Link not recognised</h1>
          <p className="mt-3 text-ink-500">This unsubscribe link has expired. Reply to our email with “unsubscribe” and we'll remove you straight away.</p>
        </>
      )}
    </div>
  );
}
