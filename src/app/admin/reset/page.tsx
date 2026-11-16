import { Logo } from "@/components/site/Logo";
import { RequestReset } from "./ResetForms";

export default function Reset() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-sm"><div className="mb-6 flex justify-center"><Logo /></div>
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-card"><h1 className="mb-4 font-display text-xl font-bold">Reset password</h1><RequestReset /></div></div>
    </div>
  );
}
