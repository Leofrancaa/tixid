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

const TRACK_COLORS = [
  "#C4A862",
  "#9B59B6",
  "#E74C3C",
  "#3498DB",
  "#2ECC71",
  "#E67E22",
];

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
  targetScore,
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
  targetScore: number;
}) {
  const [clue, setClue] = useState("");
  const [selectedCard, setSelectedCard] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

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
    <>
      {zoomedUrl && (
        <CardZoom url={zoomedUrl} onClose={() => setZoomedUrl(null)} />
      )}

      <main className="mx-auto max-w-6xl px-3 py-4 sm:px-6 sm:py-6">
        {/* Header */}
        <header className="mb-4">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-xs opacity-60">
                Sala {code} · Rodada {round.round_number}
              </p>
              <p className="text-sm">
                Storyteller:{" "}
                <span className="text-dixit-gold">{storyteller?.nickname}</span>
                {round.clue && (
                  <>
                    {" · "}
                    <span className="italic text-dixit-rose">"{round.clue}"</span>
                  </>
                )}
              </p>
            </div>
          </div>
        </header>

        {/* Race Track */}
        <RaceTrack players={players} myId={myPlayerId} targetScore={targetScore} />

        {/* Game Content */}
        {gameStatus === "finished" ? (
          <EndScreen players={players} code={code} isHost={isHost} />
        ) : round.phase === "clue" && imStoryteller ? (
          <ClueInput
            clue={clue}
            setClue={setClue}
            hand={hand}
            selected={selectedCard}
            setSelected={setSelectedCard}
            onSubmit={doClue}
            busy={busy}
            onZoom={setZoomedUrl}
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
            onZoom={setZoomedUrl}
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
            onZoom={setZoomedUrl}
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
            onZoom={setZoomedUrl}
          />
        ) : null}

        {err && (
          <p className="fixed bottom-4 right-4 rounded bg-red-600/90 px-4 py-2 text-sm">
            {err}
          </p>
        )}
      </main>
    </>
  );
}

function CardZoom({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-black/60 px-3 py-1 text-sm text-white"
      >
        ✕
      </button>
    </div>
  );
}

