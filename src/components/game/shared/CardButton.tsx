"use client";
import DeckItem, { type DeckItemData } from "./DeckItem";

export default function CardButton({
  item,
  selected,
  onClick,
  onZoom,
  badge,
  disabled,
  dim = true,
}: {
  item: DeckItemData;
  selected?: boolean;
  onClick?: () => void;
  onZoom: (item: DeckItemData) => void;
  badge?: React.ReactNode;
  disabled?: boolean;
  // When false, a disabled card keeps full image brightness (no opacity dim).
  // Used in the vote grid so cards stay true-to-color while you watch/wait.
  dim?: boolean;
}) {
  return (
    <div className={`card-frame group ${selected ? "selected" : ""}`}>
      <button
        onClick={onClick}
        disabled={disabled && !onClick}
        className={`relative block w-full transition-transform duration-200 ${
          selected ? "scale-[1.04]" : ""
        } ${disabled ? `cursor-not-allowed${dim ? " opacity-50" : ""}` : "cursor-pointer"}`}
      >
        <DeckItem item={item} />
        {selected && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-dixit-gold/10" />
            <div className="pointer-events-none absolute right-1.5 top-1.5 z-20 flex h-7 w-7 items-center justify-center rounded-full bg-dixit-gold text-ink shadow-lg ring-2 ring-ink/40">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
          </>
        )}
        {badge}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onZoom(item); }}
        className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-80 transition hover:bg-black/80 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
        title="Ampliar carta"
      >
        ⛶
      </button>
    </div>
  );
}
