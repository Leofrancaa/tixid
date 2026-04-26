import { and, eq, sql } from "drizzle-orm";
import { db } from "@/lib/db/client";
import {
  cards,
  games,
  gamePlayers,
  questions,
  roundSubmissions,
  roundVotes,
  rounds,
  stellaPlayerRounds,
  stellaReveals,
  stellaRoundCards,
  stellaSelections,
} from "@/lib/db/schema";
import { HAND_SIZE, shuffle } from "./deck";
import { computeScores, isStellaFinalRound } from "./scoring";

export type GameMode = "classic" | "questions" | "stella";

export class GameError extends Error {
  constructor(public code: string, message: string) {
    super(message);
  }
}

const STELLA_GRID_SIZE = 15;
const STELLA_ROW_SIZE = 5;
const STELLA_TOTAL_ROUNDS = 4;
const STELLA_MIN_SELECTIONS = 1;
const STELLA_MAX_SELECTIONS = 10;

async function getGamePlayers(gameId: string) {
  return db
    .select()
    .from(gamePlayers)
    .where(eq(gamePlayers.gameId, gameId))
    .orderBy(gamePlayers.seatOrder);
}

async function getDeckIds(mode: GameMode): Promise<string[]> {
  if (mode === "questions") {
    const rows = await db.select({ id: questions.id }).from(questions);
    return rows.map((r) => r.id);
  }
  // classic and stella both use the image card deck
  const rows = await db.select({ id: cards.id }).from(cards);
  return rows.map((r) => r.id);
}

