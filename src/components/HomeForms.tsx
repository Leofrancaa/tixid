"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HomeForms() {
  const router = useRouter();
  const [nickname, setNickname] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function create() {
    if (!nickname.trim()) return setMsg("Apelido obrigatório");
    setPending(true);
    setMsg(null);
    const res = await fetch("/api/games", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname: nickname.trim() }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) return setMsg(data.error ?? "Erro ao criar sala");
    router.push(`/game/${data.code}`);
  }

  async function join() {
    if (!nickname.trim() || !joinCode.trim())
      return setMsg("Apelido e código obrigatórios");
    setPending(true);
    setMsg(null);
    const code = joinCode.trim().toUpperCase();
    const res = await fetch(`/api/games/${code}/join`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ nickname: nickname.trim() }),
    });
    const data = await res.json();
    setPending(false);
    if (!res.ok) return setMsg(data.error ?? "Erro ao entrar");
    router.push(`/game/${code}`);
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <input
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
        placeholder="Seu apelido"
        maxLength={20}
        className="w-full rounded border border-parchment/30 bg-ink/60 px-4 py-3 text-lg"
      />

      <button
        onClick={create}
        disabled={pending}
        className="w-full rounded bg-dixit-gold px-4 py-3 text-lg text-ink disabled:opacity-50"
      >
        Criar nova sala
      </button>

      <div className="text-center text-sm opacity-60">ou</div>

      <div className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          placeholder="CÓDIGO"
          maxLength={6}
          className="flex-1 rounded border border-parchment/30 bg-ink/60 px-4 py-3 text-center text-lg tracking-widest"
        />
        <button
          onClick={join}
          disabled={pending}
          className="rounded bg-dixit-rose px-4 py-3 text-lg disabled:opacity-50"
        >
          Entrar
        </button>
      </div>

      {msg && <p className="text-sm text-red-400">{msg}</p>}
    </div>
  );
}
