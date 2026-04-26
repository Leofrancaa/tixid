"use client";
import CardButton from "../shared/CardButton";
import DeckItem, { type DeckItemData } from "../shared/DeckItem";
import Waiting from "../shared/Waiting";
import type {
  PublicPlayer,
  RoundRow,
  StellaPlayerRoundRow,
  StellaRevealRow,
  StellaRoundCardRow,
} from "@/hooks/useGameRealtime";

type ItemMap = Record<string, DeckItemData>;

function outcomeLabel(outcome: StellaRevealRow["outcome"]) {
  if (outcome === "fall") return "Queda";
  if (outcome === "super") return "Super-Spark";
  return "Spark";
}

function outcomeTone(outcome: StellaRevealRow["outcome"]) {
  if (outcome === "fall") return "border-red-500/30 bg-red-500/10 text-red-200";
  if (outcome === "super") return "border-dixit-gold/35 bg-dixit-gold/10 text-dixit-gold";
  return "border-emerald-400/30 bg-emerald-400/10 text-emerald-200";
}

export default function StellaPhase({
  round,
  players,
  myPlayerId,
  stellaCards,
  playerRounds,
  reveals,
  itemMap,
  selected,
  setSelected,
  mySelectionIds,
  onSelect,
  onReveal,
  onNext,
  busy,
  isHost,
  onZoom,
}: {
  round: RoundRow;
  players: PublicPlayer[];
  myPlayerId: string;
  stellaCards: StellaRoundCardRow[];
  playerRounds: StellaPlayerRoundRow[];
  reveals: StellaRevealRow[];
  itemMap: ItemMap;
  selected: string[];
  setSelected: (ids: string[]) => void;
  mySelectionIds: string[];
  onSelect: () => void;
  onReveal: (cardId: string) => void;
  onNext: () => void;
  busy: boolean;
  isHost: boolean;
  onZoom: (item: DeckItemData) => void;
}) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]));
  const stateByPlayer = Object.fromEntries(playerRounds.map((row) => [row.player_id, row]));
  const orderedCards = [...stellaCards].sort((a, b) => a.position - b.position);
  const submittedCount = playerRounds.filter((row) => row.submitted_at).length;
  const revealedCardIds = new Set(reveals.map((reveal) => reveal.card_id));
  const currentScout = playerRounds.find((row) => row.is_current_scout);
  const isCurrentScout = currentScout?.player_id === myPlayerId;
  const currentScoutName = currentScout ? playerById[currentScout.player_id]?.nickname : "";
  const myState = stateByPlayer[myPlayerId];
  const fallbackItem: DeckItemData = { kind: "image", value: "" };

  function toggle(cardId: string) {
    if (selected.includes(cardId)) {
      setSelected(selected.filter((id) => id !== cardId));
      return;
    }
    if (selected.length >= 10) return;
    setSelected([...selected, cardId]);
  }

  function names(ids: string[]) {
    return ids
      .map((id) => playerById[id]?.nickname)
      .filter(Boolean)
      .join(", ");
  }

  function renderGrid({
    revealMode = false,
  }: {
    revealMode?: boolean;
  }) {
    return (
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-5 sm:gap-3">
        {orderedCards.map((card) => {
          const item = itemMap[card.card_id] ?? fallbackItem;
          const isSelected = selected.includes(card.card_id);
          const wasRevealed = revealedCardIds.has(card.card_id);
          const canReveal =
            revealMode && isCurrentScout && mySelectionIds.includes(card.card_id) && !wasRevealed;
          const disabled = revealMode
            ? !canReveal
            : wasRevealed || !!myState?.submitted_at;
          return (
            <CardButton
              key={card.id}
              item={item}
              selected={!revealMode && isSelected}
              disabled={disabled}
              onClick={
                revealMode
                  ? canReveal
                    ? () => onReveal(card.card_id)
                    : undefined
                  : disabled
                    ? undefined
                    : () => toggle(card.card_id)
              }
              onZoom={onZoom}
              badge={
                <div className="absolute left-1.5 top-1.5 z-20 rounded bg-ink/80 px-1.5 py-0.5 font-label text-[9px] font-bold text-parchment/70">
                  {card.position + 1}
                </div>
              }
            />
          );
        })}
      </div>
    );
  }

  if (round.phase === "submitting") {
    if (myState?.submitted_at) {
      return (
        <Waiting text={`Aguardando escolhas - ${submittedCount} de ${players.length}`} />
      );
    }

    return (
      <section>
        <div className="panel mb-5 px-5 py-3.5 text-center">
          <p className="font-label text-xs uppercase tracking-widest text-parchment/30">
            Tema da rodada
          </p>
          <p className="mt-1 font-serif text-lg italic text-parchment/85">
            &quot;{round.clue}&quot;
          </p>
          <p className="mt-1.5 font-label text-xs text-parchment/35">
            Escolha secretamente de 1 a 10 cartas
          </p>
        </div>
        {renderGrid({})}
        <button
          onClick={onSelect}
          disabled={busy || selected.length < 1 || selected.length > 10}
          className="btn-gold mt-5 w-full py-3.5 text-sm"
        >
          Confirmar Escolhas ({selected.length}/10)
        </button>
      </section>
    );
  }

  if (round.phase === "voting") {
    return (
      <section>
        <div className="panel mb-5 px-5 py-3.5 text-center">
          <p className="font-label text-xs uppercase tracking-widest text-parchment/30">
            Tema da rodada
          </p>
          <p className="mt-1 font-serif text-lg italic text-parchment/85">
            &quot;{round.clue}&quot;
          </p>
          <p className="mt-1.5 font-label text-xs text-parchment/35">
            {isCurrentScout
              ? "Sua vez de revelar uma carta marcada"
              : currentScoutName
                ? `${currentScoutName} esta revelando`
                : "Revelando escolhas"}
          </p>
        </div>

        <div className="panel mb-4 overflow-hidden">
          <div className="border-b border-dixit-gold/10 px-4 py-2.5">
            <p className="font-label text-xs uppercase tracking-widest text-parchment/35">
              Anuncio das escolhas
            </p>
          </div>
          <div className="grid gap-2 p-3 sm:grid-cols-2">
            {players.map((player) => {
              const state = stateByPlayer[player.id];
              return (
                <div
                  key={player.id}
                  className="flex items-center justify-between rounded border border-parchment/10 px-3 py-2"
                >
                  <span className="font-serif text-sm text-parchment/80">
                    {player.nickname}
                  </span>
                  <span className="font-label text-xs text-parchment/45">
                    {state?.selection_count ?? 0} cartas
                    {state?.in_dark ? " - no escuro" : ""}
                    {state?.fallen ? " - caiu" : ""}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {reveals.length > 0 && (
          <div className="mb-4 space-y-2">
            {reveals.map((reveal) => {
              const item = itemMap[reveal.card_id] ?? fallbackItem;
              return (
                <div key={reveal.id} className="panel flex gap-3 p-3">
                  <div className="w-16 shrink-0 overflow-hidden rounded">
                    <DeckItem item={item} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`mb-1 inline-flex rounded border px-2 py-0.5 font-label text-[10px] uppercase tracking-widest ${outcomeTone(reveal.outcome)}`}
                    >
                      {outcomeLabel(reveal.outcome)}
                    </div>
                    <p className="font-serif text-sm text-parchment/80">
                      {playerById[reveal.scout_id]?.nickname}
                    </p>
                    <p className="mt-0.5 font-label text-xs text-parchment/35">
                      {reveal.outcome === "fall"
                        ? "Ninguem mais marcou essa carta"
                        : `Tambem marcaram: ${names(reveal.matched_player_ids)}`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {isCurrentScout ? (
          renderGrid({ revealMode: true })
        ) : (
          <Waiting text={currentScoutName ? `Aguardando ${currentScoutName}` : "Aguardando revelacao"} />
        )}
      </section>
    );
  }

  return (
    <section>
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/45">
        Resultado da rodada Stella
      </p>
      <div className="panel mb-4 overflow-hidden">
        <div className="divide-y divide-white/5">
          {[...players]
            .sort((a, b) => {
              const byScore =
                (stateByPlayer[b.id]?.score_delta ?? 0) -
                (stateByPlayer[a.id]?.score_delta ?? 0);
              return byScore || a.seat_order - b.seat_order;
            })
            .map((player) => {
              const state = stateByPlayer[player.id];
              return (
                <div key={player.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="font-serif text-sm text-parchment/85">{player.nickname}</p>
                    <p className="font-label text-xs text-parchment/30">
                      {state?.in_dark ? "No escuro" : "Luz acesa"}
                      {state?.fallen ? " - caiu" : ""}
                    </p>
                  </div>
                  <span className="font-label text-sm font-semibold text-dixit-gold">
                    +{state?.score_delta ?? 0}
                  </span>
                </div>
              );
            })}
        </div>
      </div>
      {isHost && (
        <button
          onClick={onNext}
          disabled={busy}
          className="btn-gold mt-6 w-full py-3.5 text-sm"
        >
          {round.round_number >= 4 ? "Finalizar Partida" : "Proxima Rodada"}
        </button>
      )}
    </section>
  );
}
