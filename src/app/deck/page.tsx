import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cards } from "@/lib/db/schema";
import DeckGallery from "@/components/DeckGallery";

export const dynamic = "force-dynamic";
export const metadata = { title: "Deck — Vonix" };

export default async function DeckPage() {
  const rows = await db
    .select({ id: cards.id, imageUrl: cards.imageUrl })
    .from(cards)
    .orderBy(desc(cards.createdAt));

  return (
    <main className="mx-auto max-w-6xl px-5 py-10 sm:py-14">
      <div className="animate-fade-up mb-8 text-center">
        <Link
          href="/"
          className="mb-5 inline-block font-label text-xs uppercase tracking-widest text-parchment/30 transition hover:text-parchment/60"
        >
          ← Voltar
        </Link>
        <h1
          className="mb-2 text-dixit-gold"
          style={{
            fontFamily: "var(--font-vonix), var(--font-cinzel), serif",
            fontSize: "clamp(2.25rem, 7vw, 3.5rem)",
            letterSpacing: "0.12em",
            textShadow: "0 0 40px rgba(201,168,76,0.3)",
          }}
        >
          Deck
        </h1>
        <div className="ornament mx-auto mt-3 max-w-xs text-xs">
          {rows.length} {rows.length === 1 ? "carta" : "cartas"}
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="panel mx-auto max-w-md p-8 text-center font-serif italic text-parchment/45">
          Nenhuma carta no deck ainda.
        </p>
      ) : (
        <DeckGallery cards={rows} />
      )}
    </main>
  );
}
