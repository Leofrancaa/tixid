"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useGameRealtime } from "@/hooks/useGameRealtime";
import Lobby from "./Lobby";
import GameBoard from "./game/GameBoard";
import { RoomSkeleton } from "./ui/Skeleton";

interface MeData {
  player: {
    id: string;
    nickname: string;
    seatOrder: number;
    score: number;
    isHost: boolean;
  } | null;
  hand: { id: string; kind: "image" | "question"; value: string }[];
  game: {
    id: string;
    status: string;
    mode: "classic" | "questions" | "stella";
    currentRoundId: string | null;
  };
  stellaSelectionIds?: string[];
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

  const refreshMe = useCallback(async (): Promise<MeData | null> => {
    const t0 = performance.now();
    try {
      const res = await fetch(`/api/games/${code}/me`, { cache: "no-store" });
      const dt = Math.round(performance.now() - t0);
      if (res.status === 404) {
        console.log("[gc.refreshMe] 404 → redirect", { ms: dt });
        window.location.href = "/";
        return null;
      }
      if (res.ok) {
        const data = (await res.json()) as MeData;
        console.log("[gc.refreshMe] ok", {
          ms: dt,
          status: data.game?.status,
          mode: data.game?.mode,
          handLen: data.hand?.length,
          currentRoundId: data.game?.currentRoundId,
        });
        setMe(data);
        return data;
      }
      console.warn("[gc.refreshMe] non-ok", { status: res.status, ms: dt });
      return null;
    } catch (e) {
      console.error("[gc.refreshMe] threw", e);
      return null;
    }
  }, [code]);

  const { refetch } = rt;

  const syncGameState = useCallback(async () => {
    console.log("[gc.syncGameState] start");
    const [meRes, rtRes] = await Promise.allSettled([refreshMe(), refetch()]);
    console.log("[gc.syncGameState] done", {
      me: meRes.status,
      rt: rtRes.status,
      meReason: meRes.status === "rejected" ? String(meRes.reason) : undefined,
      rtReason: rtRes.status === "rejected" ? String(rtRes.reason) : undefined,
    });
  }, [refreshMe, refetch]);

  // Fast poll: 3s in lobby (to catch game-start quickly), 8s once playing
  useEffect(() => {
    const interval = me?.game.status === "lobby" || !me ? 3000 : 8000;
    const iv = setInterval(refreshMe, interval);
    return () => clearInterval(iv);
  }, [refreshMe, me?.game.status]);

  // Immediate fetch on mount
  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

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

  const rtPhase = rt.round?.phase;
  const rtRoundId = rt.round?.id;
  const rtStatus = rt.game?.status;
  useEffect(() => {
    refreshMe();
  }, [rtPhase, rtRoundId, rtStatus, refreshMe]);

  // Fallback: if me says game is playing but realtime didn't deliver the round,
  // force a refetch so GameBoard doesn't stay stuck on "Carregando rodada...".
  const rtRound = rt.round;
  const meCurrentRoundId = me?.game.currentRoundId;
  const meStatus = me?.game.status;
  useEffect(() => {
    const playing = (rtStatus ?? meStatus ?? "lobby") !== "lobby";
    const needsRound = !rtRound && !!meCurrentRoundId;
    if (playing && needsRound) {
      refetch();
    }
  }, [rtStatus, meStatus, rtRound, meCurrentRoundId, refetch]);

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

  if (!rt.game) return <RoomSkeleton code={code} />;

  // Use realtime status when available; fall back to me.game.status so the
  // transition to GameBoard doesn't depend solely on realtime firing.
  const effectiveStatus =
    rt.game.status !== "lobby"
      ? rt.game.status
      : (me?.game.status ?? "lobby");
  const realtimeMode = rt.game.mode ?? "classic";
  const effectiveMode =
    effectiveStatus === "lobby"
      ? realtimeMode
      : (me?.game.mode ?? realtimeMode);

  if (effectiveStatus === "lobby") {
    return (
      <Lobby
        code={code}
        players={rt.players}
        isHost={isHost}
        mode={realtimeMode}
        onStarted={syncGameState}
        onModeChanged={syncGameState}
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
      stellaCards={rt.stellaCards}
      stellaPlayerRounds={rt.stellaPlayerRounds}
      stellaReveals={rt.stellaReveals}
      stellaSelectionIds={me?.stellaSelectionIds ?? []}
      hand={me?.hand ?? []}
      gameStatus={effectiveStatus}
      targetScore={rt.game.target_score ?? 30}
      mode={effectiveMode}
      onRefresh={syncGameState}
    />
  );
}
