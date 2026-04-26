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
  mode: "classic" | "questions" | "stella";
}) {
  const isStella = mode === "stella";
  const isQuestions = mode === "questions";

  // In stella, storyteller submits like everyone else.
  const shouldShowHand = isStella ? !mySubmission : (!imStoryteller && !mySubmission);

  if (shouldShowHand) {
    let hint: string;
    let buttonLabel: string;
    if (isStella) {
      hint = `Tema: "${round.clue}" — escolha a carta que melhor representa`;
      buttonLabel = "Enviar Carta";
    } else if (isQuestions) {
      hint = `Resposta: "${round.clue}" — escolha uma pergunta sua que poderia produzir essa resposta`;
      buttonLabel = "Enviar Pergunta";
    } else {
      hint = `Dica: "${round.clue}" — escolha a carta que melhor combina`;
      buttonLabel = "Enviar Carta";
    }
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

  // In stella, total submissions go up to playerCount (everyone submits).
  // In classic/questions, storyteller already submitted in clue phase, so
  // submissions.length is (1 + count of nonStorytellers who submitted).
  const total = isStella ? playerCount : playerCount;
  const current = isStella ? submissions.length : submissions.length - 1;
  const denom = isStella ? playerCount : playerCount - 1;

  const text = isStella
    ? `Aguardando submissões — ${submissions.length} de ${total}`
    : `Aguardando submissões — ${current} de ${denom}`;

  return <Waiting text={text} />;
}
