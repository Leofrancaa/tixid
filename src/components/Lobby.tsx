"use client";
import { useState } from "react";
import Link from "next/link";
import type { PublicPlayer } from "@/hooks/useGameRealtime";
import ConfirmDialog from "./ui/ConfirmDialog";

export default function Lobby({
  code,
  players,
  isHost,
  onStarted,
}: {
  code: string;
  players: PublicPlayer[];
  isHost: boolean;
  onStarted?: () => void;
}) {
  const [starting, setStarting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [closing, setClosing] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback for browsers without clipboard API
      const ta = document.createElement("textarea");
      ta.value = code;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand("copy"); } catch {}
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    }
  }

  async function closeRoom() {
    setClosing(true);
    const res = await fetch(`/api/games/${code}/delete`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Falha ao encerrar sala. Tente novamente.");
      setClosing(false);
      setConfirmOpen(false);
      return;
    }
    window.location.href = "/";
  }

  async function start() {
    setStarting(true);
    setErr(null);
    try {
      const res = await fetch(`/api/games/${code}/start`, { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error ?? "Erro ao iniciar. Tente novamente.");
      } else {
        // Trigger immediate refresh so transition doesn't depend only on realtime
        onStarted?.();
      }
    } catch {
      setErr("Erro de conexão. Tente novamente.");
    } finally {
      setStarting(false);
    }
  }

  const canStart = players.length >= 3;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      {/* Error toast — fixed top so it's always visible */}
      {err && (
        <div className="fixed left-0 right-0 top-4 z-50 mx-auto flex max-w-sm items-start gap-3 rounded-xl border border-red-500/30 bg-red-950/95 px-4 py-3 shadow-2xl backdrop-blur">
          <span className="mt-0.5 text-base">⚠️</span>
          <p className="font-serif text-sm text-red-200">{err}</p>
          <button onClick={() => setErr(null)} className="ml-auto shrink-0 text-red-400/60 hover:text-red-300">✕</button>
        </div>
      )}
      <div className="w-full max-w-md animate-fade-up">

        {/* Room code */}
        <div className="panel mb-6 p-6 text-center">
          <p className="mb-1 font-label text-xs uppercase tracking-[0.25em] text-parchment/35">
            Código da sala
          </p>
          <button
            onClick={copyCode}
            aria-label="Copiar código da sala"
            className="group relative my-2 inline-flex items-center gap-3 rounded-lg px-3 py-1 transition hover:bg-dixit-gold/5"
          >
            <span
              className="font-display text-5xl font-semibold tracking-[0.3em] text-dixit-gold"
              style={{ textShadow: "0 0 30px rgba(201,168,76,0.25)" }}
            >
              {code}
            </span>
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded border transition ${
                copied
                  ? "border-emerald-400/50 bg-emerald-400/10 text-emerald-300"
                  : "border-dixit-gold/30 text-dixit-gold/60 group-hover:border-dixit-gold/60 group-hover:text-dixit-gold"
              }`}
              title={copied ? "Copiado" : "Copiar"}
            >
              {copied ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
              )}
            </span>
          </button>
          <p className="font-label text-xs tracking-wider text-parchment/30">
            {copied ? "Código copiado!" : "Toque no código para copiar"}
          </p>
        </div>

        {/* Players */}
        <div className="panel mb-4 overflow-hidden">
          <div className="border-b border-dixit-gold/10 px-5 py-3">
            <p className="font-label text-xs uppercase tracking-widest text-parchment/40">
              Jogadores na mesa — {players.length}/12
            </p>
          </div>
          <ul className="divide-y divide-white/5">
            {players.length === 0 ? (
              <li className="px-5 py-4 font-serif text-sm italic text-parchment/30">
                Aguardando jogadores...
              </li>
            ) : (
              players.map((p, i) => (
                <li
                  key={p.id}
                  className="flex items-center gap-4 px-5 py-3.5 transition-colors"
                  style={{ animationDelay: `${i * 0.06}s` }}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-dixit-gold/15 font-label text-xs font-semibold text-dixit-gold">
                    {i + 1}
                  </span>
                  <span className="flex-1 font-serif text-sm text-parchment/90">
                    {p.nickname}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span
                      className={`h-1.5 w-1.5 rounded-full ${
                        p.connected ? "bg-emerald-400" : "bg-parchment/20"
                      }`}
                    />
                    <span className="font-label text-xs text-parchment/25">
                      {p.connected ? "online" : "off"}
                    </span>
                  </span>
                </li>
              ))
            )}
          </ul>
        </div>

        {/* Actions */}
        {isHost ? (
          <div className="space-y-2.5">
            <button
              onClick={start}
              disabled={starting || !canStart}
              className="btn-gold w-full py-3.5 text-sm"
            >
              {!canStart
                ? `Aguardando mín. 3 jogadores (${players.length}/3)`
                : starting
                ? "Iniciando partida..."
                : "Iniciar Partida"}
            </button>
            <button onClick={() => setConfirmOpen(true)} className="btn-ghost w-full text-xs">
              Encerrar sala
            </button>
          </div>
        ) : (
          <div className="panel p-4 text-center">
            <p className="font-serif text-sm italic text-parchment/50">
              Aguardando o host iniciar a partida...
            </p>
          </div>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/regras"
            className="font-label text-xs uppercase tracking-widest text-parchment/25 transition hover:text-parchment/55"
          >
            Como jogar
          </Link>
        </div>

      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Encerrar sala?"
        message="A sala será apagada e todos os jogadores serão desconectados."
        confirmLabel="Encerrar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={closing}
        onConfirm={closeRoom}
        onCancel={() => setConfirmOpen(false)}
      />
    </main>
  );
}
