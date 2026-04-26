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
  mode: "classic" | "questions" | "stella";
}) {
  const isStella = mode === "stella";
  const isQuestions = mode === "questions";

  if (!imStoryteller) {
    if (isStella) {
      return (
        <section className="panel p-8 text-center">
          <p className="font-serif italic text-parchment/55">
            <span className="text-dixit-gold">{storytellerName}</span> está pensando o tema da rodada…
          </p>
        </section>
      );
    }
    return <HandPreview hand={hand} storytellerName={storytellerName} onZoom={onZoom} />;
  }

  // Stella: storyteller só digita tema, não escolhe carta agora
  if (isStella) {
    return (
      <section>
        <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">
          Você é o storyteller — defina o tema da rodada (sem escolher carta).
        </p>
        <input
          value={clue}
          onChange={(e) => setClue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSubmit()}
          placeholder="Tema — uma palavra ou expressão (ex: carnaval, medo, viagem…)"
          maxLength={100}
          className="field mb-4"
        />
        <button
          onClick={onSubmit}
          disabled={!clue.trim() || busy}
          className="btn-gold w-full py-3.5 text-sm"
        >
          Definir Tema
        </button>
      </section>
    );
  }

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
