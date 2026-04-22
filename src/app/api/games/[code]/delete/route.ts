import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

export async function DELETE(
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
    return NextResponse.json({ error: "só o host pode encerrar" }, { status: 403 });

  // After migration 0009, all FKs pointing to game_players cascade on delete,
  // and game_players.game_id already cascades. Deleting the game removes
  // everything (players, rounds, submissions, votes) in one statement.
  try {
    await db.delete(games).where(eq(games.id, game.id));
  } catch (e) {
    console.error("[delete route] failed:", e);
    return NextResponse.json(
      { error: "falha ao encerrar sala", detail: String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
