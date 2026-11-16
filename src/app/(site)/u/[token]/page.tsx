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
    <div className="s-container flex min-h-[70vh] max-w-xl flex-col justify-center py-16 text-center">
      <div className="s-card p-8 sm:p-10">
      <span className="s-icon-tile mx-auto mb-5 flex h-14 w-14"><svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 4h16a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zm0 1l8 7 8-7" /></svg></span>
      {done ? (
        <>
          <h1 className="font-display text-3xl font-bold">You've been unsubscribed</h1>
          <p className="mt-3 text-s-muted">{masked} won't receive any more marketing emails from Avrix UK &amp; Europe. If this was a mistake, just reply to any of our emails.</p>
        </>
      ) : m ? (
        <>
          <h1 className="font-display text-3xl font-bold">Unsubscribe from our emails?</h1>
          <p className="mt-3 text-s-muted">Confirm below and we'll stop sending marketing emails to <b>{masked}</b>.</p>
          <form method="post" action={`/api/unsubscribe/${token}`} className="mt-6">
            <input type="hidden" name="source" value="page" />
            <button className="s-btn-primary">Unsubscribe me</button>
          </form>
        </>
      ) : (
        <>
          <h1 className="font-display text-3xl font-bold">Link not recognised</h1>
          <p className="mt-3 text-s-muted">This unsubscribe link has expired. Reply to our email with “unsubscribe” and we'll remove you straight away.</p>
        </>
      )}
      </div>
    </div>
  );
}