async function initQueue(gameId: string, mode: GameMode): Promise<string[]> {
  const ids = await getDeckIds(mode);
  const shuffled = shuffle(ids);
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

async function initStellaRound(
  roundId: string,
  players: Awaited<ReturnType<typeof getGamePlayers>>,
  gridCardIds: string[]
) {
  await db.insert(stellaRoundCards).values(
    gridCardIds.map((cardId, position) => ({ roundId, cardId, position }))
  );
  await db.insert(stellaPlayerRounds).values(
    players.map((player) => ({ roundId, playerId: player.id }))
  );
}

async function getStellaRoundGrid(roundId: string) {
  return db
    .select()
    .from(stellaRoundCards)
    .where(eq(stellaRoundCards.roundId, roundId))
    .orderBy(stellaRoundCards.position);
}

async function getStellaSelectionMap(roundId: string) {
  const rows = await db
    .select()
    .from(stellaSelections)
    .where(eq(stellaSelections.roundId, roundId));
  const map: Record<string, string[]> = {};
  for (const row of rows) {
    map[row.playerId] ??= [];
    map[row.playerId].push(row.cardId);
  }
  return map;
}

function findNextStellaScout({
  players,
  playerRounds,
  selectionMap,
  revealedCardIds,
  afterPlayerId,
}: {
  players: Awaited<ReturnType<typeof getGamePlayers>>;
  playerRounds: { playerId: string; fallen: boolean }[];
  selectionMap: Record<string, string[]>;
  revealedCardIds: Set<string>;
  afterPlayerId: string;
}) {
  const fallenByPlayer = new Map(playerRounds.map((row) => [row.playerId, row.fallen]));
  const startIdx = players.findIndex((p) => p.id === afterPlayerId);
  if (startIdx < 0) return null;

  for (let offset = 1; offset <= players.length; offset++) {
    const player = players[(startIdx + offset) % players.length];
    if (fallenByPlayer.get(player.id)) continue;
    const hasUnrevealedSelection = (selectionMap[player.id] ?? []).some(
      (cardId) => !revealedCardIds.has(cardId)
    );
    if (hasUnrevealedSelection) return player.id;
  }

  return null;
}

export async function startGame(gameId: string) {
  const [game] = await db.select().from(games).where(eq(games.id, gameId));
  if (!game) throw new GameError("GAME_NOT_FOUND", "Jogo não encontrado");

  const players = await getGamePlayers(gameId);
  if (players.length < 3) throw new GameError("NOT_ENOUGH_PLAYERS", "Mín. 3 jogadores");

  const needed =
    game.mode === "stella"
      ? STELLA_GRID_SIZE + STELLA_ROW_SIZE * (STELLA_TOTAL_ROUNDS - 1)
      : players.length * HAND_SIZE;
  const deckIds = await getDeckIds(game.mode);
  if (deckIds.length < needed) {
    const label = game.mode === "questions" ? "perguntas" : "cartas";
    throw new GameError(
      "NOT_ENOUGH_CARDS",
      `Deck precisa de ≥ ${needed} ${label} (tem ${deckIds.length})`
    );
  }

  const queue = await initQueue(gameId, game.mode);
  const storyteller = players[0];
  const [round] = await db
    .insert(rounds)
    .values({ gameId, roundNumber: 1, storytellerId: storyteller.id, phase: "clue" })
    .returning();

  if (game.mode === "stella") {
    await initStellaRound(round.id, players, queue.slice(0, STELLA_GRID_SIZE));
    await db
      .update(games)
      .set({ cardQueue: queue.slice(STELLA_GRID_SIZE) })
      .where(eq(games.id, gameId));
  } else {
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
  }

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
  cardId: string | null
) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");
  if (round.storytellerId !== playerId)
    throw new GameError("NOT_STORYTELLER", "Só o storyteller pode dar a dica");
  if (round.phase !== "clue") throw new GameError("WRONG_PHASE", "Fase inválida");

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const isStella = game.mode === "stella";

  if (isStella) {
    // Stella: storyteller só define o tema; não escolhe carta agora.
    await db
      .update(rounds)
      .set({ clue, phase: "submitting" })
      .where(eq(rounds.id, roundId));
    return null;
  }

  if (!cardId) throw new GameError("NO_CARD", "Escolha uma carta");

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

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const isStella = game.mode === "stella";
  if (isStella)
    throw new GameError("STELLA_ONLY", "Use a seleÃ§Ã£o Stella nesta rodada");

  // In classic/questions, storyteller already submitted their card during clue.
  if (!isStella && round.storytellerId === playerId)
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
  const expected = isStella ? players.length : players.length; // every player has 1 sub by end
  // Classic: storyteller submitted in clue → expected = nonStoryCount + 1 = players.length
  // Stella : everyone submits in this phase                       → expected = players.length
  const subs = await db
    .select()
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, roundId));

  if (subs.length === expected) {
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

export async function submitStellaSelection(
  roundId: string,
  playerId: string,
  cardIds: string[]
) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada nÃ£o encontrada");
  if (round.phase !== "submitting") throw new GameError("WRONG_PHASE", "Fase invÃ¡lida");

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  if (game.mode !== "stella")
    throw new GameError("NOT_STELLA", "Rodada nÃ£o Ã© Stella");

  const players = await getGamePlayers(round.gameId);
  if (!players.some((p) => p.id === playerId))
    throw new GameError("NOT_PLAYER", "Jogador invÃ¡lido");

  const uniqueCardIds = [...new Set(cardIds)];
  if (
    uniqueCardIds.length < STELLA_MIN_SELECTIONS ||
    uniqueCardIds.length > STELLA_MAX_SELECTIONS
  ) {
    throw new GameError("BAD_SELECTION_COUNT", "Escolha de 1 a 10 cartas");
  }

  const grid = await getStellaRoundGrid(roundId);
  const gridIds = new Set(grid.map((c) => c.cardId));
  if (uniqueCardIds.some((id) => !gridIds.has(id)))
    throw new GameError("CARD_NOT_IN_GRID", "Carta fora da grade Stella");

  const [publicState] = await db
    .select()
    .from(stellaPlayerRounds)
    .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, playerId)));
  if (!publicState)
    throw new GameError("PLAYER_STATE_NOT_FOUND", "Estado Stella nÃ£o encontrado");
  if (publicState.submittedAt)
    throw new GameError("ALREADY_SUBMITTED", "VocÃª jÃ¡ enviou suas escolhas");

  await db.insert(stellaSelections).values(
    uniqueCardIds.map((cardId) => ({ roundId, playerId, cardId }))
  );
  await db
    .update(stellaPlayerRounds)
    .set({ submittedAt: new Date() })
    .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, playerId)));

  const publicRows = await db
    .select()
    .from(stellaPlayerRounds)
    .where(eq(stellaPlayerRounds.roundId, roundId));
  const allSubmitted = publicRows.every((row) =>
    row.playerId === playerId ? true : !!row.submittedAt
  );
  if (!allSubmitted) return;

  const selectionMap = await getStellaSelectionMap(roundId);
  const counts = players.map((p) => ({
    playerId: p.id,
    count: selectionMap[p.id]?.length ?? 0,
  }));
  const maxCount = Math.max(...counts.map((c) => c.count));
  const leaders = counts.filter((c) => c.count === maxCount);
  const darkPlayerId = leaders.length === 1 ? leaders[0].playerId : null;

  for (const row of counts) {
    await db
      .update(stellaPlayerRounds)
      .set({
        selectionCount: row.count,
        inDark: row.playerId === darkPlayerId,
        isCurrentScout: row.playerId === round.storytellerId,
      })
      .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, row.playerId)));
  }

  await db.update(rounds).set({ phase: "voting" }).where(eq(rounds.id, roundId));
}

