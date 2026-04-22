"use client";
import Hand, { type HandCard } from "../shared/Hand";
import HandPreview from "../shared/HandPreview";

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
  onZoom: (url: string) => void;
}) {
  if (!imStoryteller) {
    return <HandPreview hand={hand} storytellerName={storytellerName} onZoom={onZoom} />;
  }

  return (
    <section>
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/55">
        Você é o storyteller — escolha uma carta e dê uma dica.
      </p>
      <input
        value={clue}
        onChange={(e) => setClue(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSubmit()}
        placeholder="Sua dica — uma palavra, frase, som, emoção..."
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
        buttonLabel="Enviar Dica + Carta"
        onZoom={onZoom}
      />
    </section>
  );
}
