"use client";
import type { DeckItemData } from "./shared/DeckItem";

export default function CardZoom({ item, onClose }: { item: DeckItemData; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {item.kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.value}
          alt=""
          className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
          style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.15)" }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex max-h-[80vh] w-full max-w-md items-center justify-center rounded-xl px-8 py-10"
          style={{
            background: "linear-gradient(155deg, #efe3c2 0%, #e8d8a9 50%, #d9c388 100%)",
            color: "#2a1f10",
            boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.3)",
          }}
        >
          <p
            className="text-center"
            style={{
              fontFamily: "var(--font-lora), Georgia, serif",
              fontStyle: "italic",
              fontWeight: 500,
              fontSize: "clamp(20px, 4vw, 32px)",
              lineHeight: 1.35,
              textShadow: "0 1px 0 rgba(255,255,255,0.4)",
            }}
          >
            {item.value}
          </p>
        </div>
      )}
      <button
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-label text-sm text-white/70 transition hover:bg-white/20"
      >
        ✕
      </button>
    </div>
  );
}
