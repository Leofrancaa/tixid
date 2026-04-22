"use client";
import { useEffect } from "react";

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  variant = "default",
  busy = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  const confirmClass =
    variant === "danger" ? "btn-wine w-full py-3 text-sm" : "btn-gold w-full py-3 text-sm";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm animate-fade-up"
      onClick={onCancel}
    >
      <div
        className="panel w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h2
          id="confirm-dialog-title"
          className="mb-2 font-display text-xl text-dixit-gold"
          style={{ letterSpacing: "0.06em" }}
        >
          {title}
        </h2>
        {message && (
          <p className="mb-5 font-serif text-sm italic text-parchment/60">
            {message}
          </p>
        )}
        <div className="flex flex-col gap-2">
          <button
            onClick={onConfirm}
            disabled={busy}
            className={confirmClass}
            autoFocus
          >
            {busy ? "…" : confirmLabel}
          </button>
          <button
            onClick={onCancel}
            disabled={busy}
            className="btn-ghost w-full py-2 text-xs"
          >
            {cancelLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
