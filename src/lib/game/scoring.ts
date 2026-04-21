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
