"use client";
import { useState } from "react";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import type { PublicPlayer } from "@/hooks/useGameRealtime";

export default function EndScreen({
  players,
  code,
  isHost,
  onError,
}: {
  players: PublicPlayer[];
  code: string;
  isHost: boolean;
  onError: (msg: string) => void;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  const [action, setAction] = useState<null | "delete" | "leave">(null);
  const [busy, setBusy] = useState(false);
  const [rematchBusy, setRematchBusy] = useState(false);

  async function doDelete() {
    setBusy(true);
    const res = await fetch(`/api/games/${code}/delete`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Falha ao encerrar sala. Tente novamente.");
      setBusy(false);
      setAction(null);
      return;
    }
    window.location.href = "/";
  }

  async function doLeave() {
    setBusy(true);
    const res = await fetch(`/api/games/${code}/leave`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Falha ao sair da partida. Tente novamente.");
      setBusy(false);
      setAction(null);
      return;
    }
    window.location.href = "/";
  }

  async function doPlayAgain() {
    setRematchBusy(true);
    const res = await fetch(`/api/games/${code}/rematch`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      onError(data.error ?? "Falha ao reiniciar a partida. Tente novamente.");
      setRematchBusy(false);
      return;
    }
    // Game reset to lobby with the same players — reload to land back there.
    window.location.reload();
  }

  return (
    <>
      <section className="animate-fade-up text-center">
        <div
          className="mx-auto mb-2 inline-block font-display text-5xl text-dixit-gold sm:text-6xl"
          style={{ textShadow: "0 0 40px rgba(201,168,76,0.4)" }}
        >
          🏆
        </div>
        <h2 className="mb-1 font-display text-2xl font-semibold tracking-widest text-dixit-gold sm:text-3xl">
          {winner?.nickname} venceu!
        </h2>
        <p className="mb-8 font-serif italic text-parchment/40">A partida chegou ao fim</p>

        <ul className="mx-auto mb-8 max-w-sm space-y-2">
          {sorted.map((p, i) => (
            <li
              key={p.id}
              className={`flex items-center justify-between rounded-lg px-4 py-3 ${
                i === 0 ? "border border-dixit-gold/30 bg-dixit-gold/8" : "panel"
              }`}
            >
              <span className="flex items-center gap-3">
                <span className="font-label text-sm text-parchment/30">{i + 1}.</span>
                <span className="font-serif text-parchment/85">{p.nickname}</span>
              </span>
              <b className={`font-display text-lg ${i === 0 ? "text-dixit-gold" : "text-parchment/60"}`}>
                {p.score}
              </b>
            </li>
          ))}
        </ul>

        <div className="mx-auto flex max-w-sm flex-col gap-3">
          {isHost && (
            <button
              onClick={doPlayAgain}
              disabled={rematchBusy}
              className="btn-gold px-8 py-3.5 text-sm"
            >
              {rematchBusy ? "Reiniciando…" : "🔄 Jogar de Novo — mesmas pessoas"}
            </button>
          )}

          <a href="/" className="btn-ghost px-8 py-3 text-center text-sm">
            ↩️ Voltar ao Início
          </a>

          {isHost ? (
            <button onClick={() => setAction("delete")} className="btn-wine px-8 py-3 text-sm">
              Encerrar e Apagar Partida
            </button>
          ) : (
            <button onClick={() => setAction("leave")} className="btn-wine px-8 py-3 text-sm">
              🚪 Sair da Partida
            </button>
          )}
        </div>
      </section>

      <ConfirmDialog
        open={action === "delete"}
        title="Encerrar partida?"
        message="A partida será apagada permanentemente e todos os jogadores serão desconectados."
        confirmLabel="Encerrar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={busy}
        onConfirm={doDelete}
        onCancel={() => setAction(null)}
      />

      <ConfirmDialog
        open={action === "leave"}
        title="Sair da partida?"
        message="Você sairá desta sala. Se o host jogar de novo, você não entrará automaticamente."
        confirmLabel="Sair"
        cancelLabel="Cancelar"
        variant="danger"
        busy={busy}
        onConfirm={doLeave}
        onCancel={() => setAction(null)}
      />
    </>
  );
}
