"use client";
import { useEffect, useRef, useState } from "react";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import Lobby from "./Lobby";
import GameBoard from "./GameBoard";

interface MeData {
  player: {
    id: string;
    nickname: string;
    seatOrder: number;
    score: number;
    isHost: boolean;
  } | null;
  hand: { id: string; imageUrl: string }[];
  game: { id: string; status: string; currentRoundId: string | null };
}

export default function GameClient({
  code,
  gameId,
  myPlayerId,
  isHost,
}: {
  code: string;
  gameId: string;
  myPlayerId: string;
  isHost: boolean;
}) {
  const rt = useGameRealtime(gameId);
  const [me, setMe] = useState<MeData | null>(null);
  const gameEverLoaded = useRef(false);

  async function refreshMe() {
    const res = await fetch(`/api/games/${code}/me`, { cache: "no-store" });
    if (res.status === 404) { window.location.href = "/"; return; }
    if (res.ok) setMe(await res.json());
  }

  useEffect(() => {
    refreshMe();
    const iv = setInterval(refreshMe, 12000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat — keeps presence alive and triggers cleanup when everyone leaves
  useEffect(() => {
    async function beat() {
      const res = await fetch(`/api/games/${code}/heartbeat`, { method: "POST" }).catch(() => null);
      if (res?.ok) {
        const data = await res.json().catch(() => ({}));
        if (data?.deleted) window.location.href = "/";
      }
    }
    beat();
    const iv = setInterval(beat, 30_000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.round?.phase, rt.round?.id, rt.game?.status]);

  if (rt.game) {
    gameEverLoaded.current = true;
  }

  // Game was deleted (host ended it) — redirect everyone to home
  if (!rt.game && gameEverLoaded.current) {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center gap-4">
        <p className="font-serif italic text-parchment/60">A sala foi encerrada pelo host.</p>
        <a href="/" className="btn-gold px-8 py-3 text-sm">Voltar ao Início</a>
      </main>
    );
  }

  if (!rt.game) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif italic text-parchment/40">Carregando sala {code}...</p>
      </main>
    );
  }

  // Use realtime status when available; fall back to me.game.status so the
  // transition to GameBoard doesn't depend solely on realtime firing.
  const effectiveStatus =
    rt.game.status !== "lobby"
      ? rt.game.status
      : (me?.game.status ?? "lobby");

  if (effectiveStatus === "lobby") {
    return (
      <Lobby
        code={code}
        players={rt.players}
        isHost={isHost}
        onStarted={refreshMe}
      />
    );
  }

  return (
    <GameBoard
      code={code}
      myPlayerId={myPlayerId}
      isHost={isHost}
      players={rt.players}
      round={rt.round}
      submissions={rt.submissions}
      votes={rt.votes}
      hand={me?.hand ?? []}
      gameStatus={effectiveStatus}
      targetScore={rt.game.target_score ?? 30}
    />
  );
}
