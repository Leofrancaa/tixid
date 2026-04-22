"use client";

export default function CardZoom({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-label text-sm text-white/70 transition hover:bg-white/20"
      >
        ✕
      </button>
    </div>
  );
}
