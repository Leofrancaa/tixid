import Link from "next/link";
import { desc } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { questions } from "@/lib/db/schema";
import DeckTabs from "@/components/DeckTabs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Perguntas — Vonix" };

export default async function QuestionsDeckPage() {
  const rows = await db
    .select({ id: questions.id, text: questions.text })
    .from(questions)
    .orderBy(desc(questions.createdAt));

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:py-14">
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
          Perguntas
        </h1>
        <div className="ornament mx-auto mt-3 max-w-xs text-xs">
          {rows.length} {rows.length === 1 ? "pergunta" : "perguntas"}
        </div>
        <div className="mt-5">
          <DeckTabs />
        </div>
      </div>

      {rows.length === 0 ? (
        <p className="panel mx-auto max-w-md p-8 text-center font-serif italic text-parchment/45">
          Nenhuma pergunta no deck ainda.
        </p>
      ) : (
        <ol className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {rows.map((q, i) => (
            <li
              key={q.id}
              className="flex gap-3 rounded border border-dixit-gold/10 bg-dixit-gold/[0.03] px-3 py-2.5"
            >
              <span className="mt-0.5 font-label text-[10px] tabular-nums text-dixit-gold/45">
                {String(i + 1).padStart(3, "0")}
              </span>
              <span className="font-serif text-sm italic leading-snug text-parchment/80">
                {q.text}
              </span>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
