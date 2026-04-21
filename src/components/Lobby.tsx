"use client";
import { useState } from "react";
import type { PublicPlayer } from "@/hooks/useGameRealtime";

export default function Lobby({
  code,
  players,
  isHost,
}: {
  code: string;
  players: PublicPlayer[];
  isHost: boolean;
}) {
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function start() {
    setStarting(true);
    setErr(null);
    const res = await fetch(`/api/games/${code}/start`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setStarting(false);
    if (!res.ok) setErr(data.error ?? "erro");
  }

  return (
    <main className="mx-auto max-w-2xl px-6 py-10">
      <header className="mb-8 text-center">
        <p className="text-sm opacity-60">Código da sala</p>
        <h1 className="text-5xl tracking-widest text-dixit-gold">{code}</h1>
        <p className="mt-2 text-sm opacity-60">
          Compartilhe este código com seus amigos
        </p>
      </header>

      <section className="mb-6">
        <h2 className="mb-3 text-xl">Jogadores ({players.length}/6)</h2>
        <ul className="space-y-2">
          {players.map((p) => (
            <li
              key={p.id}
              className="flex items-center justify-between rounded border border-parchment/20 px-4 py-3"
            >
              <span>{p.nickname}</span>
              <span className="text-xs opacity-60">
                {p.connected ? "online" : "off"}
              </span>
            </li>
          ))}
        </ul>
      </section>

      {isHost ? (
        <button
          onClick={start}
          disabled={starting || players.length < 3}
          className="w-full rounded bg-dixit-gold px-4 py-3 text-lg text-ink disabled:opacity-50"
        >
          {players.length < 3
            ? "Aguardando mín. 3 jogadores"
            : starting
            ? "Iniciando..."
            : "Iniciar jogo"}
        </button>
      ) : (
        <p className="text-center opacity-70">Aguardando o host iniciar...</p>
      )}
      {err && <p className="mt-4 text-center text-sm text-red-400">{err}</p>}
    </main>
  );
}
