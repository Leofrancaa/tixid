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
    <div className="space-y-3">
      {/* Nickname field */}
      <div>
        <label className="mb-1.5 block font-label text-xs uppercase tracking-widest text-parchment/40">
          Seu apelido
        </label>
        <input
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && create()}
          placeholder="Como te chamam?"
          maxLength={20}
          className="field"
        />
      </div>

      {/* Create button */}
      <button onClick={create} disabled={pending} className="btn-gold w-full py-3.5 text-sm">
        {pending ? "Aguarde..." : "Criar Nova Sala"}
      </button>

      {/* Divider */}
      <div className="ornament py-1">ou entre em uma sala</div>

      {/* Join row */}
      <div className="flex gap-2">
        <input
          value={joinCode}
          onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === "Enter" && join()}
          placeholder="CÓDIGO"
          maxLength={6}
          className="field flex-none w-36 text-center font-label tracking-[0.3em] text-lg font-semibold"
        />
        <button
          onClick={join}
          disabled={pending}
          className="btn-wine flex-1 text-sm"
        >
          Entrar
        </button>
      </div>

      {/* Error */}
      {msg && (
        <p className="rounded border border-red-500/20 bg-red-500/10 px-3 py-2 font-serif text-sm text-red-300/80">
          {msg}
        </p>
      )}
    </div>
  );
}
