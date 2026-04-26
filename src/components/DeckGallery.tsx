"use client";
import { useState } from "react";
import CardZoom from "./game/CardZoom";

interface DeckCard {
  id: string;
  imageUrl: string;
}

export default function DeckGallery({ cards }: { cards: DeckCard[] }) {
  const [zoomedUrl, setZoomedUrl] = useState<string | null>(null);

  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3 md:grid-cols-4 lg:grid-cols-5">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => setZoomedUrl(c.imageUrl)}
            className="card-frame group cursor-pointer"
            title="Ampliar"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={c.imageUrl}
              alt=""
              loading="lazy"
              className="aspect-[3/4] w-full object-cover"
              style={{ display: "block" }}
            />
          </button>
        ))}
      </div>

      {zoomedUrl && (
        <CardZoom
          item={{ kind: "image", value: zoomedUrl }}
          onClose={() => setZoomedUrl(null)}
        />
      )}
    </>
  );
}