async function finishStellaReveal(roundId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada nÃ£o encontrada");

  const playerRows = await db
    .select()
    .from(stellaPlayerRounds)
    .where(eq(stellaPlayerRounds.roundId, roundId));
  const reveals = await db
    .select()
    .from(stellaReveals)
    .where(eq(stellaReveals.roundId, roundId))
    .orderBy(stellaReveals.revealOrder);

  for (const row of playerRows) {
    let finalDelta = row.scoreDelta;
    if (row.inDark && row.fallen) {
      const scoredEvents = reveals.filter((reveal) =>
        ((reveal.scoredPlayerIds as string[]) ?? []).includes(row.playerId)
      ).length;
      finalDelta = Math.max(0, finalDelta - scoredEvents);
      if (finalDelta !== row.scoreDelta) {
        await db
          .update(stellaPlayerRounds)
          .set({ scoreDelta: finalDelta })
          .where(eq(stellaPlayerRounds.id, row.id));
      }
    }

    if (finalDelta > 0) {
      await db
        .update(gamePlayers)
        .set({ score: sql`${gamePlayers.score} + ${finalDelta}` })
        .where(eq(gamePlayers.id, row.playerId));
    }
  }

  await db
    .update(stellaPlayerRounds)
    .set({ isCurrentScout: false })
    .where(eq(stellaPlayerRounds.roundId, roundId));
  await db
    .update(rounds)
    .set({ phase: "reveal", endedAt: new Date() })
    .where(eq(rounds.id, roundId));
}

export async function revealStellaCard(roundId: string, playerId: string, cardId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada nÃ£o encontrada");
  if (round.phase !== "voting") throw new GameError("WRONG_PHASE", "Fase invÃ¡lida");

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  if (game.mode !== "stella")
    throw new GameError("NOT_STELLA", "Rodada nÃ£o Ã© Stella");

  const [currentState] = await db
    .select()
    .from(stellaPlayerRounds)
    .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, playerId)));
  if (!currentState?.isCurrentScout)
    throw new GameError("NOT_SCOUT", "Aguarde sua vez de revelar");
  if (currentState.fallen)
    throw new GameError("SCOUT_FALLEN", "Jogador jÃ¡ caiu nesta rodada");

  const grid = await getStellaRoundGrid(roundId);
  if (!grid.some((c) => c.cardId === cardId))
    throw new GameError("CARD_NOT_IN_GRID", "Carta fora da grade Stella");

  const revealedRows = await db
    .select()
    .from(stellaReveals)
    .where(eq(stellaReveals.roundId, roundId))
    .orderBy(stellaReveals.revealOrder);
  if (revealedRows.some((row) => row.cardId === cardId))
    throw new GameError("ALREADY_REVEALED", "Carta jÃ¡ revelada");

  const selectionMap = await getStellaSelectionMap(roundId);
  if (!(selectionMap[playerId] ?? []).includes(cardId))
    throw new GameError("CARD_NOT_SELECTED", "Revele uma carta que vocÃª marcou");

  const players = await getGamePlayers(round.gameId);
  const playerRows = await db
    .select()
    .from(stellaPlayerRounds)
    .where(eq(stellaPlayerRounds.roundId, roundId));
  const fallenBefore = new Map(playerRows.map((row) => [row.playerId, row.fallen]));
  const selectedPlayerIds = players
    .map((p) => p.id)
    .filter((pid) => (selectionMap[pid] ?? []).includes(cardId));
  const matchedPlayerIds = selectedPlayerIds.filter((pid) => pid !== playerId);
  const outcome =
    matchedPlayerIds.length === 0
      ? "fall"
      : matchedPlayerIds.length === 1
        ? "super"
        : "spark";
  const points = outcome === "super" ? 3 : outcome === "spark" ? 2 : 0;
  const scoredPlayerIds =
    points > 0 ? selectedPlayerIds.filter((pid) => !fallenBefore.get(pid)) : [];

  await db.insert(stellaReveals).values({
    roundId,
    scoutId: playerId,
    cardId,
    revealOrder: revealedRows.length + 1,
    outcome,
    matchedPlayerIds,
    scoredPlayerIds,
  });

  if (outcome === "fall") {
    await db
      .update(stellaPlayerRounds)
      .set({ fallen: true })
      .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, playerId)));
  } else {
    for (const scoredPlayerId of scoredPlayerIds) {
      await db
        .update(stellaPlayerRounds)
        .set({ scoreDelta: sql`${stellaPlayerRounds.scoreDelta} + ${points}` })
        .where(
          and(
            eq(stellaPlayerRounds.roundId, roundId),
            eq(stellaPlayerRounds.playerId, scoredPlayerId)
          )
        );
    }
  }

  const updatedPlayerRows = playerRows.map((row) =>
    row.playerId === playerId && outcome === "fall"
      ? { ...row, fallen: true }
      : row
  );
  const revealedCardIds = new Set([...revealedRows.map((row) => row.cardId), cardId]);
  const nextScoutId = findNextStellaScout({
    players,
    playerRounds: updatedPlayerRows,
    selectionMap,
    revealedCardIds,
    afterPlayerId: playerId,
  });

  await db
    .update(stellaPlayerRounds)
    .set({ isCurrentScout: false })
    .where(eq(stellaPlayerRounds.roundId, roundId));

  if (!nextScoutId) {
    await finishStellaReveal(roundId);
    return;
  }

  await db
    .update(stellaPlayerRounds)
    .set({ isCurrentScout: true })
    .where(and(eq(stellaPlayerRounds.roundId, roundId), eq(stellaPlayerRounds.playerId, nextScoutId)));
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

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const isStella = game.mode === "stella";
  const isQuestions = game.mode === "questions";
  if (isStella)
    throw new GameError("STELLA_ONLY", "Use a revelacao Stella nesta rodada");
  const odysseyAllowed = !isStella && !isQuestions; // Odyssey só no modo clássico

  // In classic/questions, storyteller doesn't vote. In stella, everyone votes.
  if (!isStella && round.storytellerId === voterId)
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
  const eligibleVoters = isStella
    ? players
    : players.filter((p) => p.id !== round.storytellerId);

  if (isSecondary) {
    if (!odysseyAllowed)
      throw new GameError("NO_SECONDARY", "Modo atual não tem voto secundário");
    if (eligibleVoters.length < 6)
      throw new GameError("NO_SECONDARY", "Voto secundário só disponível com 7+ jogadores");
  }

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

  // Auto-resolve thresholds:
  //   stella                       → resolve quando todos votaram
  //   questions                    → resolve quando todos os primários in (sem Odyssey)
  //   classic ≤6 voters            → resolve quando todos os primários in
  //   classic 7+ voters (Odyssey)  → host aciona manualmente
  if (!odysseyAllowed || eligibleVoters.length < 6) {
    const allVotes = await db
      .select()
      .from(roundVotes)
      .where(eq(roundVotes.roundId, roundId));
    const primaryVotes = allVotes.filter((v) => !v.isSecondary);
    if (primaryVotes.length === eligibleVoters.length) {
      await resolveRound(roundId);
    }
  }
}

