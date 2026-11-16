"use client";
// TipTap rich-text editor that writes HTML into a hidden form field.
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import { useEffect, useState } from "react";
import { MERGE_TAGS } from "@/lib/merge";

export function RichEditor({ name, initial = "", mergeTags = false, placeholder = "Write your email…", onChange, minHeight = 220 }: {
  name: string; initial?: string; mergeTags?: boolean; placeholder?: string; onChange?: (html: string) => void; minHeight?: number;
}) {
  const [html, setHtml] = useState(initial);
  const [source, setSource] = useState(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ heading: { levels: [2, 3] }, link: { openOnClick: false, autolink: true } }), Placeholder.configure({ placeholder })],
    content: initial,
    onUpdate: ({ editor }) => { const h = editor.getHTML(); setHtml(h); onChange?.(h); },
  });
  useEffect(() => { onChange?.(initial); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const btn = (label: string, run: () => void, active?: boolean, title?: string) => (
    <button type="button" title={title ?? label} onClick={run} className={`rounded px-2 py-1 text-xs font-semibold ${active ? "bg-brand-100 text-brand-700" : "hover:bg-gray-100"}`}>{label}</button>
  );

  return (
    <div className="rounded-lg border border-gray-300 bg-white focus-within:border-brand-500">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-gray-200 p-1.5">
        {editor && !source && (
          <>
            {btn("B", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"), "Bold")}
            {btn("I", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"), "Italic")}
            {btn("H2", () => editor.chain().focus().toggleHeading({ level: 2 }).run(), editor.isActive("heading", { level: 2 }))}
            {btn("• List", () => editor.chain().focus().toggleBulletList().run(), editor.isActive("bulletList"))}
            {btn("1. List", () => editor.chain().focus().toggleOrderedList().run(), editor.isActive("orderedList"))}
            {btn("Quote", () => editor.chain().focus().toggleBlockquote().run(), editor.isActive("blockquote"))}
            {btn("Link", () => {
              const prev = editor.getAttributes("link").href as string | undefined;
              const url = prompt("Link URL (https://…)", prev ?? "https://");
              if (url === null) return;
              if (!url) editor.chain().focus().unsetLink().run();
              else editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
            }, editor.isActive("link"))}
            {btn("Undo", () => editor.chain().focus().undo().run())}
          </>
        )}
        {mergeTags && editor && (
          <select className="ml-auto rounded border border-gray-200 px-1.5 py-1 text-xs" value="" onChange={(e) => {
            if (!e.target.value) return;
            if (source) { setHtml(html + e.target.value); onChange?.(html + e.target.value); }
            else editor.chain().focus().insertContent(e.target.value).run();
          }}>
            <option value="">+ Merge tag</option>
            {MERGE_TAGS.map((m) => <option key={m.tag} value={m.tag}>{m.label} — {m.tag}</option>)}
          </select>
        )}
        <button type="button" onClick={() => { if (source && editor) editor.commands.setContent(html); setSource(!source); }} className={`${mergeTags ? "" : "ml-auto"} rounded px-2 py-1 text-xs text-ink-500 hover:bg-gray-100`}>{source ? "Visual" : "HTML"}</button>
      </div>
      {source ? (
        <textarea value={html} onChange={(e) => { setHtml(e.target.value); onChange?.(e.target.value); }} className="block w-full rounded-b-lg p-3 font-mono text-xs" style={{ minHeight }} />
      ) : (
        <div className="p-3 text-sm" style={{ minHeight }}><EditorContent editor={editor} /></div>
      )}
      <input type="hidden" name={name} value={html} />
    </div>
  );
}
