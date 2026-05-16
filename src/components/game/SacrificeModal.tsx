"use client";
import { useState } from "react";
import DeckItem, { type DeckItemData } from "./shared/DeckItem";
import type { HandCard } from "./shared/Hand";

export default function SacrificeModal({
  open,
  hand,
  onConfirm,
  onClose,
  mode,
}: {
  open: boolean;
  hand: HandCard[];
  onConfirm: (cardId: string) => Promise<void>;
  onClose: () => void;
  mode: "classic" | "questions" | "stella";
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return null;

  const isQuestions = mode === "questions";
  const itemLabel = isQuestions ? "pergunta" : "carta";

  function close() {
    if (busy) return;
    setSelected(null);
    onClose();
  }

  async function handleConfirm() {
    if (!selected || busy) return;
    setBusy(true);
    try {
      await onConfirm(selected);
      setSelected(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sacrifice-title"
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm animate-fade-up"
      onClick={close}
    >
      <div
        className="panel w-full max-w-2xl p-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h2
              id="sacrifice-title"
              className="font-display text-lg text-dixit-gold"
              style={{ letterSpacing: "0.06em" }}
            >
              🔁 Sacrificar {itemLabel}
            </h2>
            <p className="mt-1 font-serif text-xs italic text-parchment/55">
              Escolha 1 {itemLabel} da sua mão para descartar e receber uma nova do deck.
              Você só pode fazer isso uma vez por partida.
            </p>
          </div>
          <button
            onClick={close}
            className="shrink-0 text-parchment/35 transition hover:text-parchment/70"
            aria-label="Fechar"
          >
            ✕
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
          {hand.map((c) => {
            const item: DeckItemData =
              c.kind === "image"
                ? { kind: "image", value: c.value }
                : { kind: "question", value: c.value };
            const isSelected = selected === c.id;
            return (
              <button
                key={c.id}
                onClick={() => !busy && setSelected(isSelected ? null : c.id)}
                disabled={busy}
                className={`card-frame relative overflow-hidden rounded transition ${
                  isSelected
                    ? "ring-2 ring-red-400 shadow-[0_0_18px_rgba(248,113,113,0.55)]"
                    : "opacity-90 hover:opacity-100"
                }`}
              >
                <DeckItem item={item} />
                {isSelected && (
                  <div className="absolute inset-0 flex items-center justify-center bg-red-950/45">
                    <span className="font-label text-[10px] uppercase tracking-widest text-red-100">
                      Sacrificar
                    </span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        <div className="mt-5 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={close}
            disabled={busy}
            className="btn-ghost px-5 py-2.5 text-xs"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selected || busy}
            className="btn-gold px-5 py-2.5 text-xs"
          >
            {busy ? "Trocando..." : `Confirmar sacrifício`}
          </button>
        </div>
      </div>
    </div>
  );
}
