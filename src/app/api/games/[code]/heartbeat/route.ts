import { NextResponse } from "next/server";
import { eq, lt, and } from "drizzle-orm";
import { db } from "@/lib/db/client";
import { games, gamePlayers } from "@/lib/db/schema";
import { readPlayerToken } from "@/lib/auth/playerToken";

const OFFLINE_AFTER_MS = 90_000;   // mark offline after 90 s without heartbeat
const DELETE_AFTER_MS  = 180_000;  // delete game after 3 min with all offline

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code: rawCode } = await params;
  const code = rawCode.toUpperCase();

  const token = await readPlayerToken(code);
  if (!token) return NextResponse.json({ ok: false }, { status: 401 });

  const [game] = await db.select().from(games).where(eq(games.code, code));
  if (!game) return NextResponse.json({ deleted: true });

  const now = new Date();
  const offlineCutoff = new Date(now.getTime() - OFFLINE_AFTER_MS);
  const deleteCutoff  = new Date(now.getTime() - DELETE_AFTER_MS);

  // Mark the calling player as connected + update lastSeenAt
  await db
    .update(gamePlayers)
    .set({ connected: true, lastSeenAt: now })
    .where(and(eq(gamePlayers.gameId, game.id), eq(gamePlayers.playerToken, token)));

  // Mark stale players offline
  await db
    .update(gamePlayers)
    .set({ connected: false })
    .where(
      and(
        eq(gamePlayers.gameId, game.id),
        lt(gamePlayers.lastSeenAt, offlineCutoff)
      )
    );

  // Check if everyone has been offline long enough to warrant deletion
  const allPlayers = await db
    .select({ connected: gamePlayers.connected, lastSeenAt: gamePlayers.lastSeenAt })
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, game.id));

  if (allPlayers.length > 0) {
    const allGone = allPlayers.every(
      (p) => !p.connected && p.lastSeenAt < deleteCutoff
    );
    if (allGone) {
      await db.delete(games).where(eq(games.id, game.id));
      return NextResponse.json({ deleted: true });
    }
  }

  return NextResponse.json({ ok: true });
}
