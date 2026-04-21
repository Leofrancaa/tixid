import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  cards,
  games,
  gamePlayers,
  roundSubmissions,
  roundVotes,
  rounds,
} from "@/lib/db/schema";
import { HAND_SIZE, shuffle } from "./deck";
import { computeScores } from "./scoring";

export class GameError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

async function getGamePlayers(gameId: string) {
  return db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .orderBy(gamePlayers.seatOrder);
}

async function drawNewCardIds(
  gameId: string,
  count: number,
  exclude: string[]
): Promise<string[]> {
  if (count <= 0) return [];
  const rows = await db
    .select({ id: cards.id })
    .from(cards)
    .where(exclude.length ? sql`${cards.id} not in ${exclude}` : sql`true`)
    .orderBy(sql`random()`)
    .limit(count);
  return rows.map((r) => r.id);
}

function allCardsInHands(players: { hand: unknown }[]): string[] {
  const out: string[] = [];
  for (const p of players) {
    const hand = (p.hand as string[]) ?? [];
    for (const id of hand) out.push(id);
  }
  return out;
}

export async function startGame(gameId: string) {
  const players = await getGamePlayers(gameId);
  if (players.length < 3) throw new GameError("NOT_ENOUGH_PLAYERS", "Mín. 3 jogadores");

  const needed = players.length * HAND_SIZE + players.length; // hand + 1 per round buffer
  const totalCards = await db.select({ c: sql<number>`count(*)` }).from(cards);
  const deckSize = Number(totalCards[0]?.c ?? 0);
  if (deckSize < needed)
    throw new GameError(
      "NOT_ENOUGH_CARDS",
      `Deck precisa de ≥ ${needed} cartas (tem ${deckSize})`
    );

  // deal hands
  const drawn = await drawNewCardIds(gameId, players.length * HAND_SIZE, []);
  for (let i = 0; i < players.length; i++) {
    const hand = drawn.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE);
    await db
      .update(gamePlayers)
      .set({ hand })
      .where(eq(gamePlayers.id, players[i].id));
  }

  const storyteller = players[0];
  const [round] = await db
    .insert(rounds)
    .values({
      gameId,
      roundNumber: 1,
      storytellerId: storyteller.id,
      phase: "clue",
    })
    .returning();

  await db
    .update(games)
    .set({ status: "playing", currentRoundId: round.id })
    .where(eq(games.id, gameId));

  return round;
}

export async function submitStorytellerClue(
  roundId: string,
  playerId: string,
  clue: string,
  cardId: string
) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");
  if (round.storytellerId !== playerId)
    throw new GameError("NOT_STORYTELLER", "Só o storyteller pode dar a dica");
  if (round.phase !== "clue") throw new GameError("WRONG_PHASE", "Fase inválida");

  const [player] = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.id, playerId));
  const hand = (player.hand as string[]) ?? [];
  if (!hand.includes(cardId))
    throw new GameError("CARD_NOT_IN_HAND", "Carta não está na mão");

  const newHand = hand.filter((c) => c !== cardId);
  await db
    .update(gamePlayers)
    .set({ hand: newHand })
    .where(eq(gamePlayers.id, playerId));

  // storyteller submission is also stored in round_submissions so voting can reference it
  const [storySub] = await db
    .insert(roundSubmissions)
    .values({ roundId, playerId, cardId })
    .returning();

  await db
    .update(rounds)
    .set({
      clue,
      storytellerCardId: cardId,
      phase: "submitting",
    })
    .where(eq(rounds.id, roundId));

  return storySub;
}

export async function submitCard(roundId: string, playerId: string, cardId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");
  if (round.phase !== "submitting") throw new GameError("WRONG_PHASE", "Fase inválida");
  if (round.storytellerId === playerId)
    throw new GameError("IS_STORYTELLER", "Storyteller já enviou sua carta");

  const [player] = await db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.id, playerId));
  const hand = (player.hand as string[]) ?? [];
  if (!hand.includes(cardId))
    throw new GameError("CARD_NOT_IN_HAND", "Carta não está na mão");

  const newHand = hand.filter((c) => c !== cardId);
  await db
    .update(gamePlayers)
    .set({ hand: newHand })
    .where(eq(gamePlayers.id, playerId));

  await db.insert(roundSubmissions).values({ roundId, playerId, cardId });

  // if all non-storyteller submitted, advance to voting and assign display_order
  const players = await getGamePlayers(round.gameId);
  const nonStory = players.filter((p) => p.id !== round.storytellerId);
  const subs = await db
    .select()
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, roundId));

  if (subs.length === nonStory.length + 1) {
    // +1 because storyteller submission is already there
    const shuffled = shuffle(subs);
    for (let i = 0; i < shuffled.length; i++) {
      await db
        .update(roundSubmissions)
        .set({ displayOrder: i })
        .where(eq(roundSubmissions.id, shuffled[i].id));
    }
    await db.update(rounds).set({ phase: "voting" }).where(eq(rounds.id, roundId));
  }
}

