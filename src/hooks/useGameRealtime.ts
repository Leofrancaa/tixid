"use client";
import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";

export interface PublicPlayer {
  id: string;
  game_id: string;
  nickname: string;
  seat_order: number;
  score: number;
  connected: boolean;
}

export interface RoundRow {
  id: string;
  game_id: string;
  round_number: number;
  storyteller_id: string;
  clue: string | null;
  storyteller_card_id: string | null;
  phase: "clue" | "submitting" | "voting" | "reveal" | "finished";
}

export interface GameRow {
  id: string;
  code: string;
  status: "lobby" | "playing" | "finished";
  host_player_id: string | null;
  current_round_id: string | null;
  target_score: number;
}

export interface SubmissionRow {
  id: string;
  round_id: string;
  player_id: string;
  card_id: string;
  display_order: number | null;
}

export interface VoteRow {
  id: string;
  round_id: string;
  voter_id: string;
  submission_id: string;
  is_secondary: boolean;
}

export function useGameRealtime(gameId: string) {
  const [game, setGame] = useState<GameRow | null>(null);
  const [players, setPlayers] = useState<PublicPlayer[]>([]);
  const [round, setRound] = useState<RoundRow | null>(null);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [votes, setVotes] = useState<VoteRow[]>([]);

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();

    async function initialLoad() {
      const [g, p, r] = await Promise.all([
        supabase.from("games").select("*").eq("id", gameId).single(),
        supabase
          .from("game_players_public")
          .select("*")
          .eq("game_id", gameId)
          .order("seat_order"),
        supabase
          .from("rounds")
          .select("*")
          .eq("game_id", gameId)
          .order("round_number", { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);
      if (g.data) setGame(g.data as GameRow);
      if (p.data) setPlayers(p.data as PublicPlayer[]);
      if (r.data) {
        setRound(r.data as RoundRow);
        const [subs, vts] = await Promise.all([
          supabase.from("round_submissions").select("*").eq("round_id", r.data.id),
          supabase.from("round_votes").select("*").eq("round_id", r.data.id),
        ]);
        if (subs.data) setSubmissions(subs.data as SubmissionRow[]);
        if (vts.data) setVotes(vts.data as VoteRow[]);
      }
    }

    initialLoad();

    const channel = supabase
      .channel(`game:${gameId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "games", filter: `id=eq.${gameId}` },
        (payload) => {
          if (payload.eventType === "DELETE") setGame(null);
          else setGame(payload.new as GameRow);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "game_players",
          filter: `game_id=eq.${gameId}`,
        },
        () => {
          supabase
            .from("game_players_public")
            .select("*")
            .eq("game_id", gameId)
            .order("seat_order")
            .then(({ data }) => data && setPlayers(data as PublicPlayer[]));
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "rounds",
          filter: `game_id=eq.${gameId}`,
        },
        (payload) => {
          const row = payload.new as RoundRow;
          setRound((cur) => {
            if (!cur || row.round_number >= cur.round_number) return row;
            return cur;
          });
          // On reveal, refetch votes from DB so is_secondary is authoritative
          if (row.phase === "reveal") {
            supabase
              .from("round_votes")
              .select("*")
              .eq("round_id", row.id)
              .then(({ data }) => data && setVotes(data as VoteRow[]));
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_submissions" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as SubmissionRow;
            // Reset if this belongs to a different round than what's in state
            setSubmissions((cur) => {
              if (cur.length > 0 && cur[0].round_id !== row.round_id) return [row];
              return [...cur, row];
            });
          } else {
            // UPDATE (display_order shuffle when voting starts) or DELETE → refetch
            const rid =
              (payload.new as SubmissionRow)?.round_id ??
              (payload.old as SubmissionRow)?.round_id;
            if (rid) {
              supabase
                .from("round_submissions")
                .select("*")
                .eq("round_id", rid)
                .then(({ data }) => data && setSubmissions(data as SubmissionRow[]));
            }
          }
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_votes" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            const row = payload.new as VoteRow;
            // Reset if this belongs to a different round than what's in state
            setVotes((cur) => {
              if (cur.length > 0 && cur[0].round_id !== row.round_id) return [row];
              return [...cur, row];
            });
          } else {
            // DELETE/UPDATE (rare) → refetch for correctness
            const rid =
              (payload.new as VoteRow)?.round_id ??
              (payload.old as VoteRow)?.round_id;
            if (rid) {
              supabase
                .from("round_votes")
                .select("*")
                .eq("round_id", rid)
                .then(({ data }) => data && setVotes(data as VoteRow[]));
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId]);

  return { game, players, round, submissions, votes };
}
