"use client";
import { useEffect, useState } from "react";
import type {
  PublicPlayer,
  RoundRow,
  SubmissionRow,
  VoteRow,
} from "@/hooks/useGameRealtime";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import ConfirmDialog from "@/components/ui/ConfirmDialog";
import { RoundSkeleton } from "@/components/ui/Skeleton";
import CardZoom from "./CardZoom";
import RaceTrack from "./RaceTrack";
import type { HandCard } from "./shared/Hand";
import CluePhase from "./phases/CluePhase";
import SubmitPhase from "./phases/SubmitPhase";
import VotePhase from "./phases/VotePhase";
import RevealPhase from "./phases/RevealPhase";
import EndScreen from "./phases/EndScreen";

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
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [endingGame, setEndingGame] = useState(false);

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

  if (!round) return <RoundSkeleton />;

  const storyteller = players.find((p) => p.id === round.storyteller_id);
  const imStoryteller = round.storyteller_id === myPlayerId;
  const mySubmission = submissions.find((s) => s.player_id === myPlayerId);

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

  async function doVote(submissionId: string, isSecondary = false) {
    setBusy(true); setErr(null);
    const res = await fetch(`/api/rounds/${round!.id}/vote`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ submissionId, isSecondary }),
    });
    setBusy(false);
    if (!res.ok) setErr((await res.json()).error ?? "erro");
  }

  async function doResolve() {
    setBusy(true);
    await fetch(`/api/rounds/${round!.id}/resolve`, { method: "POST" });
    setBusy(false);
  }

  async function doDeleteGame() {
    setEndingGame(true);
    const res = await fetch(`/api/games/${code}/delete`, { method: "DELETE" });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setErr(data.error ?? "Falha ao encerrar sala. Tente novamente.");
      setEndingGame(false);
      setConfirmEndOpen(false);
      return;
    }
    window.location.href = "/";
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
            {isHost && (
              <button
                onClick={() => setConfirmEndOpen(true)}
                className="btn-ghost px-2 py-1 text-[10px] text-red-400/60 border-red-500/20 hover:text-red-400 hover:border-red-500/40"
                title="Encerrar jogo"
              >
                ✕ fim
              </button>
            )}
          </div>
        </header>

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
                  <span className="italic text-parchment/70">&quot;{round.clue}&quot;</span>
                </>
              )}
            </p>
          </div>
        </div>

        <RaceTrack players={players} myId={myPlayerId} targetScore={targetScore} />

        <div className="mt-5">
          {gameStatus === "finished" ? (
            <EndScreen players={players} code={code} isHost={isHost} onError={setErr} />
          ) : round.phase === "clue" ? (
            <CluePhase
              imStoryteller={imStoryteller}
              storytellerName={storyteller?.nickname ?? ""}
              hand={hand}
              clue={clue}
              setClue={setClue}
              selected={selectedCard}
              setSelected={setSelectedCard}
              onSubmit={doClue}
              busy={busy}
              onZoom={setZoomedUrl}
            />
          ) : round.phase === "submitting" ? (
            <SubmitPhase
              imStoryteller={imStoryteller}
              mySubmission={mySubmission}
              submissions={submissions}
              round={round}
              playerCount={players.length}
              hand={hand}
              selected={selectedCard}
              setSelected={setSelectedCard}
              onSubmit={doSubmit}
              busy={busy}
              onZoom={setZoomedUrl}
            />
          ) : round.phase === "voting" ? (
            <VotePhase
              submissions={submissions}
              imageMap={imageMap}
              mySubmission={mySubmission}
              onVote={doVote}
              onResolve={doResolve}
              votes={votes}
              myPlayerId={myPlayerId}
              imStoryteller={imStoryteller}
              isHost={isHost}
              playerCount={players.length}
              busy={busy}
              clue={round.clue ?? ""}
              onZoom={setZoomedUrl}
            />
          ) : round.phase === "reveal" ? (
            <RevealPhase
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
          <div className="fixed bottom-5 right-5 z-50 flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-950/90 px-4 py-3 font-serif text-sm text-red-200 shadow-2xl backdrop-blur">
            <span>{err}</span>
            <button onClick={() => setErr(null)} className="text-red-400/60 hover:text-red-300">✕</button>
          </div>
        )}
      </main>

      <ConfirmDialog
        open={confirmEndOpen}
        title="Encerrar partida?"
        message="A partida será apagada e todos os jogadores serão desconectados."
        confirmLabel="Encerrar"
        cancelLabel="Cancelar"
        variant="danger"
        busy={endingGame}
        onConfirm={doDeleteGame}
        onCancel={() => setConfirmEndOpen(false)}
      />
    </>
  );
}
