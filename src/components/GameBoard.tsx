"use client";
import { useEffect, useState } from "react";
import type {
  PublicPlayer,
  RoundRow,
  SubmissionRow,
  VoteRow,
} from "@/hooks/useGameRealtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

interface HandCard {
  id: string;
  imageUrl: string;
}

export default function GameBoard({
  code,
  myPlayerId,
  isHost,
  players,
  round,
  submissions,
  votes,
  hand,
  gameStatus,
}: {
  code: string;
  myPlayerId: string;
  isHost: boolean;
  players: PublicPlayer[];
  round: RoundRow | null;
  submissions: SubmissionRow[];
  votes: VoteRow[];
  hand: HandCard[];
  gameStatus: string;
}) {
  const [clue, setClue] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const ids = submissions.map((s) => s.card_id).filter(Boolean) as string[];
    if (!ids.length) return;
    const missing = ids.filter((id) => !imageMap[id]);
    if (!missing.length) return;
    const supabase = createSupabaseBrowserClient();
    supabase
      .from("cards")
      .select("id,image_url")
      .in("id", missing)
      .then(({ data }) => {
        if (!data) return;
        setImageMap((m) => {
          const nm = { ...m };
          for (const row of data as { id: string; image_url: string }[]) {
            nm[row.id] = row.image_url;
          }
          return nm;
        });
      });
  }, [submissions, imageMap]);

  if (!round) return <main className="p-10">Carregando rodada...</main>;

  const storyteller = players.find((p) => p.id === round.storyteller_id);
  const imStoryteller = round.storyteller_id === myPlayerId;
  const mySubmission = submissions.find((s) => s.player_id === myPlayerId);
  const iVoted = votes.some((v) => v.voter_id === myPlayerId);

  async function doClue() {
    if (!clue.trim() || !selectedCard) return setErr("Escreva dica e escolha carta");
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/rounds/${round!.id}/clue`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ clue: clue.trim(), cardId: selectedCard }),
    });
    setBusy(false);
    if (!res.ok) setErr((await res.json()).error ?? "erro");
    else { setClue(""); setSelectedCard(null); }
  }

  async function doSubmit() {
    if (!selectedCard) return setErr("Escolha uma carta");
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/rounds/${round!.id}/submit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cardId: selectedCard }),
    });
    setBusy(false);
    if (!res.ok) setErr((await res.json()).error ?? "erro");
    else setSelectedCard(null);
  }

  async function doVote(submissionId: string) {
    setBusy(true);
    setErr(null);
    const res = await fetch(`/api/rounds/${round!.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionId }),
    });
    setBusy(false);
    if (!res.ok) setErr((await res.json()).error ?? "erro");
  }

  async function doNext() {
    setBusy(true);
    await fetch(`/api/games/${code}/next`, { method: "POST" });
    setBusy(false);
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <p className="text-xs opacity-60">Sala {code} · Rodada {round.round_number}</p>
          <p className="text-sm">
            Storyteller:{" "}
            <span className="text-dixit-gold">{storyteller?.nickname}</span>
            {round.clue && (
              <>
                {" · dica: "}
                <span className="italic text-dixit-rose">"{round.clue}"</span>
              </>
            )}
          </p>
        </div>
        <Scoreboard players={players} myId={myPlayerId} />
      </header>

      {gameStatus === "finished" ? (
        <EndScreen players={players} />
      ) : round.phase === "clue" && imStoryteller ? (
        <ClueInput
          clue={clue}
          setClue={setClue}
          hand={hand}
          selected={selectedCard}
          setSelected={setSelectedCard}
          onSubmit={doClue}
          busy={busy}
        />
      ) : round.phase === "clue" ? (
        <Waiting text={`${storyteller?.nickname} está escolhendo a dica...`} />
      ) : round.phase === "submitting" && !imStoryteller && !mySubmission ? (
        <Hand
          hand={hand}
          selected={selectedCard}
          setSelected={setSelectedCard}
          onConfirm={doSubmit}
          busy={busy}
          hint={`Dica: "${round.clue}" — escolha a melhor carta da sua mão`}
          buttonLabel="Enviar carta"
        />
      ) : round.phase === "submitting" ? (
        <Waiting
          text={`Aguardando submissões (${submissions.length - 1}/${players.length - 1})`}
        />
      ) : round.phase === "voting" ? (
        <VoteBoard
          submissions={submissions}
          imageMap={imageMap}
          mySubmission={mySubmission}
          onVote={doVote}
          iVoted={iVoted}
          imStoryteller={imStoryteller}
          busy={busy}
          clue={round.clue ?? ""}
        />
      ) : round.phase === "reveal" ? (
        <Reveal
          submissions={submissions}
          votes={votes}
          players={players}
          storytellerCardId={round.storyteller_card_id}
          imageMap={imageMap}
          isHost={isHost}
          onNext={doNext}
          busy={busy}
        />
      ) : null}

      {err && (
        <p className="fixed bottom-4 right-4 rounded bg-red-600/90 px-4 py-2">{err}</p>
      )}
    </main>
  );
}

function Scoreboard({ players, myId }: { players: PublicPlayer[]; myId: string }) {
  return (
    <ul className="flex gap-3 text-sm">
      {players.map((p) => (
        <li
          key={p.id}
          className={`rounded px-2 py-1 ${
            p.id === myId ? "bg-dixit-purple/50" : "bg-parchment/10"
          }`}
        >
          {p.nickname}: <b>{p.score}</b>
        </li>
      ))}
    </ul>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="rounded border border-parchment/20 p-10 text-center opacity-80">
      {text}
    </div>
  );
}

