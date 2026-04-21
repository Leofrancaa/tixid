import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cards, games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) return NextResponse.json({ error: "sala não encontrada" }, { status: 404 });

  const token = await readPlayerToken(code);
  if (!token) return NextResponse.json({ player: null }, { status: 200 });

  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id)
    return NextResponse.json({ player: null }, { status: 200 });

  const handIds = (me.hand as string[]) ?? [];
  const handCards = handIds.length
    ? await db.select().from(cards).where(inArray(cards.id, handIds))
    : [];

  await db
    .update(gamePlayers)
    .set({ connected: true, lastSeenAt: new Date() })
    .where(eq(gamePlayers.id, me.id));

  return NextResponse.json({
    player: {
      id: me.id,
      nickname: me.nickname,
      seatOrder: me.seatOrder,
      score: me.score,
      isHost: game.hostPlayerId === me.id,
    },
    hand: handCards,
    game: { id: game.id, status: game.status, currentRoundId: game.currentRoundId },
  });
}
