"use client";
import CardButton from "./CardButton";
import type { DeckItemData } from "./DeckItem";

export interface HandCard {
  id: string;
  kind: "image" | "question";
  value: string;
}

function asItem(c: HandCard): DeckItemData {
  return c.kind === "image"
    ? { kind: "image", value: c.value }
    : { kind: "question", value: c.value };
}

export default function Hand({
  hand,
  selected,
  setSelected,
  onConfirm,
  busy,
  hint,
  buttonLabel,
  onZoom,
}: {
  hand: HandCard[];
  selected: string | null;
  setSelected: (id: string) => void;
  onConfirm: () => void;
  busy: boolean;
  hint: string;
  buttonLabel: string;
  onZoom: (item: DeckItemData) => void;
}) {
  return (
    <section>
      {hint && (
        <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">{hint}</p>
      )}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {hand.map((c) => (
          <CardButton
            key={c.id}
            item={asItem(c)}
            selected={selected === c.id}
            onClick={() => setSelected(c.id)}
            onZoom={onZoom}
          />
        ))}
      </div>
      <button
        onClick={onConfirm}
        disabled={!selected || busy}
        className="btn-gold mt-5 w-full py-3.5 text-sm"
      >
        {buttonLabel}
      </button>
    </section>
  );
}
