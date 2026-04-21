import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";
import GameClient from "@/components/GameClient";

export const dynamic = "force-dynamic";

export default async function GamePage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) redirect("/");

  const token = await readPlayerToken(code);
  if (!token) redirect(`/?code=${code}`);
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id) redirect(`/?code=${code}`);

  return (
    <GameClient
      code={code}
      gameId={game.id}
      myPlayerId={me.id}
      isHost={game.hostPlayerId === me.id}
    />
  );
}