export async function resolveRound(roundId: string) {
  const [round] = await db.select().from(rounds).where(eq(rounds.id, roundId));
  if (!round) throw new GameError("ROUND_NOT_FOUND", "Rodada não encontrada");

  const [game] = await db.select().from(games).where(eq(games.id, round.gameId));
  const isStella = game.mode === "stella";
  if (isStella) {
    await finishStellaReveal(roundId);
    return;
  }

  const players = await getGamePlayers(round.gameId);
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

  const voters = players.filter((p) => p.id !== round.storytellerId);
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

  const players = await getGamePlayers(gameId);

  if (game.mode === "stella") {
    if (isStellaFinalRound(round.roundNumber)) {
      await db.update(games).set({ status: "finished" }).where(eq(games.id, gameId));
      await db.update(rounds).set({ phase: "finished" }).where(eq(rounds.id, round.id));
      return { finished: true as const };
    }

    const currentGrid = await getStellaRoundGrid(round.id);
    const queue = (game.cardQueue as string[]) ?? [];
    if (queue.length < STELLA_ROW_SIZE) {
      throw new GameError("NOT_ENOUGH_CARDS", "Deck Stella sem cartas para a proxima rodada");
    }

    const rowStart = ((round.roundNumber - 1) % 3) * STELLA_ROW_SIZE;
    const nextGrid = currentGrid.map((row) => row.cardId);
    const replacements = queue.slice(0, STELLA_ROW_SIZE);
    for (let i = 0; i < STELLA_ROW_SIZE; i++) {
      nextGrid[rowStart + i] = replacements[i];
    }

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

    await initStellaRound(newRound.id, players, nextGrid);
    await db
      .update(games)
      .set({ currentRoundId: newRound.id, cardQueue: queue.slice(STELLA_ROW_SIZE) })
      .where(eq(games.id, gameId));

    return { finished: false as const, round: newRound };
  }

  // Return cards played this round to back of queue
  const usedSubs = await db
    .select({ cardId: roundSubmissions.cardId })
    .from(roundSubmissions)
    .where(eq(roundSubmissions.roundId, round.id));
  const updatedQueue = await returnToQueue(gameId, usedSubs.map((s) => s.cardId));

  // Check end of game
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
