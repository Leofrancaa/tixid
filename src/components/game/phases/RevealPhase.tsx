"use client";
import type { PublicPlayer, SubmissionRow, VoteRow } from "@/hooks/useGameRealtime";

export default function RevealPhase({
  submissions,
  votes,
  players,
  storytellerCardId,
  imageMap,
  isHost,
  onNext,
  busy,
  onZoom,
}: {
  submissions: SubmissionRow[];
  votes: VoteRow[];
  players: PublicPlayer[];
  storytellerCardId: string | null;
  imageMap: Record<string, string>;
  isHost: boolean;
  onNext: () => void;
  busy: boolean;
  onZoom: (url: string) => void;
}) {
  const playerById = Object.fromEntries(players.map((p) => [p.id, p]));
  const votesFor: Record<string, { player: PublicPlayer; isSecondary: boolean }[]> = {};
  for (const v of votes) {
    votesFor[v.submission_id] ??= [];
    const voter = playerById[v.voter_id];
    if (voter) votesFor[v.submission_id].push({ player: voter, isSecondary: v.is_secondary });
  }
  const ordered = [...submissions].sort(
    (a, b) => (a.display_order ?? 0) - (b.display_order ?? 0)
  );
  return (
    <section>
      <p className="mb-4 text-center font-serif text-sm italic text-parchment/45">
        Resultado da rodada
      </p>
      <div className="grid grid-cols-2 gap-2 sm:gap-3 md:grid-cols-3 lg:grid-cols-4">
        {ordered.map((s) => {
          const isStory = s.card_id === storytellerCardId;
          const owner = playerById[s.player_id];
          return (
            <div
              key={s.id}
              className="card-frame overflow-hidden"
              style={{
                borderColor: isStory ? "rgba(201,168,76,0.7)" : undefined,
                boxShadow: isStory ? "0 0 20px rgba(201,168,76,0.2)" : undefined,
              }}
            >
              <div className="group relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageMap[s.card_id] ?? ""}
                  alt=""
                  className="aspect-[3/4] w-full object-cover"
                />
                {isStory && (
                  <div className="absolute left-2 top-2 rounded bg-dixit-gold/90 px-1.5 py-0.5 font-label text-xs font-bold text-ink">
                    ⭐ Storyteller
                  </div>
                )}
                <button
                  onClick={() => onZoom(imageMap[s.card_id] ?? "")}
                  className="absolute bottom-1.5 right-1.5 z-10 flex h-6 w-6 items-center justify-center rounded bg-black/60 text-xs text-white/60 opacity-80 transition hover:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
                >
                  ⛶
                </button>
              </div>
              <div className="bg-table-felt/90 p-2.5">
                <p className="font-label text-xs font-semibold text-parchment/75">
                  {owner?.nickname}
                </p>
                {votesFor[s.id]?.length ? (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {votesFor[s.id].map(({ player, isSecondary }) => (
                      <span
                        key={player.id + (isSecondary ? "-2" : "-1")}
                        className="inline-flex items-center gap-0.5 rounded px-1 py-0.5 font-label text-[9px] leading-none"
                        style={{
                          background: isSecondary ? "rgba(122,44,68,0.3)" : "rgba(201,168,76,0.15)",
                          color: isSecondary ? "rgba(242,236,216,0.55)" : "rgba(201,168,76,0.85)",
                        }}
                      >
                        {isSecondary ? "2°" : "1°"} {player.nickname}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="mt-0.5 font-label text-xs text-parchment/20">sem votos</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {isHost && (
        <button
          onClick={onNext}
          disabled={busy}
          className="btn-gold mt-6 w-full py-3.5 text-sm"
        >
          Próxima Rodada
        </button>
      )}
    </section>
  );
}
