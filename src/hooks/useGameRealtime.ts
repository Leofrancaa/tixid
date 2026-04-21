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
          setRound((cur) =>
            !cur || row.round_number >= cur.round_number ? row : cur
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_submissions" },
        (payload) => {
          const row = payload.new as SubmissionRow;
          setSubmissions((cur) => {
            if (!round && !row) return cur;
            const rid = row?.round_id ?? (payload.old as SubmissionRow)?.round_id;
            // refetch for simplicity
            supabase
              .from("round_submissions")
              .select("*")
              .eq("round_id", rid)
              .then(({ data }) => data && setSubmissions(data as SubmissionRow[]));
            return cur;
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "round_votes" },
        (payload) => {
          const row = payload.new as VoteRow;
          const rid = row?.round_id ?? (payload.old as VoteRow)?.round_id;
          supabase
            .from("round_votes")
            .select("*")
            .eq("round_id", rid)
            .then(({ data }) => data && setVotes(data as VoteRow[]));
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
