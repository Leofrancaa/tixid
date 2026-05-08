import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers, rounds } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

// Retorna o estado do round atual para sincronização de testes e clientes
export async function GET(
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

  if (!game.currentRoundId)
    return NextResponse.json({ round: null });

  const [round] = await db.select().from(rounds).where(eq(rounds.id, game.currentRoundId));
  if (!round) return NextResponse.json({ round: null });

  return NextResponse.json({
    round: {
      id: round.id,
      phase: round.phase,
      roundNumber: round.roundNumber,
      storytellerId: round.storytellerId,
      clue: round.clue,
    },
    gameStatus: game.status,
    myPlayerId: me.id,
  });
}
