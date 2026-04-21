import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db/client";
import { cards } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";

const PostBody = z.object({
  urls: z.array(z.string().url()).min(1).max(200),
});

export async function POST(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }
  const parsed = PostBody.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });

  const inserted = await db
    .insert(cards)
    .values(
      parsed.data.urls.map((imageUrl) => ({ imageUrl, addedBy: auth.user.id }))
    )
    .returning();

  return NextResponse.json({ cards: inserted });
}

export async function DELETE(req: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });
  await db.delete(cards).where(eq(cards.id, id));
  return NextResponse.json({ ok: true });
}
