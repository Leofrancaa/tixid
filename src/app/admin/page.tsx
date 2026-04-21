import { redirect } from "next/navigation";
import { db } from "@/lib/db/client";
import { cards } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { requireAdmin } from "@/lib/auth/admin";
import CardManager from "@/components/admin/CardManager";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const auth = await requireAdmin();
  if (!auth.ok) redirect("/admin/login");

  const rows = await db.select().from(cards).orderBy(desc(cards.createdAt));

  return (
    <main className="mx-auto max-w-5xl px-6 py-10">
      <header className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl">Deck — cartas</h1>
        <span className="text-sm opacity-70">{auth.user.email}</span>
      </header>
      <CardManager initialCards={rows} />
    </main>
  );
}
