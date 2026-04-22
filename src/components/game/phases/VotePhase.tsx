"use client";
import { useRef, useState } from "react";
import CardButton from "../shared/CardButton";
import type { SubmissionRow, VoteRow } from "@/hooks/useGameRealtime";

export default function VotePhase({
  submissions,
  imageMap,
  mySubmission,
  onVote,
  onResolve,
  votes,
  myPlayerId,
  imStoryteller,
  isHost,
  playerCount,
  busy,
  clue,
  onZoom,
}: {
  submissions: SubmissionRow[];
  imageMap: Record<string, string>;
  mySubmission: SubmissionRow | undefined;
  onVote: (id: string, isSecondary?: boolean) => void;
  onResolve: () => void;
  votes: VoteRow[];
  myPlayerId: string;
  imStoryteller: boolean;
  isHost: boolean;
  playerCount: number;
  busy: boolean;
  clue: string;
  onZoom: (url: string) => void;
}) {
  const [primaryPending, setPrimaryPending] = useState<string | null>(null);
  const [secondaryPending, setSecondaryPending] = useState<string | null>(null);
  // Synchronous locks — prevent double-tap before React re-renders
  const primarySentRef = useRef(false);
  const secondarySentRef = useRef(false);
  const [primarySent, setPrimarySent] = useState(false);
  const [secondarySent, setSecondarySent] = useState(false);
  const [localPrimarySubId, setLocalPrimarySubId] = useState<string | null>(null);
  const [localSecondarySubId, setLocalSecondarySubId] = useState<string | null>(null);

  const myPrimaryVote = votes.find((v) => v.voter_id === myPlayerId && !v.is_secondary);
  const mySecondaryVote = votes.find((v) => v.voter_id === myPlayerId && v.is_secondary);
  const hasPrimaryVote = !!myPrimaryVote || primarySent;
  const hasSecondaryVote = !!mySecondaryVote || secondarySent;
  const confirmedPrimarySubId = myPrimaryVote?.submission_id ?? localPrimarySubId;
  const confirmedSecondarySubId = mySecondaryVote?.submission_id ?? localSecondarySubId;
  const hasOdysseyMode = playerCount >= 7;
  const nonStorytellerCount = playerCount - 1;
  const primaryVotesCount = votes.filter((v) => !v.is_secondary).length;
  const allPrimaryIn = primaryVotesCount >= nonStorytellerCount;

  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );

  const canPrimary = !imStoryteller && !hasPrimaryVote && !busy;
  const canSecondary = !imStoryteller && hasPrimaryVote && hasOdysseyMode && !hasSecondaryVote && !busy;

  function statusText() {
    if (imStoryteller) return "Aguarde os votos";
    if (!hasPrimaryVote) return primaryPending ? "Confirme seu voto principal" : "Toque numa carta para selecionar";
    if (hasOdysseyMode && !hasSecondaryVote) return secondaryPending ? "Confirme o voto secundário (opcional)" : "Voto principal registrado — escolha um voto secundário ou aguarde";
    return "Votos registrados — aguarde os demais";
  }

  return (
    <section>
      <div className="panel mb-5 px-5 py-3.5 text-center">
        <p className="font-label text-xs uppercase tracking-widest text-parchment/30 mb-1">
          Dica do storyteller
        </p>
        <p className="font-serif text-lg italic text-parchment/85">&quot;{clue}&quot;</p>
        {hasOdysseyMode && !imStoryteller && (
          <p className="mt-1 font-label text-[10px] uppercase tracking-widest text-dixit-gold/50">
            Modo Odyssey — 2 votos disponíveis
          </p>
        )}
        <p className="mt-1.5 font-label text-xs text-parchment/35">{statusText()}</p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isOwn = s.id === mySubmission?.id;
          const isPrimaryPending = s.id === primaryPending;
          const isSecondaryPending = s.id === secondaryPending;
          const isMyPrimaryVote = s.id === confirmedPrimarySubId;
          const isMySecondaryVote = s.id === confirmedSecondarySubId;
          const blockedForSecondary = canSecondary && isMyPrimaryVote;

          if (isOwn) {
            return (
              <div key={s.id} className="card-frame relative opacity-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageMap[s.card_id] ?? ""} alt="" className="aspect-[3/4] w-full object-cover" />
                <div className="absolute inset-0 flex items-end">
                  <div className="w-full bg-ink/90 py-2 text-center font-label text-xs tracking-widest text-parchment/60 backdrop-blur-sm">
                    sua carta
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); onZoom(imageMap[s.card_id] ?? ""); }}
                  className="absolute bottom-8 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-70 transition hover:opacity-100"
                >⛶</button>
              </div>
            );
          }

          return (
            <div key={s.id} className="relative">
              <CardButton
                imageUrl={imageMap[s.card_id] ?? ""}
                onClick={
                  blockedForSecondary ? undefined
                  : canPrimary ? () => setPrimaryPending(isPrimaryPending ? null : s.id)
                  : canSecondary ? () => setSecondaryPending(isSecondaryPending ? null : s.id)
                  : undefined
                }
                onZoom={onZoom}
                disabled={(!canPrimary && !canSecondary) || blockedForSecondary}
                selected={isPrimaryPending || isSecondaryPending || isMyPrimaryVote || isMySecondaryVote}
              />

              {isMyPrimaryVote && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-dixit-gold px-1.5 py-0.5 font-label text-[9px] font-bold text-ink shadow">
                  ✓ 1°
                </div>
              )}
              {isMySecondaryVote && (
                <div className="absolute left-1 top-1 flex items-center gap-1 rounded bg-dixit-rose px-1.5 py-0.5 font-label text-[9px] font-bold text-parchment shadow">
                  ✓ 2°
                </div>
              )}
              {!isMyPrimaryVote && isPrimaryPending && (
                <div className="absolute left-1 top-1 rounded border border-dixit-gold/60 bg-ink/80 px-1.5 py-0.5 font-label text-[9px] font-bold text-dixit-gold">1°</div>
              )}
              {!isMySecondaryVote && isSecondaryPending && (
                <div className="absolute left-1 top-1 rounded border border-dixit-rose/60 bg-ink/80 px-1.5 py-0.5 font-label text-[9px] font-bold text-dixit-rose">2°</div>
              )}
              {blockedForSecondary && (
                <div className="absolute inset-0 flex items-center justify-center rounded bg-black/40">
                  <span className="font-label text-[10px] uppercase tracking-widest text-parchment/50">já votado</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {canPrimary && primaryPending && (
        <button
          onClick={() => {
            if (primarySentRef.current) return;
            primarySentRef.current = true;
            setPrimarySent(true);
            setLocalPrimarySubId(primaryPending);
            onVote(primaryPending, false);
            setPrimaryPending(null);
          }}
          disabled={busy || primarySent}
          className="btn-gold mt-5 w-full py-3.5 text-sm"
        >
          Confirmar Voto Principal
        </button>
      )}

      {canSecondary && (
        <div className="mt-4 space-y-2">
          {secondaryPending ? (
            <button
              onClick={() => {
                if (secondarySentRef.current) return;
                secondarySentRef.current = true;
                setSecondarySent(true);
                setLocalSecondarySubId(secondaryPending);
                onVote(secondaryPending, true);
                setSecondaryPending(null);
              }}
              disabled={busy || secondarySent}
              className="btn-wine w-full py-3 text-sm"
            >
              Confirmar Voto Secundário (+1 pt)
            </button>
          ) : (
            <div className="rounded border border-parchment/10 py-3 text-center font-label text-xs tracking-wider text-parchment/25">
              Selecione uma carta para o voto secundário
            </div>
          )}
          <button
            onClick={() => {
              if (secondarySentRef.current) return;
              secondarySentRef.current = true;
              setSecondarySent(true);
            }}
            disabled={busy}
            className="btn-ghost w-full py-2 text-xs text-parchment/30"
          >
            Usar apenas o voto principal
          </button>
        </div>
      )}

      {canPrimary && !primaryPending && (
        <div className="mt-4 rounded border border-parchment/10 py-3 text-center font-label text-xs tracking-wider text-parchment/25">
          Nenhuma carta selecionada
        </div>
      )}

      {hasOdysseyMode && isHost && (
        <div className="mt-5 space-y-2">
          <div className="flex items-center justify-between rounded border border-parchment/10 px-4 py-2.5">
            <span className="font-label text-xs tracking-widest text-parchment/35">
              Votos primários recebidos
            </span>
            <span className={`font-label text-sm font-semibold ${allPrimaryIn ? "text-dixit-gold" : "text-parchment/50"}`}>
              {primaryVotesCount} / {nonStorytellerCount}
            </span>
          </div>
          <button
            onClick={onResolve}
            disabled={busy || !allPrimaryIn}
            className="btn-gold w-full py-3.5 text-sm disabled:opacity-40"
          >
            {allPrimaryIn ? "Revelar Votos" : `Aguardando votos… (${primaryVotesCount}/${nonStorytellerCount})`}
          </button>
        </div>
      )}
    </section>
  );
}
