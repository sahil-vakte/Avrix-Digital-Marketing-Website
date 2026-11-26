"use client";
import Link from "next/link";
import { useOptimistic, useTransition } from "react";
import { moveLead } from "./actions";

type L = { id: string; name: string; businessName: string | null; value: string | null; currency: string; source: string; stageId: string; priority?: string; createdAt: string };
type S = { id: string; name: string; color: string };

export function Board({ stages, leads }: { stages: S[]; leads: L[] }) {
  const [, start] = useTransition();
  const [items, move] = useOptimistic(leads, (cur: L[], a: { id: string; stageId: string }) => cur.map((l) => (l.id === a.id ? { ...l, stageId: a.stageId } : l)));
  if (!stages.length) return <p className="rounded-xl border border-dashed border-gray-300 p-6 text-sm text-ink-500">This application has no pipeline stages yet. Add them in Applications.</p>;
  return (
    <div className="flex gap-4 overflow-x-auto pb-4">
      {stages.map((s) => {
        const col = items.filter((l) => l.stageId === s.id);
        const total = col.reduce((n, l) => n + Number(l.value ?? 0), 0);
        return (
          <div key={s.id} className="w-72 shrink-0 rounded-2xl bg-gray-100 p-3"
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const id = e.dataTransfer.getData("text/lead");
              if (!id) return;
              start(async () => { move({ id, stageId: s.id }); await moveLead(id, s.id); });
            }}>
            <div className="mb-3 flex items-center justify-between px-1">
              <span className="flex items-center gap-2 text-sm font-bold"><span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />{s.name}</span>
              <span className="text-xs text-ink-500">{col.length}{total ? ` · £${Math.round(total).toLocaleString("en-GB")}` : ""}</span>
            </div>
            <div className="min-h-[60px] space-y-2">
              {col.map((l) => (
                <Link key={l.id} href={`/admin/leads/${l.id}`} draggable onDragStart={(e) => e.dataTransfer.setData("text/lead", l.id)}
                  className="block cursor-grab rounded-xl border border-gray-200 bg-white p-3 text-sm shadow-sm hover:border-brand-300 active:cursor-grabbing">
                  <p className="flex items-center gap-1.5 font-semibold">{l.priority === "high" && <span className="h-2 w-2 shrink-0 rounded-full bg-red-500" title="High priority" />}{l.name}</p>
                  {l.businessName && <p className="text-xs text-ink-500">{l.businessName}</p>}
                  <p className="mt-2 flex justify-between text-[11px] text-ink-500"><span>{l.source.replace(/_/g, " ").toLowerCase()}</span>
                    {l.value && <span className="font-semibold text-ink-700">{new Intl.NumberFormat("en-GB", { style: "currency", currency: l.currency, maximumFractionDigits: 0 }).format(Number(l.value))}</span>}</p>
                </Link>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
