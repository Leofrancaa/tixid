import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const body = await req.json().catch(() => ({}));
  const mode = body?.mode as string | undefined;
  if (mode !== "classic" && mode !== "questions") {
    return NextResponse.json({ error: "modo inválido" }, { status: 400 });
  }

  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) return NextResponse.json({ error: "sala não encontrada" }, { status: 404 });
  if (game.status !== "lobby")
    return NextResponse.json({ error: "só pode trocar no lobby" }, { status: 400 });

  const token = await readPlayerToken(code);
  if (!token) return NextResponse.json({ error: "sem token" }, { status: 401 });
  const [me] = await db.select().from(gamePlayers).where(eq(gamePlayers.playerToken, token));
  if (!me || me.gameId !== game.id)
    return NextResponse.json({ error: "não é jogador" }, { status: 403 });
  if (game.hostPlayerId !== me.id)
    return NextResponse.json({ error: "só o host pode trocar o modo" }, { status: 403 });

  await db.update(games).set({ mode }).where(eq(games.id, game.id));
  return NextResponse.json({ ok: true, mode });
}
