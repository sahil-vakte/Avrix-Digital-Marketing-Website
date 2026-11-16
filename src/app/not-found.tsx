import Link from "next/link";
export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="font-display text-5xl font-extrabold">404</h1>
      <p className="mt-3 text-ink-500">That page could not be found.</p>
      <Link href="/" className="btn-primary mt-6">Back to home</Link>
    </div>
  );
}
