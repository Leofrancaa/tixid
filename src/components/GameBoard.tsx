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

const TOKEN_COLORS = ["#C9A84C", "#9B72CF", "#C8536D", "#4A9ECC", "#5BAD72", "#D4834A"];

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

  if (!round) {
    return (
      <main className="flex min-h-screen items-center justify-center">
        <p className="font-serif italic text-parchment/40">Carregando rodada...</p>
      </main>
    );
  }

  const storyteller = players.find((p) => p.id === round.storyteller_id);
  const imStoryteller = round.storyteller_id === myPlayerId;
  const mySubmission = submissions.find((s) => s.player_id === myPlayerId);
  const iVoted = votes.some((v) => v.voter_id === myPlayerId);

  async function doClue() {
    if (!clue.trim() || !selectedCard) return setErr("Escreva a dica e escolha uma carta");
    setBusy(true); setErr(null);
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
    setBusy(true); setErr(null);
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
    setBusy(true); setErr(null);
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

  const phaseLabel: Record<string, string> = {
    clue: "Fase da Dica",
    submitting: "Escolha de Cartas",
    voting: "Votação",
    reveal: "Revelação",
    finished: "Fim de Jogo",
  };

  return (
    <>
      {zoomedUrl && <CardZoom url={zoomedUrl} onClose={() => setZoomedUrl(null)} />}

      <main className="mx-auto max-w-5xl px-4 py-5 sm:px-6">
        {/* Top bar */}
        <header className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-3">
            <span
              className="text-dixit-gold"
              style={{
                fontFamily: "var(--font-vonix), var(--font-cinzel), serif",
                fontSize: "1.2rem",
                letterSpacing: "0.12em",
              }}
            >
              Vonix
            </span>
            <span className="hidden h-4 w-px bg-dixit-gold/20 sm:block" />
            <span className="font-label text-xs tracking-widest text-parchment/30 uppercase">
              Sala {code}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="phase-badge">{phaseLabel[round.phase] ?? round.phase}</span>
            <span className="font-label text-xs text-parchment/30">R{round.round_number}</span>
          </div>
        </header>

        {/* Storyteller info */}
        <div className="panel mb-4 flex items-center gap-4 px-4 py-3">
          <div className="flex-1 min-w-0">
            <p className="font-label text-xs uppercase tracking-widest text-parchment/35 mb-0.5">
              Storyteller
            </p>
            <p className="font-serif text-sm text-parchment/90 truncate">
              <span className="text-dixit-gold font-semibold">{storyteller?.nickname}</span>
              {round.clue && (
                <>
                  <span className="mx-2 text-parchment/20">·</span>
                  <span className="italic text-parchment/70">"{round.clue}"</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Race Track */}
        <RaceTrack players={players} myId={myPlayerId} targetScore={targetScore} />

        {/* Game Content */}
        <div className="mt-5">
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
            <HandPreview
              hand={hand}
              storytellerName={storyteller?.nickname ?? ""}
              onZoom={setZoomedUrl}
            />
          ) : round.phase === "submitting" && !imStoryteller && !mySubmission ? (
            <Hand
              hand={hand}
              selected={selectedCard}
              setSelected={setSelectedCard}
              onConfirm={doSubmit}
              busy={busy}
              hint={`Dica: "${round.clue}" — escolha a carta que melhor combina`}
              buttonLabel="Enviar Carta"
              onZoom={setZoomedUrl}
            />
          ) : round.phase === "submitting" ? (
            <Waiting
              text={`Aguardando submissões — ${submissions.length - 1} de ${players.length - 1}`}
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
        </div>

        {err && (
          <div className="fixed bottom-5 right-5 z-50 rounded-lg border border-red-500/30 bg-red-950/90 px-4 py-3 font-serif text-sm text-red-200 shadow-2xl backdrop-blur">
            {err}
          </div>
        )}
      </main>
    </>
  );
}

/* ─── Card Zoom Overlay ──────────────────────────────────────────────── */

function CardZoom({ url, onClose }: { url: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        className="max-h-[88vh] max-w-[88vw] rounded-xl object-contain shadow-2xl"
        style={{ boxShadow: "0 0 60px rgba(0,0,0,0.8), 0 0 0 1px rgba(201,168,76,0.15)" }}
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-5 top-5 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 font-label text-sm text-white/70 transition hover:bg-white/20"
      >
        ✕
      </button>
    </div>
  );
}

/* ─── Race Track (board game squares) ───────────────────────────────── */

function RaceTrack({
  players,
  myId,
  targetScore,
}: {
  players: PublicPlayer[];
  myId: string;
  targetScore: number;
}) {
  // Map score → players on that square
  const tokensAt: Record<number, { player: PublicPlayer; colorIdx: number }[]> = {};
  players.forEach((p, i) => {
    const sq = Math.min(p.score, targetScore);
    if (!tokensAt[sq]) tokensAt[sq] = [];
    tokensAt[sq].push({ player: p, colorIdx: i });
  });

  // Squares 0..targetScore-1 go in the grid; targetScore is rendered separately
  const squares = Array.from({ length: targetScore }, (_, i) => i);
  const COLS = 10;
  const finishTokens = tokensAt[targetScore] ?? [];

  return (
    <div className="panel overflow-hidden">
      <div className="border-b border-dixit-gold/10 px-4 py-2.5 flex items-center justify-between">
        <span className="font-label text-xs uppercase tracking-widest text-parchment/30">
          Tabuleiro
        </span>
        <div className="flex items-center gap-3">
          {players.map((p, i) => (
            <span key={p.id} className="flex items-center gap-1">
              <span
                className="inline-flex h-4 w-4 items-center justify-center rounded-full font-label text-[9px] font-bold text-ink"
                style={{ backgroundColor: TOKEN_COLORS[i % TOKEN_COLORS.length] }}
              >
                {p.nickname[0].toUpperCase()}
              </span>
              <span className={`font-label text-xs ${p.id === myId ? "text-dixit-gold font-semibold" : "text-parchment/40"}`}>
                {p.score}
              </span>
            </span>
          ))}
          <span className="font-label text-xs text-parchment/20">/{targetScore}</span>
        </div>
      </div>

      <div className="p-2 sm:p-3 space-y-0.5">
        {/* Normal squares grid */}
        <div
          className="gap-0.5"
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${COLS}, minmax(0, 1fr))`,
          }}
        >
          {squares.map((sq) => {
            const isFinish = false;
            const tokens = tokensAt[sq] ?? [];
            return (
              <div
                key={sq}
                className="relative flex flex-col items-center justify-center rounded"
                style={{
                  aspectRatio: "1",
                  background: sq === 0
                    ? "rgba(201,168,76,0.18)"
                    : "rgba(255,255,255,0.04)",
                  border: sq === 0
                    ? "1px solid rgba(201,168,76,0.45)"
                    : "1px solid rgba(255,255,255,0.07)",
                }}
              >
                <span
                  className="font-label leading-none select-none"
                  style={{
                    fontSize: "clamp(7px, 1.1vw, 10px)",
                    color: sq === 0
                      ? "rgba(201,168,76,0.9)"
                      : "rgba(242,236,216,0.22)",
                    marginBottom: tokens.length ? 1 : 0,
                  }}
                >
                  {sq}
                </span>

                {tokens.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-px">
                    {tokens.map(({ player, colorIdx }) => (
                      <div
                        key={player.id}
                        title={player.nickname}
                        className="rounded-full transition-all duration-700"
                        style={{
                          width: "clamp(5px, 1.3vw, 10px)",
                          height: "clamp(5px, 1.3vw, 10px)",
                          backgroundColor: TOKEN_COLORS[colorIdx % TOKEN_COLORS.length],
                          boxShadow:
                            player.id === myId
                              ? `0 0 4px ${TOKEN_COLORS[colorIdx % TOKEN_COLORS.length]}`
                              : "none",
                          opacity: player.id === myId ? 1 : 0.75,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Full-width finish square */}
        <div
          className="flex items-center justify-center gap-2 rounded"
          style={{
            height: "clamp(32px, 5vw, 48px)",
            background: "rgba(201,168,76,0.18)",
            border: "1px solid rgba(201,168,76,0.45)",
          }}
        >
          <span style={{ fontSize: "clamp(18px, 3vw, 28px)", lineHeight: 1 }}>🏁</span>
          <span
            className="font-label uppercase tracking-widest"
            style={{ fontSize: "clamp(8px, 1.2vw, 11px)", color: "rgba(201,168,76,0.8)" }}
          >
            Linha de Chegada
          </span>
          {finishTokens.length > 0 && (
            <div className="flex gap-1 ml-1">
              {finishTokens.map(({ player, colorIdx }) => (
                <div
                  key={player.id}
                  title={player.nickname}
                  className="rounded-full"
                  style={{
                    width: "clamp(8px, 1.5vw, 12px)",
                    height: "clamp(8px, 1.5vw, 12px)",
                    backgroundColor: TOKEN_COLORS[colorIdx % TOKEN_COLORS.length],
                    boxShadow: player.id === myId ? `0 0 5px ${TOKEN_COLORS[colorIdx % TOKEN_COLORS.length]}` : "none",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Waiting ────────────────────────────────────────────────────────── */

function Waiting({ text }: { text: string }) {
  return (
    <div className="panel flex min-h-28 items-center justify-center p-8">
      <p className="font-serif italic text-parchment/45 text-center">{text}</p>
    </div>
  );
}

function HandPreview({
  hand,
  storytellerName,
  onZoom,
}: {
  hand: HandCard[];
  storytellerName: string;
  onZoom: (url: string) => void;
}) {
  return (
    <section>
      <div className="panel mb-4 px-4 py-3 text-center">
        <p className="font-serif italic text-parchment/45 text-sm">
          <span className="text-dixit-gold">{storytellerName}</span> está escolhendo a dica — veja suas cartas enquanto aguarda
        </p>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 md:grid-cols-6">
        {hand.map((c) => (
          <CardButton
            key={c.id}
            imageUrl={c.imageUrl}
            onZoom={onZoom}
          />
        ))}
      </div>
    </section>
  );
}

/* ─── Card Button ────────────────────────────────────────────────────── */

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
    <div className={`card-frame group ${selected ? "selected" : ""}`}>
      <button
        onClick={onClick}
        disabled={disabled && !onClick}
        className={`relative w-full transition-transform duration-200 ${
          selected ? "scale-[1.04]" : ""
        } ${disabled ? "cursor-not-allowed opacity-50" : "cursor-pointer"}`}
        style={{ display: "block" }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={imageUrl}
          alt=""
          className="aspect-[3/4] w-full object-cover"
          style={{ display: "block" }}
        />
        {badge}
      </button>
      {/* Zoom button */}
      <button
        onClick={(e) => { e.stopPropagation(); onZoom(imageUrl); }}
        className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-80 transition hover:bg-black/80 hover:text-white sm:opacity-0 sm:group-hover:opacity-100"
        title="Ampliar carta"
      >
        ⛶
      </button>
    </div>
  );
}

/* ─── Hand ───────────────────────────────────────────────────────────── */

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
      {hint && (
        <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">{hint}</p>
      )}
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
        className="btn-gold mt-5 w-full py-3.5 text-sm"
      >
        {buttonLabel}
      </button>
    </section>
  );
}

/* ─── Clue Input ─────────────────────────────────────────────────────── */

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
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">
        Você é o storyteller — escolha uma carta e dê uma dica.
      </p>
      <input
        value={props.clue}
        onChange={(e) => props.setClue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && props.onSubmit()}
        placeholder="Sua dica — uma palavra, frase, som, emoção..."
        maxLength={100}
        className="field mb-4"
      />
      <Hand
        hand={props.hand}
        selected={props.selected}
        setSelected={props.setSelected}
        onConfirm={props.onSubmit}
        busy={props.busy}
        hint=""
        buttonLabel="Enviar Dica + Carta"
        onZoom={props.onZoom}
      />
    </section>
  );
}

/* ─── Vote Board ─────────────────────────────────────────────────────── */

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
  const [votePending, setVotePending] = useState<string | null>(null);

  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const canSelect = !imStoryteller && !iVoted && !busy;

  function handleConfirm() {
    if (!votePending) return;
    onVote(votePending);
    setVotePending(null);
  }

  return (
    <section>
      <div className="panel mb-5 px-5 py-3.5 text-center">
        <p className="font-label text-xs uppercase tracking-widest text-parchment/30 mb-1">
          Dica do storyteller
        </p>
        <p className="font-serif text-lg italic text-parchment/85">"{clue}"</p>
        <p className="mt-1.5 font-label text-xs text-parchment/35">
          {imStoryteller
            ? "Aguarde os votos"
            : iVoted
            ? "Voto registrado — aguarde os demais"
            : votePending
            ? "Confirme seu voto abaixo ou escolha outra carta"
            : "Toque numa carta para selecionar, depois confirme"}
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isOwn = s.id === mySubmission?.id;
          const isSelected = s.id === votePending;

          if (isOwn) {
            return (
              <div key={s.id} className="card-frame relative opacity-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageMap[s.card_id] ?? ""}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                <div className="absolute inset-0 flex items-end">
                  <div className="w-full bg-ink/90 py-2 text-center font-label text-xs tracking-widest text-parchment/60 backdrop-blur-sm">
                    sua carta
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onZoom(imageMap[s.card_id] ?? ""); }}
                  className="absolute bottom-8 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-70 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >⛶</button>
              </div>
            );
          }

          return (
            <CardButton
              key={s.id}
              imageUrl={imageMap[s.card_id] ?? ""}
              onClick={canSelect ? () => setVotePending(isSelected ? null : s.id) : undefined}
              onZoom={onZoom}
              disabled={!canSelect}
              selected={isSelected}
            />
          );
        })}
      </div>

      {/* Confirm button — only shown when a card is selected and voting is allowed */}
      {canSelect && votePending && (
        <button
          onClick={handleConfirm}
          disabled={busy}
          className="btn-gold mt-5 w-full py-3.5 text-sm"
        >
          Confirmar Voto
        </button>
      )}
      {canSelect && !votePending && !iVoted && (
        <div className="mt-4 rounded border border-parchment/10 py-3 text-center font-label text-xs tracking-wider text-parchment/25">
          Nenhuma carta selecionada
        </div>
      )}
    </section>
  );
}

/* ─── Reveal ─────────────────────────────────────────────────────────── */

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
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/45">
        Resultado da rodada
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isStory = s.card_id === storytellerCardId;
          const owner = playerById[s.player_id];
          return (
            <div
              key={s.id}
              className="card-frame overflow-hidden"
              style={{
                borderColor: isStory ? "rgba(201,168,76,0.7)" : undefined,
                boxShadow: isStory ? "0 0 20px rgba(201,168,76,0.2)" : undefined,
              }}
            >
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageMap[s.card_id] ?? ""}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                {isStory && (
                  <div className="absolute left-2 top-2 rounded bg-dixit-gold/90 px-1.5 py-0.5 font-label text-xs font-bold text-ink">
                    ⭐ Storyteller
                  </div>
                )}
                <button
                  onClick={() => onZoom(imageMap[s.card_id] ?? "")}
                  className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-80 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  ⛶
                </button>
              </div>
              <div className="bg-table-felt/90 p-2.5">
                <p className="font-label text-xs font-semibold text-parchment/75">
                  {owner?.nickname}
                </p>
                {votesFor[s.id]?.length ? (
                  <p className="mt-0.5 font-label text-xs text-parchment/40 leading-tight">
                    {votesFor[s.id].map((p) => p.nickname).join(", ")}
                  </p>
                ) : (
                  <p className="mt-0.5 font-label text-xs text-parchment/20">sem votos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isHost && (
        <button
          onClick={onNext}
          disabled={busy}
          className="btn-gold mt-6 w-full py-3.5 text-sm"
        >
          Próxima Rodada
        </button>
      )}
    </section>
  );
}

/* ─── End Screen ─────────────────────────────────────────────────────── */

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
    <section className="animate-fade-up text-center">
      <div
        className="mx-auto mb-2 inline-block font-display text-5xl text-dixit-gold sm:text-6xl"
        style={{ textShadow: "0 0 40px rgba(201,168,76,0.4)" }}
      >
        🏆
      </div>
      <h2 className="mb-1 font-display text-2xl font-semibold tracking-widest text-dixit-gold sm:text-3xl">
        {winner?.nickname} venceu!
      </h2>
      <p className="mb-8 font-serif italic text-parchment/40">A partida chegou ao fim</p>

      <ul className="mx-auto mb-8 max-w-sm space-y-2">
        {sorted.map((p, i) => (
          <li
            key={p.id}
            className={`flex items-center justify-between rounded-lg px-4 py-3 ${
              i === 0 ? "border border-dixit-gold/30 bg-dixit-gold/8" : "panel"
            }`}
          >
            <span className="flex items-center gap-3">
              <span className="font-label text-sm text-parchment/30">{i + 1}.</span>
              <span className="font-serif text-parchment/85">{p.nickname}</span>
            </span>
            <b className={`font-display text-lg ${i === 0 ? "text-dixit-gold" : "text-parchment/60"}`}>
              {p.score}
            </b>
          </li>
        ))}
      </ul>

      {isHost ? (
        <button onClick={deleteGame} className="btn-wine px-8 py-3 text-sm">
          Encerrar e Apagar Partida
        </button>
      ) : (
        <a href="/" className="btn-ghost inline-block px-8 py-3 text-sm">
          Voltar ao Início
        </a>
      )}
    </section>
  );
}
