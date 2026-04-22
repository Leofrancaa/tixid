"use client";
import CardButton from "./CardButton";
import type { HandCard } from "./Hand";

export default function HandPreview({
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
