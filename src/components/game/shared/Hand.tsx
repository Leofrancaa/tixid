"use client";
import CardButton from "./CardButton";

export interface HandCard {
  id: string;
  imageUrl: string;
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
  onZoom: (url: string) => void;
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
            imageUrl={c.imageUrl}
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
