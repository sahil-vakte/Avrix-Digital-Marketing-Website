"use client";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/utils";

export function SubmitButton({ children, className, pendingText, name, value, formAction }: {
  children: React.ReactNode; className?: string; pendingText?: string; name?: string; value?: string; formAction?: (fd: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} formAction={formAction} disabled={pending} className={cn(className ?? "btn-primary")}>
      {pending ? pendingText ?? "Saving…" : children}
    </button>
  );
}

export function ConfirmButton({ children, message, className, name, value, formAction }: {
  children: React.ReactNode; message: string; className?: string; name?: string; value?: string; formAction?: (fd: FormData) => void;
}) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" name={name} value={value} formAction={formAction} disabled={pending} className={cn(className ?? "btn-danger btn-sm")}
      onClick={(e) => { if (!confirm(message)) e.preventDefault(); }}>
      {pending ? "Working…" : children}
    </button>
  );
}
