import type { Metadata } from "next";
import { Logo } from "@/components/site/Logo";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function Login({ searchParams }: { searchParams: Promise<{ next?: string; reset?: string }> }) {
  const sp = await searchParams;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card">
          <h1 className="mb-4 font-display text-xl font-bold">Admin sign in</h1>
          <LoginForm next={sp.next ?? "/admin"} reset={!!sp.reset} />
        </div>
      </div>
    </div>
  );
}