function Hand({
  hand,
  selected,
  setSelected,
  onConfirm,
  busy,
  hint,
  buttonLabel,
}: {
  hand: HandCard[];
  selected: string | null;
  setSelected: (id: string) => void;
  onConfirm: () => void;
  busy: boolean;
  hint: string;
  buttonLabel: string;
}) {
  return (
    <section>
      {hint && <p className="mb-3 text-center opacity-80">{hint}</p>}
      <div className="grid grid-cols-3 gap-3 md:grid-cols-6">
        {hand.map((c) => (
          <button
            key={c.id}
            onClick={() => setSelected(c.id)}
            className={`overflow-hidden rounded border-2 transition ${
              selected === c.id
                ? "scale-105 border-dixit-gold"
                : "border-transparent opacity-90 hover:opacity-100"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.imageUrl} alt="" className="aspect-[3/4] w-full object-cover" />
          </button>
        ))}
      </div>
      <button
        onClick={onConfirm}
        disabled={!selected || busy}
        className="mt-4 w-full rounded bg-dixit-gold py-3 text-ink disabled:opacity-50"
      >
        {buttonLabel}
      </button>
    </section>
  );
}

function ClueInput(props: {
  clue: string;
  setClue: (s: string) => void;
  hand: HandCard[];
  selected: string | null;
  setSelected: (id: string) => void;
  onSubmit: () => void;
  busy: boolean;
}) {
  return (
    <section>
      <p className="mb-3 text-center opacity-80">
        Você é o storyteller. Escolha uma carta e dê uma dica.
      </p>
      <input
        value={props.clue}
        onChange={(e) => props.setClue(e.target.value)}
        placeholder="Sua dica (frase, palavra, etc.)"
        maxLength={100}
        className="mb-4 w-full rounded border border-parchment/30 bg-ink/60 px-4 py-3"
      />
      <Hand
        hand={props.hand}
        selected={props.selected}
        setSelected={props.setSelected}
        onConfirm={props.onSubmit}
        busy={props.busy}
        hint=""
        buttonLabel="Enviar dica + carta"
      />
    </section>
  );
}

function VoteBoard({
  submissions,
  imageMap,
  mySubmission,
  onVote,
  iVoted,
  imStoryteller,
  busy,
  clue,
}: {
  submissions: SubmissionRow[];
  imageMap: Record<string, string>;
  mySubmission: SubmissionRow | undefined;
  onVote: (id: string) => void;
  iVoted: boolean;
  imStoryteller: boolean;
  busy: boolean;
  clue: string;
}) {
  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  return (
    <section>
      <p className="mb-3 text-center opacity-80">
        Dica: <span className="italic text-dixit-rose">"{clue}"</span>
        {imStoryteller
          ? " — aguarde os votos."
          : iVoted
          ? " — voto registrado, aguarde os demais."
          : " — vote na carta que você acha ser a do storyteller."}
      </p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const disabled = imStoryteller || iVoted || busy || s.id === mySubmission?.id;
          return (
            <button
              key={s.id}
              onClick={() => onVote(s.id)}
              disabled={disabled}
              className={`overflow-hidden rounded border-2 transition ${
                disabled
                  ? "cursor-not-allowed border-transparent opacity-60"
                  : "border-transparent hover:border-dixit-gold"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageMap[s.card_id] ?? ""}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              {s.id === mySubmission?.id && (
                <span className="block bg-dixit-purple/70 py-1 text-xs">sua carta</span>
              )}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function Reveal({
  submissions,
  votes,
  players,
  storytellerCardId,
  imageMap,
  isHost,
  onNext,
  busy,
}: {
  submissions: SubmissionRow[];
  votes: VoteRow[];
  players: PublicPlayer[];
  storytellerCardId: string | null;
  imageMap: Record<string, string>;
  isHost: boolean;
  onNext: () => void;
  busy: boolean;
}) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]));
  const votesFor: Record<string, PublicPlayer[]> = {};
  for (const v of votes) {
    votesFor[v.submission_id] ??= [];
    const voter = playerById[v.voter_id];
    if (voter) votesFor[v.submission_id].push(voter);
  }
  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  return (
    <section>
      <p className="mb-4 text-center opacity-80">Resultado da rodada</p>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isStory = s.card_id === storytellerCardId;
          const owner = playerById[s.player_id];
          return (
            <div
              key={s.id}
              className={`overflow-hidden rounded border-2 ${
                isStory ? "border-dixit-gold" : "border-parchment/20"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageMap[s.card_id] ?? ""}
                alt=""
                className="aspect-[3/4] w-full object-cover"
              />
              <div className="bg-ink/80 p-2 text-xs">
                <p>
                  {isStory && "⭐ "}
                  {owner?.nickname}
                </p>
                {votesFor[s.id]?.length ? (
                  <p className="opacity-70">
                    votos: {votesFor[s.id].map((p) => p.nickname).join(", ")}
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
      {isHost && (
        <button
          onClick={onNext}
          disabled={busy}
          className="mt-6 w-full rounded bg-dixit-gold py-3 text-ink disabled:opacity-50"
        >
          Próxima rodada
        </button>
      )}
    </section>
  );
}

function EndScreen({ players }: { players: PublicPlayer[] }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];
  return (
    <section className="text-center">
      <h2 className="text-4xl text-dixit-gold">🏆 {winner?.nickname} venceu!</h2>
      <ul className="mx-auto mt-6 max-w-md space-y-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className="flex justify-between rounded border border-parchment/20 px-4 py-2"
          >
            <span>{i + 1}. {p.nickname}</span>
            <b>{p.score}</b>
          </li>
        ))}
      </ul>
      <a href="/" className="mt-6 inline-block rounded bg-dixit-rose px-4 py-2">
        Voltar
      </a>
    </section>
  );
}
