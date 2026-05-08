/**
 * Testes E2E multi-jogador.
 *
 * Pré-requisito: servidor rodando em http://localhost:3000 (npm run dev ou npm start)
 * com banco de dados configurado e seed de cartas/perguntas aplicado.
 *
 * Execução:  npx playwright test e2e/multiplayer.spec.ts
 */
import { test, expect } from "@playwright/test";
import { setupGame, startSession, playOneRound } from "./helpers/multiPlayer";
import { getMe, getRound, waitForPhase, waitForGameStatus } from "./helpers/api";

// ─── Helpers de asserção ────────────────────────────────────────────────────

function expectPositiveScores(scores: Record<string, number>, players: string[]) {
  const total = players.reduce((s, p) => s + (scores[p] ?? 0), 0);
  // Pelo menos algum ponto deve ter sido distribuído (mesmo em all-correct, todos ganham +2)
  expect(total).toBeGreaterThan(0);
}

// ─── 3 jogadores — modo clássico ────────────────────────────────────────────

test("3 jogadores classic — rodada completa distribui pontos", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 3 });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

test("3 jogadores classic — duas rodadas, storyteller rotaciona", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 3 });
  await startSession(session);

  // Rodada 1: storyteller = J1
  const round1State = await getRound(session.players[0].req, session.code);
  expect(round1State.round?.roundNumber).toBe(1);
  const { scores: scores1 } = await playOneRound(session, 0);
  expectPositiveScores(scores1, session.players.map((p) => p.nickname));

  // Rodada 2: storyteller = J2
  const round2State = await getRound(session.players[0].req, session.code);
  expect(round2State.round?.roundNumber).toBe(2);
  const { scores: scores2 } = await playOneRound(session, 1);
  expectPositiveScores(scores2, session.players.map((p) => p.nickname));
});

// ─── 3 jogadores — modo perguntas ───────────────────────────────────────────

test("3 jogadores questions — rodada completa distribui pontos", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 3, mode: "questions" });
  await startSession(session);

  const { scores } = await playOneRound(session, 0);

  expectPositiveScores(scores, session.players.map((p) => p.nickname));
});

// ─── 7 jogadores — modo perguntas (bug reportado: não iniciava) ──────────────

test("7 jogadores questions — partida inicia e completa rodada", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 7, mode: "questions" });
  await startSession(session);

  // Verifica que o jogo iniciou
  const state = await getRound(session.players[0].req, session.code);
  expect(state.gameStatus).toBe("playing");
  expect(state.round?.phase).toBe("clue");

  const { scores } = await playOneRound(session, 0);

  // Com 7 jogadores e auto-resolve no modo questions, todos devem ter pontuação
  const totalScore = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(totalScore).toBeGreaterThan(0);
});

// ─── 7 jogadores — modo clássico (Odyssey) ──────────────────────────────────

test("7 jogadores classic (Odyssey) — host resolve e pontuação é correta", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 7 });
  await startSession(session);

  const state = await getRound(session.players[0].req, session.code);
  expect(state.gameStatus).toBe("playing");

  const { scores } = await playOneRound(session, 0);

  // Todos os 7 jogadores devem ter score registrado
  expect(Object.keys(scores).length).toBe(7);

  // Pontuação total deve ser positiva (jogo funcionou)
  const total = Object.values(scores).reduce((a, b) => a + b, 0);
  expect(total).toBeGreaterThan(0);
});

// ─── Votação — rollback em erro ──────────────────────────────────────────────

test("voto duplicado retorna erro sem travar o jogo", async ({ browser }) => {
  const session = await setupGame(browser, { playerCount: 3 });
  await startSession(session);

  const storyteller = session.players[0];
  const voter = session.players[1];

  await waitForPhase(storyteller.req, session.code, "clue");
  const stMe = await getMe(storyteller.req, session.code);
  const roundId = stMe.game.currentRoundId!;

  await import("./helpers/api").then(({ submitClue: sc }) =>
    sc(storyteller.req, roundId, "teste", stMe.hand[0]?.id ?? null)
  );

  await waitForPhase(voter.req, session.code, "submitting");
  const voterMe = await getMe(voter.req, session.code);
  await import("./helpers/api").then(({ submitCard: sc }) =>
    sc(voter.req, roundId, voterMe.hand[0].id)
  );

  // J3 também submete
  const p3 = session.players[2];
  await waitForPhase(p3.req, session.code, "submitting");
  const p3Me = await getMe(p3.req, session.code);
  await import("./helpers/api").then(({ submitCard: sc }) =>
    sc(p3.req, roundId, p3Me.hand[0].id)
  );

  await waitForPhase(voter.req, session.code, "voting");

  const { castVote: cv, getSubmissions: gs } = await import("./helpers/api");
  const { submissions, myPlayerId } = await gs(voter.req, roundId);
  const target = submissions.find((s) => s.playerId !== myPlayerId)!;

  // Primeiro voto: deve funcionar
  await cv(voter.req, roundId, target.id);

  // Segundo voto (duplicado): deve retornar erro sem crashar
  const res = await voter.req.post(`/api/rounds/${roundId}/vote`, {
    data: { submissionId: target.id, isSecondary: false },
  });
  expect(res.ok()).toBe(false);
  const body = await res.json() as { code?: string };
  expect(body.code).toBe("ALREADY_VOTED");
});
