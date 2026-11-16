import { Logo } from "@/components/site/Logo";
import { SetPassword } from "../ResetForms";

export default async function ResetToken({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm"><div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card"><h1 className="mb-4 font-display text-xl font-bold">Choose a new password</h1><SetPassword token={token} /></div></div>
    </div>
  );
}
