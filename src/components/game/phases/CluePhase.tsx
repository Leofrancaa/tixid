"use client";
import Hand, { type HandCard } from "../shared/Hand";
import HandPreview from "../shared/HandPreview";
import type { DeckItemData } from "../shared/DeckItem";

export default function CluePhase({
  imStoryteller,
  storytellerName,
  hand,
  clue,
  setClue,
  selected,
  setSelected,
  onSubmit,
  busy,
  onZoom,
  mode,
}: {
  imStoryteller: boolean;
  storytellerName: string;
  hand: HandCard[];
  clue: string;
  setClue: (s: string) => void;
  selected: string | null;
  setSelected: (id: string) => void;
  onSubmit: () => void;
  busy: boolean;
  onZoom: (item: DeckItemData) => void;
  mode: "classic" | "questions";
}) {
  if (!imStoryteller) {
    return <HandPreview hand={hand} storytellerName={storytellerName} onZoom={onZoom} />;
  }

  const isQuestions = mode === "questions";
  const headerText = isQuestions
    ? "Você é o storyteller — escolha uma pergunta da sua mão e digite a resposta."
    : "Você é o storyteller — escolha uma carta e dê uma dica.";
  const placeholder = isQuestions
    ? "Sua resposta — uma palavra, frase, número, qualquer coisa…"
    : "Sua dica — uma palavra, frase, som, emoção...";
  const buttonLabel = isQuestions ? "Enviar Pergunta + Resposta" : "Enviar Dica + Carta";

  return (
    <section>
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">
        {headerText}
      </p>
      <input
        value={clue}
        onChange={(e) => setClue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder={placeholder}
        maxLength={100}
        className="field mb-4"
      />
      <Hand
        hand={hand}
        selected={selected}
        setSelected={setSelected}
        onConfirm={onSubmit}
        busy={busy}
        hint=""
        buttonLabel={buttonLabel}
        onZoom={onZoom}
      />
    </section>
  );
}
