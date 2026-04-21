"use client";
import { useState, useTransition } from "react";
import type { Card } from "@/lib/db/schema";

export default function CardManager({ initialCards }: { initialCards: Card[] }) {
  const [cards, setCards] = useState(initialCards);
  const [url, setUrl] = useState("");
  const [bulk, setBulk] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function addOne() {
    if (!url.trim()) return;
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls: [toDirectUrl(url.trim())] }),
    });
    if (!res.ok) {
      setMsg(`Erro: ${res.status}`);
      return;
    }
    const { cards: created } = await res.json();
    setCards((c) => [...created, ...c]);
    setUrl("");
    setMsg(`+${created.length} carta(s)`);
  }

  function toDirectUrl(raw: string): string {
    const m = raw.match(/\/file\/d\/([^/?#]+)/);
    if (m) return `https://lh3.googleusercontent.com/d/${m[1]}`;
    return raw;
  }

  async function addBulk() {
    const urls = bulk
      .split(/[\n,]+/)
      .map((s) => toDirectUrl(s.trim()))
      .filter(Boolean);
    if (!urls.length) return;
    const res = await fetch("/api/admin/cards", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ urls }),
    });
    if (!res.ok) {
      setMsg(`Erro: ${res.status}`);
      return;
    }
    const { cards: created } = await res.json();
    setCards((c) => [...created, ...c]);
    setBulk("");
    setMsg(`+${created.length} carta(s)`);
  }

  async function remove(id: string) {
    const res = await fetch(`/api/admin/cards?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      setMsg(`Erro: ${res.status}`);
      return;
    }
    setCards((c) => c.filter((x) => x.id !== id));
  }

  return (
    <div className="space-y-8">
      <section className="rounded border border-parchment/20 p-4">
        <h2 className="mb-3 text-xl">Adicionar uma</h2>
        <div className="flex gap-2">
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className="flex-1 rounded border border-parchment/30 bg-ink/60 px-3 py-2"
          />
          <button
            onClick={() => start(addOne)}
            disabled={pending}
            className="rounded bg-dixit-gold px-4 py-2 text-ink disabled:opacity-50"
          >
            Adicionar
          </button>
        </div>
      </section>

      <section className="rounded border border-parchment/20 p-4">
        <h2 className="mb-3 text-xl">Adicionar em lote (uma URL por linha)</h2>
        <textarea
          value={bulk}
          onChange={(e) => setBulk(e.target.value)}
          rows={6}
          className="w-full rounded border border-parchment/30 bg-ink/60 px-3 py-2 font-mono text-sm"
        />
        <button
          onClick={() => start(addBulk)}
          disabled={pending}
          className="mt-2 rounded bg-dixit-gold px-4 py-2 text-ink disabled:opacity-50"
        >
          Adicionar lote
        </button>
      </section>

      {msg && <p className="text-sm opacity-80">{msg}</p>}

      <section>
        <h2 className="mb-3 text-xl">Cartas ({cards.length})</h2>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-5">
          {cards.map((c) => (
            <div
              key={c.id}
              className="group relative overflow-hidden rounded border border-parchment/20"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={c.imageUrl}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              <button
                onClick={() => remove(c.id)}
                className="absolute right-1 top-1 rounded bg-red-600/90 px-2 py-1 text-xs text-white opacity-0 transition group-hover:opacity-100"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
