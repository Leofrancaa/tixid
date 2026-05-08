import { PlayerClient } from "./playerClient";
import {
  createGame,
  joinGame,
  setMode,
  getMe,
  getRound,
  submitClue,
  submitCard,
  getSubmissions,
  castVote,
  resolveVotes,
  nextRound,
  waitForPhase,
  startGame,
} from "./api";

type GameMode = "classic" | "questions" | "stella";

export interface Player {
  client: PlayerClient;
  nickname: string;
}

export interface GameSession {
  code: string;
  players: Player[];
  // Storyteller na rodada N → players[N % players.length]
}

export interface RoundResult {
  scores: Record<string, number>;
  finished: boolean;
}

// Cria jogo com N jogadores — cada PlayerClient tem cookie jar próprio
export async function setupGame(
  { playerCount, mode }: { playerCount: number; mode?: GameMode }
): Promise<GameSession> {
  const players: Player[] = [];

  const host = new PlayerClient("J1");
  const code = await createGame(host, "J1");
  players.push({ client: host, nickname: "J1" });

  for (let i = 1; i < playerCount; i++) {
    const nickname = `J${i + 1}`;
    const p = new PlayerClient(nickname);
    await joinGame(p, code, nickname);
    players.push({ client: p, nickname });
  }

  if (mode && mode !== "classic") {
    await setMode(players[0].client, code, mode);
  }

  return { code, players };
}

export async function startSession(session: GameSession): Promise<string> {
  return startGame(session.players[0].client, session.code);
}

// Executa uma rodada completa (classic ou questions).
// roundIdx define qual jogador é o storyteller (rotação por seatOrder).
export async function playOneRound(
  session: GameSession,
  roundIdx: number
): Promise<RoundResult> {
  const { code, players } = session;
  const stIdx = roundIdx % players.length;
  const storyteller = players[stIdx];
  const nonStorytellers = players.filter((_, i) => i !== stIdx);

  await waitForPhase(storyteller.client, code, "clue");

  const stMe = await getMe(storyteller.client, code);
  const roundId = stMe.game.currentRoundId!;
  const cardId = stMe.hand.length > 0 ? stMe.hand[0].id : null;
  await submitClue(storyteller.client, roundId, "dica-auto", cardId);

  await waitForPhase(storyteller.client, code, "submitting");

  for (const p of nonStorytellers) {
    const me = await getMe(p.client, code);
    if (!me.hand.length) throw new Error(`${p.nickname} sem cartas`);
    await submitCard(p.client, roundId, me.hand[0].id);
  }

  await waitForPhase(storyteller.client, code, "voting");

  // Cada não-storyteller vota em uma carta que não seja a sua
  for (const p of nonStorytellers) {
    const { submissions, myPlayerId } = await getSubmissions(p.client, roundId);
    const target = submissions.find((s) => s.playerId !== myPlayerId);
    if (!target) throw new Error(`${p.nickname} sem opções de voto`);
    await castVote(p.client, roundId, target.id);
  }

  // Odyssey (classic 7+ jogadores) — host precisa resolver manualmente
  const gameMode = (await getMe(players[0].client, code)).game.mode;
  if (players.length >= 7 && gameMode === "classic") {
    await new Promise((r) => setTimeout(r, 1000));
    const state = await getRound(players[0].client, code);
    if (state.round?.phase === "voting") {
      await resolveVotes(players[0].client, roundId);
    }
  }

  await waitForPhase(storyteller.client, code, "reveal");

  const result = await nextRound(players[0].client, code);

  const scores: Record<string, number> = {};
  for (const p of players) {
    const me = await getMe(p.client, code);
    if (me.player) scores[p.nickname] = me.player.score;
  }

  return { scores, finished: result.finished };
}