function RaceTrack({
  players,
  myId,
  targetScore,
}: {
  players: PublicPlayer[];
  myId: string;
  targetScore: number;
}) {
  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-parchment/20 bg-gradient-to-b from-ink/70 to-ink/30 p-3 sm:p-4">
      <div className="mb-2 flex items-center justify-between text-xs opacity-40">
        <span>0</span>
        <span>🏁 meta: {targetScore} pts</span>
      </div>
      <div className="space-y-2">
        {players.map((p, i) => {
          const pct = Math.min((p.score / targetScore) * 100, 100);
          const isMe = p.id === myId;
          const color = TRACK_COLORS[i % TRACK_COLORS.length];
          return (
            <div key={p.id} className="flex items-center gap-2">
              <span
                className={`w-14 shrink-0 truncate text-xs sm:w-20 ${
                  isMe ? "font-bold text-dixit-gold" : "opacity-70"
                }`}
              >
                {p.nickname}
              </span>
              <div className="relative h-5 flex-1 overflow-hidden rounded-full bg-white/10">
                {/* Track dividers */}
                <div className="pointer-events-none absolute inset-0 flex">
                  {Array.from({ length: 4 }).map((_, j) => (
                    <div key={j} className="flex-1 border-r border-white/5 last:border-0" />
                  ))}
                </div>
                {/* Progress bar */}
                <div
                  className="absolute inset-y-0 left-0 rounded-full transition-all duration-700"
                  style={{ width: `${pct}%`, backgroundColor: color, opacity: isMe ? 1 : 0.65 }}
                />
                {/* Score */}
                <span className="absolute inset-0 flex items-center justify-end pr-2 text-xs font-bold drop-shadow">
                  {p.score}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Waiting({ text }: { text: string }) {
  return (
    <div className="rounded border border-parchment/20 p-8 text-center opacity-80 sm:p-10">
      {text}
    </div>
  );
}

function CardButton({
  imageUrl,
  selected,
  onClick,
  onZoom,
  badge,
  disabled,
}: {
  imageUrl: string;
  selected?: boolean;
  onClick?: () => void;
  onZoom: (url: string) => void;
  badge?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <div className="group relative">
      <button
        onClick={onClick}
        disabled={disabled}
        className={`w-full overflow-hidden rounded border-2 transition ${
          selected
            ? "scale-105 border-dixit-gold"
            : disabled
            ? "cursor-not-allowed border-transparent opacity-60"
            : "border-transparent opacity-90 hover:opacity-100 hover:border-dixit-gold/50"
        }`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="" className="aspect-[3/4] w-full object-cover" />
        {badge}
      </button>
      {/* Zoom button */}
      <button
        onClick={(e) => { e.stopPropagation(); onZoom(imageUrl); }}
        className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-70 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
        title="Ampliar"
      >
        ⛶
      </button>
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
  onZoom,
}: {
  hand: HandCard[];
  selected: string | null;
  setSelected: (id: string) => void;
  onConfirm: () => void;
  busy: boolean;
  hint: string;
  buttonLabel: string;
  onZoom: (url: string) => void;
}) {
  return (
    <section>
      {hint && <p className="mb-3 text-center text-sm opacity-80">{hint}</p>}
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {hand.map((c) => (
          <CardButton
            key={c.id}
            imageUrl={c.imageUrl}
            selected={selected === c.id}
            onClick={() => setSelected(c.id)}
            onZoom={onZoom}
          />
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
  onZoom: (url: string) => void;
}) {
  return (
    <section>
      <p className="mb-3 text-center text-sm opacity-80">
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
        onZoom={props.onZoom}
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
  onZoom,
}: {
  submissions: SubmissionRow[];
  imageMap: Record<string, string>;
  mySubmission: SubmissionRow | undefined;
  onVote: (id: string) => void;
  iVoted: boolean;
  imStoryteller: boolean;
  busy: boolean;
  clue: string;
  onZoom: (url: string) => void;
}) {
  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  return (
    <section>
      <p className="mb-3 text-center text-sm opacity-80">
        Dica: <span className="italic text-dixit-rose">"{clue}"</span>
        {imStoryteller
          ? " — aguarde os votos."
          : iVoted
          ? " — voto registrado, aguarde os demais."
          : " — vote na carta que você acha ser a do storyteller."}
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isOwn = s.id === mySubmission?.id;
          const disabled = imStoryteller || iVoted || busy || isOwn;
          return (
            <CardButton
              key={s.id}
              imageUrl={imageMap[s.card_id] ?? ""}
              onClick={disabled ? undefined : () => onVote(s.id)}
              onZoom={onZoom}
              disabled={disabled}
              badge={
                isOwn ? (
                  <span className="block bg-dixit-purple/70 py-1 text-xs">sua carta</span>
                ) : undefined
              }
            />
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
  onZoom,
}: {
  submissions: SubmissionRow[];
  votes: VoteRow[];
  players: PublicPlayer[];
  storytellerCardId: string | null;
  imageMap: Record<string, string>;
  isHost: boolean;
  onNext: () => void;
  busy: boolean;
  onZoom: (url: string) => void;
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
      <p className="mb-4 text-center text-sm opacity-80">Resultado da rodada</p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
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
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageMap[s.card_id] ?? ""}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                <button
                  onClick={() => onZoom(imageMap[s.card_id] ?? "")}
                  className="absolute bottom-1 right-1 rounded bg-black/60 px-1.5 py-0.5 text-xs text-white opacity-70 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  ⛶
                </button>
              </div>
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

function EndScreen({
  players,
  code,
  isHost,
}: {
  players: PublicPlayer[];
  code: string;
  isHost: boolean;
}) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const winner = sorted[0];

  async function deleteGame() {
    await fetch(`/api/games/${code}/delete`, { method: "DELETE" });
    window.location.href = "/";
  }

  return (
    <section className="text-center">
      <h2 className="text-3xl text-dixit-gold sm:text-4xl">
        🏆 {winner?.nickname} venceu!
      </h2>
      <ul className="mx-auto mt-6 max-w-md space-y-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className="flex justify-between rounded border border-parchment/20 px-4 py-2"
          >
            <span>
              {i + 1}. {p.nickname}
            </span>
            <b>{p.score}</b>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-col items-center gap-3">
        {isHost ? (
          <button
            onClick={deleteGame}
            className="rounded bg-dixit-rose px-6 py-2 text-white"
          >
            Encerrar e apagar partida
          </button>
        ) : (
          <a href="/" className="rounded bg-dixit-rose px-6 py-2">
            Voltar
          </a>
        )}
      </div>
    </section>
  );
}
