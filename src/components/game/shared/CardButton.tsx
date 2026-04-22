"use client";

export default function CardButton({
  imageUrl,
  selected,
  onClick,
  onZoom,
  badge,
  disabled,
}: {
  imageUrl: string;
  selected?: boolean;
  onClick?: () => void;
  onZoom: (url: string) => void;
  badge?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className={`card-frame group ${selected ? "selected" : ""}`}>
      <button
        onClick={onClick}
        disabled={disabled && !onClick}
        className={`relative w-full transition-transform duration-200 ${
          selected ? "scale-[1.04]" : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        style={{ display: "block" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="aspect-[3/4] w-full object-cover"
          style={{ display: "block" }}
        />
        {badge}
      </button>
      <button
        onClick={(e) => { e.stopPropagation(); onZoom(imageUrl); }}
        className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-80 transition hover:bg-black/80 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
        title="Ampliar carta"
      >
        ⛶
      </button>
    </div>
  );
}
