import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { generatePlayerToken } from "@/lib/codes";
import { setPlayerTokenCookie, readPlayerToken } from "@/lib/auth/playerToken";

const Body = z.object({ nickname: z.string().min(1).max(20) });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) return NextResponse.json({ error: "sala não encontrada" }, { status: 404 });

  const existing = await db.select().from(gamePlayers).where(eq(gamePlayers.gameId, game.id));

  const token = await readPlayerToken(code);
  if (token) {
    const match = existing.find((p) => p.playerToken === token);
    if (match) return NextResponse.json({ playerId: match.id, reconnected: true });
  }

  if (game.status !== "lobby")
    return NextResponse.json({ error: "jogo já iniciou" }, { status: 409 });
  if (existing.length >= game.maxPlayers)
    return NextResponse.json({ error: "sala cheia" }, { status: 409 });
  if (existing.some((p) => p.nickname === body.data.nickname))
    return NextResponse.json({ error: "apelido em uso" }, { status: 409 });

  const newToken = generatePlayerToken();
  const [player] = await db
    .insert(gamePlayers)
    .values({
      gameId: game.id,
      nickname: body.data.nickname,
      playerToken: newToken,
      seatOrder: existing.length,
    })
    .returning();

  await setPlayerTokenCookie(code, newToken);
  return NextResponse.json({ playerId: player.id });
}
