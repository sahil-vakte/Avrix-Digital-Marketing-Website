import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { appScope } from "@/lib/apps";
import { Sidebar } from "@/components/admin/Sidebar";
import { logoutAction } from "../auth-actions";
import { selectApplication } from "../app-actions";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Avrix admin" }, robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const scope = await appScope(user);
  return (
    <div className="min-h-screen bg-gray-50 lg:flex">
      <Sidebar name={user.name} role={user.role} logout={logoutAction} select={selectApplication}
        apps={scope.apps.map((a) => ({ id: a.id, name: a.name, color: a.color, health: a.dataClass === "HEALTH" }))}
        selectedId={scope.selected?.id ?? null} />
      <div className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">{children}</div>
    </div>
  );
}
