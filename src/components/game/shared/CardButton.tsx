"use client";
import DeckItem, { type DeckItemData } from "./DeckItem";

export default function CardButton({
  item,
  selected,
  onClick,
  onZoom,
  badge,
  disabled,
}: {
  item: DeckItemData;
  selected?: boolean;
  onClick?: () => void;
  onZoom: (item: DeckItemData) => void;
  badge?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={`card-frame group ${selected ? "selected" : ""}`}>
      <button
        onClick={onClick}
        disabled={disabled && !onClick}
        className={`relative block w-full transition-transform duration-200 ${
          selected ? "scale-[1.04]" : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
      >
        <DeckItem item={item} />
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
