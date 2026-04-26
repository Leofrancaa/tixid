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
 *  - All or none guessed storyteller -> storyteller 0, everyone else +2
 *  - Otherwise -> storyteller +3, correct guessers +3,
 *    each non-storyteller card gets +1 per vote received (capped at 3)
 *
 * Secondary votes (7+ players only, applied after primary scoring):
 *  - Lands on storyteller's card -> voter +1
 *  - Lands on another player's card -> card owner +1
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

  for (const [voterId, subId] of Object.entries(secondaryVotes)) {
    if (subId === storytellerSubmissionId) {
      delta[voterId] = (delta[voterId] ?? 0) + 1;
    } else {
      const owner = submissionOwner[subId];
      if (owner && owner !== storytellerId) {
        delta[owner] = (delta[owner] ?? 0) + 1;
      }
    }
  }

  for (const pid of Object.keys(delta)) {
    delta[pid] = Math.min(delta[pid], maxPointsPerRound);
  }

  return delta;
}

export type StellaRevealOutcome = "fall" | "spark" | "super";

export interface StellaRevealStep {
  scoutId: string;
  cardId: string;
}

export interface StellaRevealResult {
  scoutId: string;
  cardId: string;
  outcome: StellaRevealOutcome;
  /** players who also selected the card, excluding the scout */
  matchedPlayerIds: string[];
  /** players who earned stars on this reveal */
  scoredPlayerIds: string[];
  points: number;
}

export interface StellaScoringInput {
  /** all players in seat order */
  playerIds: string[];
  /** playerId -> secretly selected card ids */
  selections: Record<string, string[]>;
  /** cards revealed by scouts, in order */
  revealOrder: StellaRevealStep[];
  /** officially at most one player, but an array keeps the function flexible */
  inDarkPlayerIds?: string[];
}

/**
 * Stella scoring:
 *  - Fall: no other player selected the scout's card; the scout stops scoring.
 *  - Super-Spark: exactly one other player selected it; active involved players score 3.
 *  - Spark: at least two other players selected it; active involved players score 2.
 *  - Fallen players still count as matches, but no longer gain stars.
 *  - A player in the dark who falls loses 1 star per scored Spark/Super-Spark.
 */
export function computeStellaScores(input: StellaScoringInput): {
  delta: ScoreDelta;
  fallen: Record<string, boolean>;
  revealResults: StellaRevealResult[];
} {
  const { playerIds, selections, revealOrder, inDarkPlayerIds = [] } = input;

  const delta: ScoreDelta = {};
  const fallen: Record<string, boolean> = {};
  const scoredEvents: Record<string, number> = {};
  const revealResults: StellaRevealResult[] = [];
  const inDark = new Set(inDarkPlayerIds);

  for (const pid of playerIds) {
    delta[pid] = 0;
    fallen[pid] = false;
    scoredEvents[pid] = 0;
  }

  for (const step of revealOrder) {
    const selectedPlayerIds = playerIds.filter((pid) =>
      (selections[pid] ?? []).includes(step.cardId)
    );
    const matchedPlayerIds = selectedPlayerIds.filter((pid) => pid !== step.scoutId);

    if (matchedPlayerIds.length === 0) {
      fallen[step.scoutId] = true;
      revealResults.push({
        ...step,
        outcome: "fall",
        matchedPlayerIds,
        scoredPlayerIds: [],
        points: 0,
      });
      continue;
    }

    const outcome: StellaRevealOutcome =
      matchedPlayerIds.length === 1 ? "super" : "spark";
    const points = outcome === "super" ? 3 : 2;
    const scoredPlayerIds = selectedPlayerIds.filter((pid) => !fallen[pid]);

    for (const pid of scoredPlayerIds) {
      delta[pid] = (delta[pid] ?? 0) + points;
      scoredEvents[pid] = (scoredEvents[pid] ?? 0) + 1;
    }

    revealResults.push({
      ...step,
      outcome,
      matchedPlayerIds,
      scoredPlayerIds,
      points,
    });
  }

  for (const pid of playerIds) {
    if (inDark.has(pid) && fallen[pid]) {
      delta[pid] = Math.max(0, delta[pid] - (scoredEvents[pid] ?? 0));
    }
  }

  return { delta, fallen, revealResults };
}

export function isStellaFinalRound(roundNumber: number) {
  return roundNumber >= 4;
}
