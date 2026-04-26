"use client";
import { useState } from "react";
import type { PublicPlayer } from "@/hooks/useGameRealtime";

const TOKEN_COLORS = [
  "#C9A84C",
  "#4A90E2",
  "#E85D75",
  "#52B788",
  "#F28C28",
  "#9B72CF",
  "#2EC4B6",
  "#F94144",
  "#A3E635",
  "#577590",
  "#F15BB5",
  "#00BBF9",
];

function tokenColor(seatOrder: number) {
  return TOKEN_COLORS[seatOrder % TOKEN_COLORS.length];
}

function tokenLabel(seatOrder: number) {
  return String(seatOrder + 1);
}

export default function RaceTrack({
  players,
  myId,
  targetScore,
}: {
  players: PublicPlayer[];
  myId: string;
  targetScore: number;
}) {
  const [detailsOpen, setDetailsOpen] = useState(false);
  const myPlayer = players.find((p) => p.id === myId);
  const sortedPlayers = [...players].sort((a, b) => {
    const byScore = b.score - a.score;
    return byScore || a.seat_order - b.seat_order;
  });
  const tokensAt: Record<number, { player: PublicPlayer }[]> = {};
  players.forEach((p) => {
    const sq = Math.min(p.score, targetScore);
    if (!tokensAt[sq]) tokensAt[sq] = [];
    tokensAt[sq].push({ player: p });
  });

  const squares = Array.from({ length: targetScore }, (_, i) => i);
  const COLS = 10;
  const finishTokens = tokensAt[targetScore] ?? [];

  return (
    <>
      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-dixit-gold/10 px-4 py-2.5">
          <span className="font-label text-xs uppercase tracking-widest text-parchment/30">
            Tabuleiro
          </span>
          <div className="flex items-center gap-3">
            {myPlayer && (
              <button
                onClick={() => setDetailsOpen(true)}
                className="hidden items-center gap-1.5 rounded border border-dixit-gold/20 px-2 py-1 transition hover:border-dixit-gold/40 sm:flex"
              >
                <span className="font-label text-[10px] uppercase tracking-widest text-parchment/30">
                  Seu ícone
                </span>
                <span
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full font-label text-[9px] font-bold text-ink"
                  style={{ backgroundColor: tokenColor(myPlayer.seat_order) }}
                >
                  {tokenLabel(myPlayer.seat_order)}
                </span>
              </button>
            )}
            <div className="flex max-w-[65vw] flex-wrap items-center justify-end gap-2 sm:max-w-none">
              {players.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setDetailsOpen(true)}
                  className="flex items-center gap-1 rounded transition hover:bg-dixit-gold/5"
                  title={`${p.nickname}: ${p.score}`}
                >
                  <span
                    className="inline-flex h-4 w-4 items-center justify-center rounded-full font-label text-[9px] font-bold text-ink"
                    style={{ backgroundColor: tokenColor(p.seat_order) }}
                  >
                    {tokenLabel(p.seat_order)}
                  </span>
                  <span className={`font-label text-xs ${p.id === myId ? "font-semibold text-dixit-gold" : "text-parchment/40"}`}>
                    {p.score}
                  </span>
                </button>
              ))}
              <span className="font-label text-xs text-parchment/20">/{targetScore}</span>
            </div>
          </div>
        </div>

        <div className="space-y-0.5 p-2 sm:p-3">
          <div
            className="gap-0.5"
            style={{
              display: "grid",
              gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
            }}
          >
            {squares.map((sq) => {
              const tokens = tokensAt[sq] ?? [];
              return (
                <div
                  key={sq}
                  className="relative flex flex-col items-center justify-center rounded"
                  style={{
                    aspectRatio: "1",
                    background: sq === 0
                      ? "rgba(201,168,76,0.18)"
                      : "rgba(255,255,255,0.04)",
                    border: sq === 0
                      ? "1px solid rgba(201,168,76,0.45)"
                      : "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <span
                    className="select-none font-label leading-none"
                    style={{
                      fontSize: "clamp(7px, 1.1vw, 10px)",
                      color: sq === 0
                        ? "rgba(201,168,76,0.9)"
                        : "rgba(242,236,216,0.22)",
                      marginBottom: tokens.length ? 1 : 0,
                    }}
                  >
                    {sq}
                  </span>

                  {tokens.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-px">
                      {tokens.map(({ player }) => (
                        <button
                          key={player.id}
                          onClick={() => setDetailsOpen(true)}
                          title={player.nickname}
                          className="inline-flex items-center justify-center rounded-full font-label font-bold text-ink transition-all duration-700"
                          style={{
                            width: "clamp(10px, 1.6vw, 14px)",
                            height: "clamp(10px, 1.6vw, 14px)",
                            fontSize: "clamp(6px, 0.8vw, 8px)",
                            backgroundColor: tokenColor(player.seat_order),
                            boxShadow:
                              player.id === myId
                                ? `0 0 5px ${tokenColor(player.seat_order)}`
                                : "none",
                            opacity: player.id === myId ? 1 : 0.8,
                          }}
                        >
                          {tokenLabel(player.seat_order)}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <div
            className="flex items-center justify-center gap-2 rounded"
            style={{
              height: "clamp(32px, 5vw, 48px)",
              background: "rgba(201,168,76,0.18)",
              border: "1px solid rgba(201,168,76,0.45)",
            }}
          >
            <span className="font-label text-xs font-bold text-dixit-gold">FIM</span>
            <span
              className="font-label uppercase tracking-widest"
              style={{ fontSize: "clamp(8px, 1.2vw, 11px)", color: "rgba(201,168,76,0.8)" }}
            >
              Linha de Chegada
            </span>
            {finishTokens.length > 0 && (
              <div className="ml-1 flex gap-1">
                {finishTokens.map(({ player }) => (
                  <button
                    key={player.id}
                    onClick={() => setDetailsOpen(true)}
                    title={player.nickname}
                    className="inline-flex items-center justify-center rounded-full font-label text-[8px] font-bold text-ink"
                    style={{
                      width: "clamp(12px, 1.8vw, 16px)",
                      height: "clamp(12px, 1.8vw, 16px)",
                      backgroundColor: tokenColor(player.seat_order),
                      boxShadow:
                        player.id === myId ? `0 0 5px ${tokenColor(player.seat_order)}` : "none",
                    }}
                  >
                    {tokenLabel(player.seat_order)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {detailsOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-details-title"
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-5 backdrop-blur-sm animate-fade-up"
          onClick={() => setDetailsOpen(false)}
        >
          <div className="panel w-full max-w-sm p-5" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2
                id="score-details-title"
                className="font-display text-lg text-dixit-gold"
                style={{ letterSpacing: "0.06em" }}
              >
                Placar
              </h2>
              <button
                onClick={() => setDetailsOpen(false)}
                className="text-parchment/35 transition hover:text-parchment/70"
                aria-label="Fechar placar"
              >
                x
              </button>
            </div>
            <div className="divide-y divide-white/5">
              {sortedPlayers.map((player) => (
                <div key={player.id} className="flex items-center gap-3 py-3">
                  <span
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-label text-xs font-bold text-ink"
                    style={{ backgroundColor: tokenColor(player.seat_order) }}
                  >
                    {tokenLabel(player.seat_order)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-sm text-parchment/90">
                      {player.nickname}
                    </p>
                    <p className="font-label text-[10px] uppercase tracking-widest text-parchment/30">
                      Cor {tokenColor(player.seat_order)}
                    </p>
                  </div>
                  <span className="font-label text-sm font-semibold text-dixit-gold">
                    {player.score}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
