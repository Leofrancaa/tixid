import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers, rounds, roundSubmissions } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const token = await readPlayerToken(game.code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id)
    return NextResponse.json({ error: "não é jogador" }, { status: 403 });

  const subs = await db
    .select({ id: roundSubmissions.id, playerId: roundSubmissions.playerId, displayOrder: roundSubmissions.displayOrder })
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, id));

  return NextResponse.json({ submissions: subs, myPlayerId: me.id });
}
