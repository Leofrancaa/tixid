import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";
import { startGame, GameError } from "@/lib/game/engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) return NextResponse.json({ error: "sala não encontrada" }, { status: 404 });

  const token = await readPlayerToken(code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id)
    return NextResponse.json({ error: "não é jogador" }, { status: 403 });
  if (game.hostPlayerId !== me.id)
    return NextResponse.json({ error: "só o host pode iniciar" }, { status: 403 });

  try {
    const round = await startGame(game.id);
    return NextResponse.json({ roundId: round.id });
  } catch (e) {
    if (e instanceof GameError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    throw e;
  }
}
