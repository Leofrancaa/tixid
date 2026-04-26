import { NextResponse } from "next/server";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { cards, games, gamePlayers, questions } from "@/lib/db/schema";
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
  let hand: { id: string; kind: "image" | "question"; value: string }[] = [];
  if (handIds.length) {
    if (game.mode === "questions") {
      const rows = await db
        .select({ id: questions.id, text: questions.text })
        .from(questions)
        .where(inArray(questions.id, handIds));
      // Preserve hand order
      const byId = new Map(rows.map((r) => [r.id, r.text]));
      hand = handIds
        .map((id) => {
          const t = byId.get(id);
          return t ? { id, kind: "question" as const, value: t } : null;
        })
        .filter(Boolean) as typeof hand;
    } else {
      const rows = await db
        .select({ id: cards.id, imageUrl: cards.imageUrl })
        .from(cards)
        .where(inArray(cards.id, handIds));
      const byId = new Map(rows.map((r) => [r.id, r.imageUrl]));
      hand = handIds
        .map((id) => {
          const v = byId.get(id);
          return v ? { id, kind: "image" as const, value: v } : null;
        })
        .filter(Boolean) as typeof hand;
    }
  }

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
    hand,
    game: {
      id: game.id,
      status: game.status,
      mode: game.mode,
      currentRoundId: game.currentRoundId,
    },
  });
}
