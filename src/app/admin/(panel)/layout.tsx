import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { Sidebar } from "@/components/admin/Sidebar";
import { logoutAction } from "../auth-actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Avrix admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <Sidebar name={user.name} role={user.role} logout={logoutAction} />
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
