import { sql } from "drizzle-orm";
import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";

export const gameStatus = pgEnum("game_status", ["lobby", "playing", "finished"]);
export const roundPhase = pgEnum("round_phase", [
  "clue",
  "submitting",
  "voting",
  "reveal",
  "finished",
]);

export const cards = pgTable("cards", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  imageUrl: text("image_url").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  addedBy: uuid("added_by"),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  status: gameStatus("status").notNull().default("lobby"),
  maxPlayers: integer("max_players").notNull().default(12),
  targetScore: integer("target_score").notNull().default(30),
  hostPlayerId: uuid("host_player_id"),
  currentRoundId: uuid("current_round_id"),
  cardQueue: jsonb("card_queue").notNull().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const gamePlayers = pgTable(
  "game_players",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    nickname: text("nickname").notNull(),
    playerToken: text("player_token").notNull(),
    seatOrder: integer("seat_order").notNull(),
    score: integer("score").notNull().default(0),
    hand: jsonb("hand").notNull().default(sql`'[]'::jsonb`),
    connected: boolean("connected").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
    joinedAt: timestamp("joined_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqSeat: unique().on(t.gameId, t.seatOrder),
    uniqNickname: unique().on(t.gameId, t.nickname),
  })
);

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    gameId: uuid("game_id")
      .notNull()
      .references(() => games.id, { onDelete: "cascade" }),
    roundNumber: integer("round_number").notNull(),
    storytellerId: uuid("storyteller_id")
      .notNull()
      .references(() => gamePlayers.id),
    clue: text("clue"),
    storytellerCardId: uuid("storyteller_card_id").references(() => cards.id),
    phase: roundPhase("phase").notNull().default("clue"),
    startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
  },
  (t) => ({
    uniqRoundNumber: unique().on(t.gameId, t.roundNumber),
  })
);

export const roundSubmissions = pgTable(
  "round_submissions",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => gamePlayers.id),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id),
    displayOrder: integer("display_order"),
  },
  (t) => ({
    uniqPlayerPerRound: unique().on(t.roundId, t.playerId),
  })
);

export const roundVotes = pgTable(
  "round_votes",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    voterId: uuid("voter_id")
      .notNull()
      .references(() => gamePlayers.id),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => roundSubmissions.id, { onDelete: "cascade" }),
    isSecondary: boolean("is_secondary").notNull().default(false),
  },
  (t) => ({
    uniqVoterPerRound: unique().on(t.roundId, t.voterId, t.isSecondary),
  })
);

export type Card = typeof cards.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type RoundSubmission = typeof roundSubmissions.$inferSelect;
export type RoundVote = typeof roundVotes.$inferSelect;
