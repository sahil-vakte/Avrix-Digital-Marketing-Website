"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icon } from "../ui/Icon";
import { Logo } from "../site/Logo";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: "home" },
  { href: "/admin/leads", label: "Leads", icon: "users" },
  { href: "/admin/bookings", label: "Bookings", icon: "calendar" },
  { href: "/admin/contacts", label: "Contacts", icon: "list" },
  { href: "/admin/contacts/import", label: "Import", icon: "upload" },
  { href: "/admin/lists", label: "Lists & segments", icon: "list" },
  { href: "/admin/campaigns", label: "Campaigns", icon: "send" },
  { href: "/admin/templates", label: "Templates", icon: "file" },
  { href: "/admin/suppression", label: "Suppression", icon: "ban" },
  { href: "/admin/content", label: "Website content", icon: "globe" },
  { href: "/admin/settings", label: "Settings", icon: "settings", admin: true },
  { href: "/admin/audit", label: "Audit log", icon: "shield", admin: true },
];

export function Sidebar({ name, role, logout }: { name: string; role: string; logout: () => void }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const active = (h: string) => (h === "/admin" ? path === h : path === h || (path.startsWith(h + "/") && !(h === "/admin/contacts" && path.startsWith("/admin/contacts/import"))));
  const nav = (
    <nav className="flex flex-col gap-0.5 p-3">
      {NAV.filter((n) => !n.admin || role === "ADMIN").map((n) => (
        <Link key={n.href} href={n.href} onClick={() => setOpen(false)}
          className={cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium", active(n.href) ? "bg-brand-600 text-white" : "text-gray-300 hover:bg-white/10 hover:text-white")}>
          <Icon name={n.icon} className="h-4 w-4" />{n.label}
        </Link>
      ))}
    </nav>
  );
  return (
    <>
      <div className="flex items-center justify-between bg-ink-900 px-4 py-3 lg:hidden">
        <Logo light />
        <button className="text-white" onClick={() => setOpen(!open)} aria-label="Menu"><Icon name={open ? "x" : "menu"} /></button>
      </div>
      {open && <div className="bg-ink-900 lg:hidden">{nav}</div>}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col bg-ink-900 lg:flex">
        <div className="px-5 py-5"><Link href="/admin"><Logo light /></Link></div>
        <div className="flex-1 overflow-y-auto">{nav}</div>
        <div className="border-t border-white/10 p-4 text-sm">
          <Link href="/admin/account/security" className="block text-white hover:underline">{name}</Link>
          <p className="text-xs text-gray-400">{role === "ADMIN" ? "Administrator" : "Staff"}</p>
          <form action={logout}><button className="mt-3 flex items-center gap-2 text-xs text-gray-400 hover:text-white"><Icon name="logout" className="h-4 w-4" /> Sign out</button></form>
        </div>
      </aside>
    </>
  );
}
