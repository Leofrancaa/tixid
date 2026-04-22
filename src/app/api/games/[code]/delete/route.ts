import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers, rounds } from "@/lib/db/schema";
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

  // FK-safe deletion order in a single transaction: rounds.storyteller_id,
  // round_submissions.player_id, and round_votes.voter_id all reference
  // game_players WITHOUT ON DELETE CASCADE. Delete rounds first (cascades
  // submissions + votes), then game_players, then the game. Clear
  // current_round_id first to drop the dangling pointer before rounds go.
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(games)
        .set({ currentRoundId: null })
        .where(eq(games.id, game.id));
      await tx.delete(rounds).where(eq(rounds.gameId, game.id));
      await tx.delete(gamePlayers).where(eq(gamePlayers.gameId, game.id));
      await tx.delete(games).where(eq(games.id, game.id));
    });
  } catch (e) {
    console.error("[delete route] failed:", e);
    return NextResponse.json(
      { error: "falha ao encerrar sala", detail: String(e) },
      { status: 500 }
    );
  }

  return NextResponse.json({ ok: true });
}
