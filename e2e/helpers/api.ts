import type { APIRequestContext } from "@playwright/test";

type GameMode = "classic" | "questions" | "stella";

export interface MeData {
  player: { id: string; nickname: string; score: number; isHost: boolean } | null;
  hand: { id: string; kind: string; value: string }[];
  game: { id: string; status: string; mode: GameMode; currentRoundId: string | null };
}

export interface RoundState {
  round: {
    id: string;
    phase: string;
    roundNumber: number;
    storytellerId: string;
    clue: string | null;
  } | null;
  gameStatus: string;
  myPlayerId: string;
}

export interface Submission {
  id: string;
  playerId: string;
  displayOrder: number | null;
}

export async function createGame(req: APIRequestContext, nickname: string): Promise<string> {
  const res = await req.post("/api/games", { data: { nickname } });
  if (!res.ok()) throw new Error(`createGame failed: ${await res.text()}`);
  return ((await res.json()) as { code: string }).code;
}

export async function joinGame(req: APIRequestContext, code: string, nickname: string) {
  const res = await req.post(`/api/games/${code}/join`, { data: { nickname } });
  if (!res.ok()) throw new Error(`joinGame (${nickname}) failed: ${await res.text()}`);
}

export async function setMode(req: APIRequestContext, code: string, mode: GameMode) {
  const res = await req.patch(`/api/games/${code}/mode`, { data: { mode } });
  if (!res.ok()) throw new Error(`setMode failed: ${await res.text()}`);
}

export async function startGame(req: APIRequestContext, code: string): Promise<string> {
  const res = await req.post(`/api/games/${code}/start`);
  if (!res.ok()) throw new Error(`startGame failed: ${await res.text()}`);
  return ((await res.json()) as { roundId: string }).roundId;
}

export async function getMe(req: APIRequestContext, code: string): Promise<MeData> {
  const res = await req.get(`/api/games/${code}/me`);
  if (!res.ok()) throw new Error(`getMe failed: ${await res.text()}`);
  return res.json();
}

export async function getRound(req: APIRequestContext, code: string): Promise<RoundState> {
  const res = await req.get(`/api/games/${code}/round`);
  if (!res.ok()) throw new Error(`getRound failed: ${await res.text()}`);
  return res.json();
}

export async function submitClue(
  req: APIRequestContext,
  roundId: string,
  clue: string,
  cardId: string | null
) {
  const res = await req.post(`/api/rounds/${roundId}/clue`, { data: { clue, cardId } });
  if (!res.ok()) throw new Error(`submitClue failed: ${await res.text()}`);
}

export async function submitCard(req: APIRequestContext, roundId: string, cardId: string) {
  const res = await req.post(`/api/rounds/${roundId}/submit`, { data: { cardId } });
  if (!res.ok()) throw new Error(`submitCard failed: ${await res.text()}`);
  return ((await res.json()) as { submissionId: string | null }).submissionId;
}

export async function getSubmissions(
  req: APIRequestContext,
  roundId: string
): Promise<{ submissions: Submission[]; myPlayerId: string }> {
  const res = await req.get(`/api/rounds/${roundId}/submissions`);
  if (!res.ok()) throw new Error(`getSubmissions failed: ${await res.text()}`);
  return res.json();
}

export async function castVote(
  req: APIRequestContext,
  roundId: string,
  submissionId: string,
  isSecondary = false
) {
  const res = await req.post(`/api/rounds/${roundId}/vote`, {
    data: { submissionId, isSecondary },
  });
  if (!res.ok()) throw new Error(`castVote failed: ${await res.text()}`);
}

export async function resolveVotes(req: APIRequestContext, roundId: string) {
  const res = await req.post(`/api/rounds/${roundId}/resolve`);
  if (!res.ok()) throw new Error(`resolveVotes failed: ${await res.text()}`);
}

export async function nextRound(
  req: APIRequestContext,
  code: string
): Promise<{ finished: boolean }> {
  const res = await req.post(`/api/games/${code}/next`);
  if (!res.ok()) throw new Error(`nextRound failed: ${await res.text()}`);
  return res.json();
}

export async function waitForPhase(
  req: APIRequestContext,
  code: string,
  phase: string,
  { timeoutMs = 10_000 } = {}
): Promise<RoundState> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await getRound(req, code);
    if (state.round?.phase === phase) return state;
    await new Promise((r) => setTimeout(r, 250));
  }
  const state = await getRound(req, code);
  throw new Error(`waitForPhase("${phase}") timed out — atual: ${state.round?.phase}`);
}

export async function waitForGameStatus(
  req: APIRequestContext,
  code: string,
  status: string,
  { timeoutMs = 10_000 } = {}
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const state = await getRound(req, code);
    if (state.gameStatus === status) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`waitForGameStatus("${status}") timed out`);
}
