export interface ScoringInput {
  storytellerId: string;
  /** submissionId -> playerId who submitted that card */
  submissionOwner: Record<string, string>;
  /** submissionId corresponding to the storyteller's own card */
  storytellerSubmissionId: string;
  /** voterId -> submissionId they voted for */
  votes: Record<string, string>;
  /** all non-storyteller player ids (the voters) */
  voterIds: string[];
}

export type ScoreDelta = Record<string, number>;

/**
 * Dixit scoring rules:
 *  - If ALL or NONE of the voters guessed the storyteller's card:
 *      storyteller: 0, every other player: +2
 *  - Otherwise:
 *      storyteller: +3, each voter who guessed correctly: +3
 *  - Additionally (in the "otherwise" case ONLY, per standard Dixit):
 *      each non-storyteller earns +1 per vote received on their card (capped at 3).
 *
 * Some variants award bystander votes in both cases; we follow the canonical rule
 * where the +1-per-vote bonus is applied only in the "otherwise" branch.
 */
export function computeScores(input: ScoringInput): ScoreDelta {
  const {
    storytellerId,
    submissionOwner,
    storytellerSubmissionId,
    votes,
    voterIds,
  } = input;

  const delta: ScoreDelta = { [storytellerId]: 0 };
  for (const vid of voterIds) delta[vid] = 0;

  const correctVoters = voterIds.filter(
    (vid) => votes[vid] === storytellerSubmissionId
  );
  const numCorrect = correctVoters.length;
  const numVoters = voterIds.length;

  const allOrNone = numCorrect === 0 || numCorrect === numVoters;

  if (allOrNone) {
    for (const vid of voterIds) delta[vid] += 2;
    return delta;
  }

  delta[storytellerId] += 3;
  for (const vid of correctVoters) delta[vid] += 3;

  // bonus: each non-storyteller gets +1 per vote received on their submission, capped at 3
  const votesPerSubmission: Record<string, number> = {};
  for (const subId of Object.values(votes)) {
    votesPerSubmission[subId] = (votesPerSubmission[subId] ?? 0) + 1;
  }
  for (const [subId, count] of Object.entries(votesPerSubmission)) {
    if (subId === storytellerSubmissionId) continue;
    const owner = submissionOwner[subId];
    if (!owner || owner === storytellerId) continue;
    delta[owner] += Math.min(count, 3);
  }

  return delta;
}
