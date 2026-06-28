import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";
import { leaveGame, GameError } from "@/lib/game/engine";

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();
  const [game] = await db.select().from(games).where(eq(games.code, code));
  // Room already gone — treat as a successful exit.
  if (!game) return NextResponse.json({ ok: true, gameDeleted: true });

  const token = await readPlayerToken(code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  // Not a player (already left) — nothing to do.
  if (!me || me.gameId !== game.id) return NextResponse.json({ ok: true });

  try {
    const result = await leaveGame(game.id, me.id);
    return NextResponse.json(result);
  } catch (e) {
    if (e instanceof GameError)
      return NextResponse.json({ error: e.message, code: e.code }, { status: 400 });
    console.error("[leave route] failed:", e);
    return NextResponse.json(
      { error: "falha ao sair da partida", detail: String(e) },
      { status: 500 }
    );
  }
}
