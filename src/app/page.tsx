import Link from "next/link";
import HomeForms from "@/components/HomeForms";

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col items-center px-6 py-16">
      <h1 className="mb-2 text-5xl tracking-wide text-dixit-gold">Tixid</h1>
      <p className="mb-12 opacity-80">Dixit multiplayer online · até 6 jogadores</p>
      <HomeForms />
      <footer className="mt-24 text-sm opacity-50">
        <Link href="/admin">admin</Link>
      </footer>
    </main>
  );
}
