import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers, rounds, roundVotes } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";
import { resolveRound, GameError } from "@/lib/game/engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  if (round.phase !== "voting") return NextResponse.json({ error: "fase inválida" }, { status: 400 });

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const token = await readPlayerToken(game.code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || game.hostPlayerId !== me.id)
    return NextResponse.json({ error: "só o host pode revelar" }, { status: 403 });

  try {
    await resolveRound(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GameError)
      return NextResponse.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
