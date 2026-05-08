import type { Browser, APIRequestContext } from "@playwright/test";
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
  req: APIRequestContext;
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

// Cria jogo com N jogadores usando contextos isolados (cookie próprio por contexto)
export async function setupGame(
  browser: Browser,
  { playerCount, mode }: { playerCount: number; mode?: GameMode }
): Promise<GameSession> {
  const players: Player[] = [];

  const hostCtx = await browser.newContext();
  const code = await createGame(hostCtx.request, "J1");
  players.push({ req: hostCtx.request, nickname: "J1" });

  for (let i = 1; i < playerCount; i++) {
    const ctx = await browser.newContext();
    const nickname = `J${i + 1}`;
    await joinGame(ctx.request, code, nickname);
    players.push({ req: ctx.request, nickname });
  }

  if (mode && mode !== "classic") {
    await setMode(players[0].req, code, mode);
  }

  return { code, players };
}

export async function startSession(session: GameSession): Promise<string> {
  return startGame(session.players[0].req, session.code);
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

  await waitForPhase(storyteller.req, code, "clue");

  const stMe = await getMe(storyteller.req, code);
  const roundId = stMe.game.currentRoundId!;
  const cardId = stMe.hand.length > 0 ? stMe.hand[0].id : null;
  await submitClue(storyteller.req, roundId, "dica-auto", cardId);

  await waitForPhase(storyteller.req, code, "submitting");

  for (const p of nonStorytellers) {
    const me = await getMe(p.req, code);
    if (!me.hand.length) throw new Error(`${p.nickname} sem cartas`);
    await submitCard(p.req, roundId, me.hand[0].id);
  }

  await waitForPhase(storyteller.req, code, "voting");

  // Cada não-storyteller vota em uma carta que não seja a sua
  for (const p of nonStorytellers) {
    const { submissions, myPlayerId } = await getSubmissions(p.req, roundId);
    const target = submissions.find((s) => s.playerId !== myPlayerId);
    if (!target) throw new Error(`${p.nickname} sem opções de voto`);
    await castVote(p.req, roundId, target.id);
  }

  // Modo Odyssey (classic 7+ jogadores) — host precisa resolver manualmente
  const gameMode = (await getMe(players[0].req, code)).game.mode;
  if (players.length >= 7 && gameMode === "classic") {
    // Aguarda 1s para dar tempo dos votos primários chegarem e depois resolve
    await new Promise((r) => setTimeout(r, 1000));
    const state = await getRound(players[0].req, code);
    if (state.round?.phase === "voting") {
      await resolveVotes(players[0].req, roundId);
    }
  }

  await waitForPhase(storyteller.req, code, "reveal");

  const result = await nextRound(players[0].req, code);

  const scores: Record<string, number> = {};
  for (const p of players) {
    const me = await getMe(p.req, code);
    if (me.player) scores[p.nickname] = me.player.score;
  }

  return { scores, finished: result.finished };
}
