"use client";
import { useEffect, useState } from "react";
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

  async function refreshMe() {
    const res = await fetch(`/api/games/${code}/me`, { cache: "no-store" });
    if (res.ok) setMe(await res.json());
  }

  useEffect(() => {
    refreshMe();
    const iv = setInterval(refreshMe, 12000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // refresh hand when phase changes
  useEffect(() => {
    refreshMe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rt.round?.phase, rt.round?.id, rt.game?.status]);

  if (!rt.game) {
    return (
      <main className="p-10">Carregando sala {code}...</main>
    );
  }

  if (rt.game.status === "lobby") {
    return (
      <Lobby
        code={code}
        players={rt.players}
        isHost={isHost}
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
      gameStatus={rt.game.status}
    />
  );
}