export async function castVote(
  roundId: string,
  voterId: string,
  submissionId: string
) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");
  if (round.phase !== "voting") throw new GameError("WRONG_PHASE", "Fase inválida");
  if (round.storytellerId === voterId)
    throw new GameError("STORYTELLER_CANT_VOTE", "Storyteller não vota");

  const [sub] = await db
    .select()
    .from(roundSubmissions)
    .where(eq(roundSubmissions.id, submissionId));
  if (!sub || sub.roundId !== roundId)
    throw new GameError("BAD_SUBMISSION", "Carta inválida");
  if (sub.playerId === voterId)
    throw new GameError("CANT_VOTE_OWN", "Não pode votar na própria carta");

  await db.insert(roundVotes).values({ roundId, voterId, submissionId });

  // if all non-storyteller voted, resolve
  const players = await getGamePlayers(round.gameId);
  const voters = players.filter((p) => p.id !== round.storytellerId);
  const votes = await db
    .select()
    .from(roundVotes)
    .where(eq(roundVotes.roundId, roundId));

  if (votes.length === voters.length) {
    await resolveRound(roundId);
  }
}

export async function resolveRound(roundId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");

  const players = await getGamePlayers(round.gameId);
  const voters = players.filter((p) => p.id !== round.storytellerId);
  const subs = await db
    .select()
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, roundId));
  const votes = await db
    .select()
    .from(roundVotes)
    .where(eq(roundVotes.roundId, roundId));

  const submissionOwner: Record<string, string> = {};
  let storytellerSubmissionId = "";
  for (const s of subs) {
    submissionOwner[s.id] = s.playerId;
    if (s.playerId === round.storytellerId) storytellerSubmissionId = s.id;
  }
  const votesMap: Record<string, string> = {};
  for (const v of votes) votesMap[v.voterId] = v.submissionId;

  const delta = computeScores({
    storytellerId: round.storytellerId,
    submissionOwner,
    storytellerSubmissionId,
    votes: votesMap,
    voterIds: voters.map((v) => v.id),
  });

  // apply scores
  for (const [pid, d] of Object.entries(delta)) {
    if (!d) continue;
    await db
      .update(gamePlayers)
      .set({ score: sql`${gamePlayers.score} + ${d}` })
      .where(eq(gamePlayers.id, pid));
  }

  await db
    .update(rounds)
    .set({ phase: "reveal", endedAt: new Date() })
    .where(eq(rounds.id, roundId));
}

export async function nextRound(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) throw new GameError("GAME_NOT_FOUND", "Jogo não encontrado");
  if (!game.currentRoundId) throw new GameError("NO_ROUND", "Sem rodada atual");

  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.id, game.currentRoundId));
  if (round.phase !== "reveal")
    throw new GameError("WRONG_PHASE", "Rodada ainda não foi revelada");

  // refill hands
  const players = await getGamePlayers(gameId);
  const excluded = allCardsInHands(players);
  for (const p of players) {
    const hand = (p.hand as string[]) ?? [];
    const needed = HAND_SIZE - hand.length;
    if (needed > 0) {
      const drawn = await drawNewCardIds(gameId, needed, excluded);
      excluded.push(...drawn);
      await db
        .update(gamePlayers)
        .set({ hand: [...hand, ...drawn] })
        .where(eq(gamePlayers.id, p.id));
    }
  }

  // check end of game
  const maxScore = Math.max(...players.map((p) => p.score));
  if (maxScore >= game.targetScore) {
    await db
      .update(games)
      .set({ status: "finished" })
      .where(eq(games.id, gameId));
    await db
      .update(rounds)
      .set({ phase: "finished" })
      .where(eq(rounds.id, round.id));
    return { finished: true as const };
  }

  // rotate storyteller
  const currentIdx = players.findIndex((p) => p.id === round.storytellerId);
  const nextStoryteller = players[(currentIdx + 1) % players.length];

  const [newRound] = await db
    .insert(rounds)
    .values({
      gameId,
      roundNumber: round.roundNumber + 1,
      storytellerId: nextStoryteller.id,
      phase: "clue",
    })
    .returning();

  await db
    .update(games)
    .set({ currentRoundId: newRound.id })
    .where(eq(games.id, gameId));

  return { finished: false as const, round: newRound };
}

// Exported for reuse by /me route
export { getGamePlayers };
