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
export const gameMode = pgEnum("game_mode", ["classic", "questions", "stella"]);
export const stellaRevealOutcome = pgEnum("stella_reveal_outcome", [
  "fall",
  "spark",
  "super",
]);
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

export const questions = pgTable("questions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  text: text("text").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const games = pgTable("games", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  code: text("code").notNull().unique(),
  status: gameStatus("status").notNull().default("lobby"),
  mode: gameMode("mode").notNull().default("classic"),
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
    currentStreak: integer("current_streak").notNull().default(0),
    sacrificeUsed: boolean("sacrifice_used").notNull().default(false),
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
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    clue: text("clue"),
    storytellerCardId: uuid("storyteller_card_id"),
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
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    cardId: uuid("card_id").notNull(),
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
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    submissionId: uuid("submission_id")
      .notNull()
      .references(() => roundSubmissions.id, { onDelete: "cascade" }),
    isSecondary: boolean("is_secondary").notNull().default(false),
  },
  (t) => ({
    uniqVoterPerRound: unique().on(t.roundId, t.voterId, t.isSecondary),
  })
);

export const stellaRoundCards = pgTable(
  "stella_round_cards",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
  },
  (t) => ({
    uniqPosition: unique().on(t.roundId, t.position),
    uniqCard: unique().on(t.roundId, t.cardId),
  })
);

export const stellaSelections = pgTable(
  "stella_selections",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqSelection: unique().on(t.roundId, t.playerId, t.cardId),
  })
);

export const stellaPlayerRounds = pgTable(
  "stella_player_rounds",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    playerId: uuid("player_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    selectionCount: integer("selection_count"),
    inDark: boolean("in_dark").notNull().default(false),
    fallen: boolean("fallen").notNull().default(false),
    isCurrentScout: boolean("is_current_scout").notNull().default(false),
    scoreDelta: integer("score_delta").notNull().default(0),
  },
  (t) => ({
    uniqPlayerRound: unique().on(t.roundId, t.playerId),
  })
);

export const stellaReveals = pgTable(
  "stella_reveals",
  {
    id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    scoutId: uuid("scout_id")
      .notNull()
      .references(() => gamePlayers.id, { onDelete: "cascade" }),
    cardId: uuid("card_id")
      .notNull()
      .references(() => cards.id, { onDelete: "cascade" }),
    revealOrder: integer("reveal_order").notNull(),
    outcome: stellaRevealOutcome("outcome").notNull(),
    matchedPlayerIds: jsonb("matched_player_ids").notNull().default(sql`'[]'::jsonb`),
    scoredPlayerIds: jsonb("scored_player_ids").notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    uniqRevealOrder: unique().on(t.roundId, t.revealOrder),
    uniqRevealCard: unique().on(t.roundId, t.cardId),
  })
);

export type Card = typeof cards.$inferSelect;
export type Game = typeof games.$inferSelect;
export type GamePlayer = typeof gamePlayers.$inferSelect;
export type Round = typeof rounds.$inferSelect;
export type RoundSubmission = typeof roundSubmissions.$inferSelect;
export type RoundVote = typeof roundVotes.$inferSelect;
export type StellaRoundCard = typeof stellaRoundCards.$inferSelect;
export type StellaSelection = typeof stellaSelections.$inferSelect;
export type StellaPlayerRound = typeof stellaPlayerRounds.$inferSelect;
export type StellaReveal = typeof stellaReveals.$inferSelect;
