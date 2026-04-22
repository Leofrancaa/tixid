"use client";
import Hand, { type HandCard } from "../shared/Hand";
import Waiting from "../shared/Waiting";
import type { RoundRow, SubmissionRow } from "@/hooks/useGameRealtime";

export default function SubmitPhase({
  imStoryteller,
  mySubmission,
  submissions,
  round,
  playerCount,
  hand,
  selected,
  setSelected,
  onSubmit,
  busy,
  onZoom,
}: {
  imStoryteller: boolean;
  mySubmission: SubmissionRow | undefined;
  submissions: SubmissionRow[];
  round: RoundRow;
  playerCount: number;
  hand: HandCard[];
  selected: string | null;
  setSelected: (id: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onZoom: (url: string) => void;
}) {
  if (!imStoryteller && !mySubmission) {
    return (
      <Hand
        hand={hand}
        selected={selected}
        setSelected={setSelected}
        onConfirm={onSubmit}
        busy={busy}
        hint={`Dica: "${round.clue}" — escolha a carta que melhor combina`}
        buttonLabel="Enviar Carta"
        onZoom={onZoom}
      />
    );
  }

  return (
    <Waiting
      text={`Aguardando submissões — ${submissions.length - 1} de ${playerCount - 1}`}
    />
  );
}
