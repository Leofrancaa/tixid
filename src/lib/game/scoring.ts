export interface ScoringInput {
  storytellerId: string;
  /** submissionId -> playerId who submitted that card */
  submissionOwner: Record<string, string>;
  /** submissionId corresponding to the storyteller's own card */
  storytellerSubmissionId: string;
  /** voterId -> submissionId (primary votes only) */
  primaryVotes: Record<string, string>;
  /** voterId -> submissionId (secondary votes only, 7+ player mode) */
  secondaryVotes: Record<string, string>;
  /** all non-storyteller player ids */
  voterIds: string[];
  /** max points any player can earn in a single round */
  maxPointsPerRound: number;
}

export type ScoreDelta = Record<string, number>;

/**
 * Dixit / Dixit Odyssey scoring:
 *
 * Primary votes (all player counts):
 *  - All or none guessed storyteller → storyteller 0, everyone else +2
 *  - Otherwise → storyteller +3, correct guessers +3,
 *    each non-storyteller card gets +1 per vote received (capped at 3)
 *
 * Secondary votes (7+ players only, applied after primary scoring):
 *  - Lands on storyteller's card → voter +1
 *  - Lands on another player's card → card owner +1
 *
 * Cap: no player earns more than maxPointsPerRound in a single round.
 */
export function computeScores(input: ScoringInput): ScoreDelta {
  const {
    storytellerId,
    submissionOwner,
    storytellerSubmissionId,
    primaryVotes,
    secondaryVotes,
    voterIds,
    maxPointsPerRound,
  } = input;

  const delta: ScoreDelta = { [storytellerId]: 0 };
  for (const vid of voterIds) delta[vid] = 0;

  const correctVoters = voterIds.filter(
    (vid) => primaryVotes[vid] === storytellerSubmissionId
  );
  const numCorrect = correctVoters.length;
  const numVoters = voterIds.length;
  const allOrNone = numCorrect === 0 || numCorrect === numVoters;

  if (allOrNone) {
    for (const vid of voterIds) delta[vid] += 2;
  } else {
    delta[storytellerId] += 3;
    for (const vid of correctVoters) delta[vid] += 3;

    // +1 per vote on non-storyteller cards, capped at 3
    const votesPerSub: Record<string, number> = {};
    for (const subId of Object.values(primaryVotes)) {
      votesPerSub[subId] = (votesPerSub[subId] ?? 0) + 1;
    }
    for (const [subId, count] of Object.entries(votesPerSub)) {
      if (subId === storytellerSubmissionId) continue;
      const owner = submissionOwner[subId];
      if (!owner || owner === storytellerId) continue;
      delta[owner] = (delta[owner] ?? 0) + Math.min(count, 3);
    }
  }

  // Secondary vote bonuses
  for (const [voterId, subId] of Object.entries(secondaryVotes)) {
    if (subId === storytellerSubmissionId) {
      // secondary vote on storyteller card → voter gets +1
      delta[voterId] = (delta[voterId] ?? 0) + 1;
    } else {
      // secondary vote on another card → that card's owner gets +1
      const owner = submissionOwner[subId];
      if (owner && owner !== storytellerId) {
        delta[owner] = (delta[owner] ?? 0) + 1;
      }
    }
  }

  // Cap per-round earnings
  for (const pid of Object.keys(delta)) {
    delta[pid] = Math.min(delta[pid], maxPointsPerRound);
  }

  return delta;
}

export interface StellaScoringInput {
  /** voterId -> submissionId. Inclui storyteller (que também vota). */
  votes: Record<string, string>;
  /** submissionId -> playerId dono da submissão. */
  submissionOwner: Record<string, string>;
  /** todos os jogadores da partida (todos votam e submetem em Stella). */
  playerIds: string[];
  /** teto de pontos por jogador por rodada. */
  maxPointsPerRound: number;
}

/**
 * Stella mode scoring (consenso):
 *  - Cada votante ganha (n_outros_que_votaram_no_mesmo) pontos.
 *    Voto sozinho = 0; com mais 1 = 1pt; com mais 2 = 2pts; etc.
 *  - Dono da carta ganha +1 por voto recebido.
 *  - Cap por rodada: maxPointsPerRound.
 */
export function computeStellaScores(input: StellaScoringInput): ScoreDelta {
  const { votes, submissionOwner, playerIds, maxPointsPerRound } = input;

  const delta: ScoreDelta = {};
  for (const pid of playerIds) delta[pid] = 0;

  const voteCount: Record<string, number> = {};
  for (const subId of Object.values(votes)) {
    voteCount[subId] = (voteCount[subId] ?? 0) + 1;
  }

  // Voter consensus: each voter who picked sub S gets (count - 1) points
  for (const [voterId, subId] of Object.entries(votes)) {
    const consensus = (voteCount[subId] ?? 0) - 1;
    delta[voterId] = (delta[voterId] ?? 0) + consensus;
  }

  // Owner reward: +1 per vote received on their card
  for (const [subId, count] of Object.entries(voteCount)) {
    const ownerId = submissionOwner[subId];
    if (!ownerId) continue;
    delta[ownerId] = (delta[ownerId] ?? 0) + count;
  }

  for (const pid of Object.keys(delta)) {
    delta[pid] = Math.min(delta[pid], maxPointsPerRound);
    if (delta[pid] < 0) delta[pid] = 0;
  }

  return delta;
}
