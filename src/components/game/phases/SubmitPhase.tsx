"use client";
import Hand, { type HandCard } from "../shared/Hand";
import Waiting from "../shared/Waiting";
import type { DeckItemData } from "../shared/DeckItem";
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
  mode,
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
  onZoom: (item: DeckItemData) => void;
  mode: "classic" | "questions";
}) {
  if (!imStoryteller && !mySubmission) {
    const hint = mode === "questions"
      ? `Resposta: "${round.clue}" — escolha uma pergunta sua que poderia produzir essa resposta`
      : `Dica: "${round.clue}" — escolha a carta que melhor combina`;
    const buttonLabel = mode === "questions" ? "Enviar Pergunta" : "Enviar Carta";
    return (
      <Hand
        hand={hand}
        selected={selected}
        setSelected={setSelected}
        onConfirm={onSubmit}
        busy={busy}
        hint={hint}
        buttonLabel={buttonLabel}
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
