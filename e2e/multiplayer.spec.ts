/**
 * Testes E2E multi-jogador — API only, sem browser.
 *
 * Pré-requisito: servidor tixid rodando (npm run dev em d:\tixid).
 *
 * Execução padrão (porta 3000):
 *   npm run test:e2e
 *
 * Se o servidor subiu em outra porta (ex: 3001):
 *   $env:E2E_BASE_URL="http://localhost:3001"; npm run test:e2e
 */
import { test, expect } from "@playwright/test";
import { assertServerIsRunning, PlayerClient, BASE_URL } from "./helpers/playerClient";
import { setupGame, startSession, playOneRound } from "./helpers/multiPlayer";
import { getMe, getRound, waitForPhase, submitClue, submitCard, castVote, getSubmissions } from "./helpers/api";

// Garante que o servidor certo está rodando antes de qualquer teste
test.beforeAll(async () => {
  await assertServerIsRunning();
});

// ─── Helpers ────────────────────────────────────────────────────────────────

function expectPositiveScores(scores: Record<string, number>, nicknames: string[]) {
  const total = nicknames.reduce((s, p) => s + (scores[p] ?? 0), 0);
  expect(total, `pontuação total deve ser > 0 (scores: ${JSON.stringify(scores)})`).toBeGreaterThan(0);
}

// ─── 3 jogadores — modo clássico ────────────────────────────────────────────

test("3 jogadores classic — rodada completa distribui pontos", async () => {
  const session = await setupGame({ playerCount: 3 });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

test("3 jogadores classic — duas rodadas, storyteller rotaciona", async () => {
  const session = await setupGame({ playerCount: 3 });
  await startSession(session);

  const r1 = await getRound(session.players[0].client, session.code);
  expect(r1.round?.roundNumber).toBe(1);
  const { scores: s1 } = await playOneRound(session, 0);
  expectPositiveScores(s1, session.players.map((p) => p.nickname));

  const r2 = await getRound(session.players[0].client, session.code);
  expect(r2.round?.roundNumber).toBe(2);
  const { scores: s2 } = await playOneRound(session, 1);
  expectPositiveScores(s2, session.players.map((p) => p.nickname));
});

// ─── 3 jogadores — modo perguntas ───────────────────────────────────────────

test("3 jogadores questions — rodada completa distribui pontos", async () => {
  const session = await setupGame({ playerCount: 3, mode: "questions" });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

// ─── 7 jogadores — modo perguntas (bug: não iniciava) ───────────────────────

test("7 jogadores questions — partida inicia e completa rodada", async () => {
  const session = await setupGame({ playerCount: 7, mode: "questions" });
  await startSession(session);

  const state = await getRound(session.players[0].client, session.code);
  expect(state.gameStatus).toBe("playing");
  expect(state.round?.phase).toBe("clue");

  const { scores } = await playOneRound(session, 0);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThan(0);
});

// ─── 7 jogadores — Odyssey (classic, host resolve manual) ───────────────────

test("7 jogadores classic Odyssey — pontuação correta após host revelar", async () => {
  const session = await setupGame({ playerCount: 7 });
  await startSession(session);

  const state = await getRound(session.players[0].client, session.code);
  expect(state.gameStatus).toBe("playing");

  const { scores } = await playOneRound(session, 0);

  expect(Object.keys(scores).length).toBe(7);
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThan(0);
});

// ─── Votação — voto duplicado retorna erro sem crashar ──────────────────────

test("voto duplicado retorna ALREADY_VOTED sem crashar", async () => {
  const session = await setupGame({ playerCount: 3 });
  await startSession(session);

  const storyteller = session.players[0];
  const voter = session.players[1];
  const p3 = session.players[2];

  await waitForPhase(storyteller.client, session.code, "clue");
  const stMe = await getMe(storyteller.client, session.code);
  const roundId = stMe.game.currentRoundId!;
  await submitClue(storyteller.client, roundId, "teste", stMe.hand[0]?.id ?? null);

  await waitForPhase(voter.client, session.code, "submitting");
  const voterMe = await getMe(voter.client, session.code);
  await submitCard(voter.client, roundId, voterMe.hand[0].id);

  await waitForPhase(p3.client, session.code, "submitting");
  const p3Me = await getMe(p3.client, session.code);
  await submitCard(p3.client, roundId, p3Me.hand[0].id);

  await waitForPhase(voter.client, session.code, "voting");

  const { submissions, myPlayerId } = await getSubmissions(voter.client, roundId);
  const target = submissions.find((s) => s.playerId !== myPlayerId)!;

  // Primeiro voto válido
  await castVote(voter.client, roundId, target.id);

  // Segundo voto (duplicado) deve retornar 400 com código ALREADY_VOTED
  const res = await voter.client.post(`/api/rounds/${roundId}/vote`, {
    data: { submissionId: target.id, isSecondary: false },
  });
  expect(res.ok()).toBe(false);
  const body = await res.json() as { code?: string };
  expect(body.code).toBe("ALREADY_VOTED");
});
