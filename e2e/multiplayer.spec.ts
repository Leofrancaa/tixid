/**
 * Testes E2E multi-jogador — API only (sem browser).
 *
 * Pré-requisito: servidor rodando em http://localhost:3000 (npm run dev ou npm start)
 * com banco de dados configurado e seed de cartas/perguntas aplicado.
 *
 * Execução:  npm run test:e2e
 */
import { test, expect } from "@playwright/test";
import { setupGame, startSession, playOneRound } from "./helpers/multiPlayer";
import { getMe, getRound, waitForPhase } from "./helpers/api";
import {
  submitClue,
  submitCard,
  castVote,
  getSubmissions,
} from "./helpers/api";

// ─── Helpers ────────────────────────────────────────────────────────────────

function expectPositiveScores(scores: Record<string, number>, nicknames: string[]) {
  const total = nicknames.reduce((s, p) => s + (scores[p] ?? 0), 0);
  expect(total).toBeGreaterThan(0);
}

// ─── 3 jogadores — modo clássico ────────────────────────────────────────────

test("3 jogadores classic — rodada completa distribui pontos", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 3 });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

test("3 jogadores classic — duas rodadas, storyteller rotaciona", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 3 });
  await startSession(session);

  const round1 = await getRound(session.players[0].req, session.code);
  expect(round1.round?.roundNumber).toBe(1);

  const { scores: s1 } = await playOneRound(session, 0);
  expectPositiveScores(s1, session.players.map((p) => p.nickname));

  const round2 = await getRound(session.players[0].req, session.code);
  expect(round2.round?.roundNumber).toBe(2);

  const { scores: s2 } = await playOneRound(session, 1);
  expectPositiveScores(s2, session.players.map((p) => p.nickname));
});

// ─── 3 jogadores — modo perguntas ───────────────────────────────────────────

test("3 jogadores questions — rodada completa distribui pontos", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 3, mode: "questions" });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

// ─── 7 jogadores — modo perguntas (bug reportado: não iniciava) ──────────────

test("7 jogadores questions — partida inicia e completa rodada", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 7, mode: "questions" });
  await startSession(session);

  const state = await getRound(session.players[0].req, session.code);
  expect(state.gameStatus).toBe("playing");
  expect(state.round?.phase).toBe("clue");

  const { scores } = await playOneRound(session, 0);

  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThan(0);
});

// ─── 7 jogadores — modo clássico (Odyssey) ──────────────────────────────────

test("7 jogadores classic (Odyssey) — host resolve e pontuação é correta", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 7 });
  await startSession(session);

  const state = await getRound(session.players[0].req, session.code);
  expect(state.gameStatus).toBe("playing");

  const { scores } = await playOneRound(session, 0);

  expect(Object.keys(scores).length).toBe(7);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThan(0);
});

// ─── Votação — erro em voto duplicado ────────────────────────────────────────

test("voto duplicado retorna ALREADY_VOTED sem crashar", async ({ playwright }) => {
  const session = await setupGame(playwright.request, { playerCount: 3 });
  await startSession(session);

  const storyteller = session.players[0];
  const voter = session.players[1];
  const p3 = session.players[2];

  await waitForPhase(storyteller.req, session.code, "clue");
  const stMe = await getMe(storyteller.req, session.code);
  const roundId = stMe.game.currentRoundId!;
  await submitClue(storyteller.req, roundId, "teste", stMe.hand[0]?.id ?? null);

  await waitForPhase(voter.req, session.code, "submitting");
  const voterMe = await getMe(voter.req, session.code);
  await submitCard(voter.req, roundId, voterMe.hand[0].id);

  await waitForPhase(p3.req, session.code, "submitting");
  const p3Me = await getMe(p3.req, session.code);
  await submitCard(p3.req, roundId, p3Me.hand[0].id);

  await waitForPhase(voter.req, session.code, "voting");

  const { submissions, myPlayerId } = await getSubmissions(voter.req, roundId);
  const target = submissions.find((s) => s.playerId !== myPlayerId)!;

  // Primeiro voto válido
  await castVote(voter.req, roundId, target.id);

  // Segundo voto duplicado — deve retornar 400 com código ALREADY_VOTED
  const res = await voter.req.post(`/api/rounds/${roundId}/vote`, {
    data: { submissionId: target.id, isSecondary: false },
  });
  expect(res.ok()).toBe(false);
  const body = await res.json() as { code?: string };
  expect(body.code).toBe("ALREADY_VOTED");
});
