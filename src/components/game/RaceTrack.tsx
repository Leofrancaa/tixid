"use client";
import type { PublicPlayer } from "@/hooks/useGameRealtime";

const TOKEN_COLORS = ["#C9A84C", "#9B72CF", "#C8536D", "#4A9ECC", "#5BAD72", "#D4834A"];

export default function RaceTrack({
  players,
  myId,
  targetScore,
}: {
  players: PublicPlayer[];
  myId: string;
  targetScore: number;
}) {
  const tokensAt: Record<number, { player: PublicPlayer; colorIdx: number }[]> = {};
  players.forEach((p, i) => {
    const sq = Math.min(p.score, targetScore);
    if (!tokensAt[sq]) tokensAt[sq] = [];
    tokensAt[sq].push({ player: p, colorIdx: i });
  });

  const squares = Array.from({ length: targetScore }, (_, i) => i);
  const COLS = 10;
  const finishTokens = tokensAt[targetScore] ?? [];

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-dixit-gold/10 px-4 py-2.5 flex items-center justify-between">
        <span className="font-label text-xs uppercase tracking-widest text-parchment/30">
          Tabuleiro
        </span>
        <div className="flex items-center gap-3">
          {players.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full font-label text-[9px] font-bold text-ink"
                style={{ backgroundColor: TOKEN_COLORS[i % TOKEN_COLORS.length] }}
              >
                {p.nickname[0].toUpperCase()}
              </span>
              <span className={`font-label text-xs ${p.id === myId ? "text-dixit-gold font-semibold" : "text-parchment/40"}`}>
                {p.score}
              </span>
            </span>
          ))}
          <span className="font-label text-xs text-parchment/20">/{targetScore}</span>
        </div>
      </div>

      <div className="p-2 sm:p-3 space-y-0.5">
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
                  className="font-label leading-none select-none"
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
                    {tokens.map(({ player, colorIdx }) => (
                      <div
                        key={player.id}
                        title={player.nickname}
                        className="rounded-full transition-all duration-700"
                        style={{
                          width: "clamp(5px, 1.3vw, 10px)",
                          height: "clamp(5px, 1.3vw, 10px)",
                          backgroundColor: TOKEN_COLORS[colorIdx % TOKEN_COLORS.length],
                          boxShadow:
                            player.id === myId
                              ? `0 0 4px ${TOKEN_COLORS[colorIdx % TOKEN_COLORS.length]}`
                              : "none",
                          opacity: player.id === myId ? 1 : 0.75,
                        }}
                      />
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
          <span style={{ fontSize: "clamp(18px, 3vw, 28px)", lineHeight: 1 }}>🏁</span>
          <span
            className="font-label uppercase tracking-widest"
            style={{ fontSize: "clamp(8px, 1.2vw, 11px)", color: "rgba(201,168,76,0.8)" }}
          >
            Linha de Chegada
          </span>
          {finishTokens.length > 0 && (
            <div className="flex gap-1 ml-1">
              {finishTokens.map(({ player, colorIdx }) => (
                <div
                  key={player.id}
                  title={player.nickname}
                  className="rounded-full"
                  style={{
                    width: "clamp(8px, 1.5vw, 12px)",
                    height: "clamp(8px, 1.5vw, 12px)",
                    backgroundColor: TOKEN_COLORS[colorIdx % TOKEN_COLORS.length],
                    boxShadow: player.id === myId ? `0 0 5px ${TOKEN_COLORS[colorIdx % TOKEN_COLORS.length]}` : "none",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
