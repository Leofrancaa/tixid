"use client";

export type DeckItemData = { kind: "image"; value: string } | { kind: "question"; value: string };

export default function DeckItem({
  item,
  className = "",
}: {
  item: DeckItemData;
  className?: string;
}) {
  if (item.kind === "image") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={item.value}
        alt=""
        className={`aspect-[3/4] w-full object-cover ${className}`}
        style={{ display: "block" }}
      />
    );
  }
  return (
    <div
      className={`flex aspect-[3/4] w-full items-center justify-center px-3 py-4 ${className}`}
      style={{
        display: "flex",
        background:
          "linear-gradient(155deg, #efe3c2 0%, #e8d8a9 50%, #d9c388 100%)",
        color: "#2a1f10",
      }}
    >
      <p
        className="text-center"
        style={{
          fontFamily: "var(--font-lora), Georgia, serif",
          fontStyle: "italic",
          fontWeight: 500,
          fontSize: "clamp(11px, 2.4vw, 16px)",
          lineHeight: 1.3,
          letterSpacing: "0.005em",
          textShadow: "0 1px 0 rgba(255,255,255,0.4)",
        }}
      >
        {item.value}
      </p>
    </div>
  );
}
