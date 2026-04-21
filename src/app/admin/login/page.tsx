"use client";
import { useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function AdminLoginPage() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setMsg(null);
    const supabase = createSupabaseBrowserClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo:
          typeof window !== "undefined"
            ? `${window.location.origin}/admin`
            : undefined,
      },
    });
    if (error) setMsg(error.message);
    else setMsg("Magic link enviado! Confira seu email.");
    setLoading(false);
  }

  return (
    <main className="mx-auto mt-20 max-w-md px-6">
      <h1 className="mb-6 text-3xl">Admin — login</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="seu@email.com"
          className="w-full rounded border border-parchment/30 bg-ink/60 px-4 py-2 text-parchment"
          required
        />
        <button
          disabled={loading}
          className="w-full rounded bg-dixit-gold px-4 py-2 text-ink disabled:opacity-50"
        >
          {loading ? "Enviando..." : "Enviar magic link"}
        </button>
      </form>
      {msg && <p className="mt-4 text-sm opacity-80">{msg}</p>}
    </main>
  );
}
