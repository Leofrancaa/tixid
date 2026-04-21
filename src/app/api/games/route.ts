import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { generatePlayerToken, generateRoomCode } from "@/lib/codes";
import { setPlayerTokenCookie } from "@/lib/auth/playerToken";

const Body = z.object({ nickname: z.string().min(1).max(20) });

export async function POST(req: Request) {
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  let code = "";
  for (let i = 0; i < 5; i++) {
    code = generateRoomCode(6);
    const existing = await db.select().from(games).where(eq(games.code, code));
    if (existing.length === 0) break;
    code = "";
  }
  if (!code) return NextResponse.json({ error: "code collision" }, { status: 500 });

  const [game] = await db.insert(games).values({ code }).returning();

  const token = generatePlayerToken();
  const [player] = await db
    .insert(gamePlayers)
    .values({ gameId: game.id, nickname: body.data.nickname, playerToken: token, seatOrder: 0 })
    .returning();

  await db.update(games).set({ hostPlayerId: player.id }).where(eq(games.id, game.id));

  await setPlayerTokenCookie(code, token);
  return NextResponse.json({ code, playerId: player.id });
}
