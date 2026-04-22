import { and, eq, sql } from "drizzle-orm";
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

async function initQueue(gameId: string): Promise<string[]> {
  const allCards = await db.select({ id: cards.id }).from(cards);
  const shuffled = shuffle(allCards.map((r) => r.id));
  await db.update(games).set({ cardQueue: shuffled }).where(eq(games.id, gameId));
  return shuffled;
}

async function returnToQueue(gameId: string, cardIds: string[]): Promise<string[]> {
  const [game] = await db
    .select({ cardQueue: games.cardQueue })
    .from(games)
    .where(eq(games.id, gameId));
  const queue = (game?.cardQueue as string[]) ?? [];
  const newQueue = [...queue, ...cardIds];
  await db.update(games).set({ cardQueue: newQueue }).where(eq(games.id, gameId));
  return newQueue;
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

  const needed = players.length * HAND_SIZE;
  const totalCards = await db.select({ c: sql<number>`count(*)` }).from(cards);
  const deckSize = Number(totalCards[0]?.c ?? 0);
  if (deckSize < needed)
    throw new GameError(
      "NOT_ENOUGH_CARDS",
      `Deck precisa de ≥ ${needed} cartas (tem ${deckSize})`
    );

  const queue = await initQueue(gameId);

  for (let i = 0; i < players.length; i++) {
    const hand = queue.slice(i * HAND_SIZE, (i + 1) * HAND_SIZE);
    await db
      .update(gamePlayers)
      .set({ hand })
      .where(eq(gamePlayers.id, players[i].id));
  }
  await db
    .update(games)
    .set({ cardQueue: queue.slice(players.length * HAND_SIZE) })
    .where(eq(games.id, gameId));

  const storyteller = players[0];
  const [round] = await db
    .insert(rounds)
    .values({ gameId, roundNumber: 1, storytellerId: storyteller.id, phase: "clue" })
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

  await db
    .update(gamePlayers)
    .set({ hand: hand.filter((c) => c !== cardId) })
    .where(eq(gamePlayers.id, playerId));

  const [storySub] = await db
    .insert(roundSubmissions)
    .values({ roundId, playerId, cardId })
    .returning();

  await db
    .update(rounds)
    .set({ clue, storytellerCardId: cardId, phase: "submitting" })
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

  await db
    .update(gamePlayers)
    .set({ hand: hand.filter((c) => c !== cardId) })
    .where(eq(gamePlayers.id, playerId));

  await db.insert(roundSubmissions).values({ roundId, playerId, cardId });

  const players = await getGamePlayers(round.gameId);
  const nonStory = players.filter((p) => p.id !== round.storytellerId);
  const subs = await db
    .select()
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, roundId));

  if (subs.length === nonStory.length + 1) {
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
  submissionId: string,
  isSecondary = false
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

  const players = await getGamePlayers(round.gameId);
  const voters = players.filter((p) => p.id !== round.storytellerId);

  // Secondary votes only available for 7+ player games
  if (isSecondary && voters.length < 6)
    throw new GameError("NO_SECONDARY", "Voto secundário só disponível com 7+ jogadores");

  // Fetch existing votes from this voter to enforce constraints
  const myExistingVotes = await db
    .select()
    .from(roundVotes)
    .where(and(eq(roundVotes.roundId, roundId), eq(roundVotes.voterId, voterId)));

  const myPrimary = myExistingVotes.find((v) => !v.isSecondary);
  const mySecondary = myExistingVotes.find((v) => v.isSecondary);

  if (!isSecondary && myPrimary)
    throw new GameError("ALREADY_VOTED", "Você já votou com o voto principal");
  if (isSecondary && mySecondary)
    throw new GameError("ALREADY_SECONDARY", "Você já usou seu voto secundário");
  if (isSecondary && myPrimary && myPrimary.submissionId === submissionId)
    throw new GameError("SAME_AS_PRIMARY", "Voto secundário deve ser em carta diferente do voto principal");

  await db.insert(roundVotes).values({ roundId, voterId, submissionId, isSecondary });

  // For ≤5 voters (≤6 players, non-Odyssey): auto-resolve when all primary votes are in
  // For 6+ voters (7+ players, Odyssey mode): host manually triggers reveal so everyone
  // has a chance to cast their optional secondary vote
  if (voters.length < 6) {
    const allVotes = await db
      .select()
      .from(roundVotes)
      .where(eq(roundVotes.roundId, roundId));
    const primaryVotes = allVotes.filter((v) => !v.isSecondary);
    if (primaryVotes.length === voters.length) {
      await resolveRound(roundId);
    }
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
  const primaryVotesMap: Record<string, string> = {};
  const secondaryVotesMap: Record<string, string> = {};
  for (const v of votes) {
    if (v.isSecondary) secondaryVotesMap[v.voterId] = v.submissionId;
    else primaryVotesMap[v.voterId] = v.submissionId;
  }

  const delta = computeScores({
    storytellerId: round.storytellerId,
    submissionOwner,
    storytellerSubmissionId,
    primaryVotes: primaryVotesMap,
    secondaryVotes: secondaryVotesMap,
    voterIds: voters.map((v) => v.id),
    maxPointsPerRound: 5,
  });

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

  // Return cards played this round to back of queue
  const usedSubs = await db
    .select({ cardId: roundSubmissions.cardId })
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, round.id));
  const updatedQueue = await returnToQueue(gameId, usedSubs.map((s) => s.cardId));

  // Check end of game
  const players = await getGamePlayers(gameId);
  const maxScore = Math.max(...players.map((p) => p.score));
  if (maxScore >= game.targetScore) {
    await db.update(games).set({ status: "finished" }).where(eq(games.id, gameId));
    await db.update(rounds).set({ phase: "finished" }).where(eq(rounds.id, round.id));
    return { finished: true as const };
  }

  // Refill hands from front of queue
  let queuePos = 0;
  for (const p of players) {
    const hand = (p.hand as string[]) ?? [];
    const needed = HAND_SIZE - hand.length;
    if (needed > 0) {
      const drawn = updatedQueue.slice(queuePos, queuePos + needed);
      queuePos += needed;
      await db
        .update(gamePlayers)
        .set({ hand: [...hand, ...drawn] })
        .where(eq(gamePlayers.id, p.id));
    }
  }
  await db
    .update(games)
    .set({ cardQueue: updatedQueue.slice(queuePos) })
    .where(eq(games.id, gameId));

  // Rotate storyteller
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

export { getGamePlayers };
