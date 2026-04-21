import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers, rounds } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";
import { submitStorytellerClue, GameError } from "@/lib/game/engine";

const Body = z.object({ clue: z.string().min(1).max(100), cardId: z.string().uuid() });

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = Body.safeParse(await req.json().catch(() => null));
  if (!body.success)
    return NextResponse.json({ error: "invalid body" }, { status: 400 });

  const [round] = await db.select().from(rounds).where(eq(rounds.id, id));
  if (!round) return NextResponse.json({ error: "round not found" }, { status: 404 });
  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));

  const token = await readPlayerToken(game.code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id)
    return NextResponse.json({ error: "não é jogador" }, { status: 403 });

  try {
    await submitStorytellerClue(id, me.id, body.data.clue, body.data.cardId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    if (e instanceof GameError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    throw e;
  }
}
