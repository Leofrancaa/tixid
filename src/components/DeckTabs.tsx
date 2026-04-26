"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DeckTabs() {
  const path = usePathname();
  const isQuestions = path?.startsWith("/deck/perguntas");
  return (
    <div className="mx-auto mb-6 inline-flex gap-1 rounded-full border border-parchment/10 p-1">
      <Link
        href="/deck"
        className={`rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-widest transition ${
          !isQuestions
            ? "bg-dixit-gold/15 text-dixit-gold"
            : "text-parchment/40 hover:text-parchment/70"
        }`}
      >
        🃏 Cartas
      </Link>
      <Link
        href="/deck/perguntas"
        className={`rounded-full px-4 py-1.5 font-label text-xs uppercase tracking-widest transition ${
          isQuestions
            ? "bg-dixit-gold/15 text-dixit-gold"
            : "text-parchment/40 hover:text-parchment/70"
        }`}
      >
        ❓ Perguntas
      </Link>
    </div>
  );
}
