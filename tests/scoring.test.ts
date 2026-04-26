import { describe, it, expect } from "vitest";
import {
  computeScores,
  computeStellaScores,
  isStellaFinalRound,
} from "../src/lib/game/scoring";

describe("computeScores", () => {
  const storytellerId = "S";
  const voterIds = ["A", "B", "C"];
  const storytellerSubmissionId = "sub-S";
  const submissionOwner = {
    "sub-S": "S",
    "sub-A": "A",
    "sub-B": "B",
    "sub-C": "C",
  };
  const noSecondary = {};
  const maxPointsPerRound = 5;

  it("all correct → storyteller 0, voters +2", () => {
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      primaryVotes: { A: "sub-S", B: "sub-S", C: "sub-S" },
      secondaryVotes: noSecondary,
      voterIds,
      maxPointsPerRound,
    });
    expect(d.S).toBe(0);
    expect(d.A).toBe(2);
    expect(d.B).toBe(2);
    expect(d.C).toBe(2);
  });

  it("none correct → storyteller 0, voters +2", () => {
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      primaryVotes: { A: "sub-B", B: "sub-C", C: "sub-A" },
      secondaryVotes: noSecondary,
      voterIds,
      maxPointsPerRound,
    });
    expect(d.S).toBe(0);
    expect(d.A).toBe(2);
    expect(d.B).toBe(2);
    expect(d.C).toBe(2);
  });

  it("partial → storyteller +3, correct voters +3, bystander bonus", () => {
    // A correct, B voted sub-C, C voted sub-C
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      primaryVotes: { A: "sub-S", B: "sub-C", C: "sub-C" },
      secondaryVotes: noSecondary,
      voterIds,
      maxPointsPerRound,
    });
    expect(d.S).toBe(3);
    expect(d.A).toBe(3);
    expect(d.B).toBe(0);
    expect(d.C).toBe(2); // received 2 votes → capped at 2 (under maxPointsPerRound)
  });
});

describe("computeStellaScores", () => {
  const playerIds = ["A", "B", "C", "D"];

  it("fall: scout scores 0 and stops scoring", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x", "y"],
        B: ["y"],
        C: ["y"],
        D: ["y"],
      },
      revealOrder: [
        { scoutId: "A", cardId: "x" },
        { scoutId: "B", cardId: "y" },
      ],
    });

    expect(result.revealResults[0].outcome).toBe("fall");
    expect(result.fallen.A).toBe(true);
    expect(result.delta.A).toBe(0);
    expect(result.delta.B).toBe(2);
    expect(result.delta.C).toBe(2);
    expect(result.delta.D).toBe(2);
  });

  it("spark: 3+ selected players score 2", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x"],
        B: ["x"],
        C: ["x"],
        D: [],
      },
      revealOrder: [{ scoutId: "A", cardId: "x" }],
    });

    expect(result.revealResults[0].outcome).toBe("spark");
    expect(result.delta.A).toBe(2);
    expect(result.delta.B).toBe(2);
    expect(result.delta.C).toBe(2);
    expect(result.delta.D).toBe(0);
  });

  it("super-spark: exactly 2 selected players score 3", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x"],
        B: ["x"],
        C: [],
        D: [],
      },
      revealOrder: [{ scoutId: "A", cardId: "x" }],
    });

    expect(result.revealResults[0].outcome).toBe("super");
    expect(result.delta.A).toBe(3);
    expect(result.delta.B).toBe(3);
    expect(result.delta.C).toBe(0);
    expect(result.delta.D).toBe(0);
  });

  it("fallen players count as matches but gain no stars", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x", "y"],
        B: ["y"],
        C: [],
        D: [],
      },
      revealOrder: [
        { scoutId: "A", cardId: "x" },
        { scoutId: "B", cardId: "y" },
      ],
    });

    expect(result.revealResults[1].outcome).toBe("super");
    expect(result.revealResults[1].matchedPlayerIds).toEqual(["A"]);
    expect(result.delta.A).toBe(0);
    expect(result.delta.B).toBe(3);
  });

  it("dark player scores normally if they do not fall", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x"],
        B: ["x"],
        C: [],
        D: [],
      },
      revealOrder: [{ scoutId: "A", cardId: "x" }],
      inDarkPlayerIds: ["A"],
    });

    expect(result.delta.A).toBe(3);
    expect(result.fallen.A).toBe(false);
  });

  it("dark player who falls loses 1 point per scored spark/super-spark", () => {
    const result = computeStellaScores({
      playerIds,
      selections: {
        A: ["x", "y"],
        B: ["x"],
        C: [],
        D: [],
      },
      revealOrder: [
        { scoutId: "A", cardId: "x" },
        { scoutId: "A", cardId: "y" },
      ],
      inDarkPlayerIds: ["A"],
    });

    expect(result.delta.A).toBe(2);
    expect(result.delta.B).toBe(3);
    expect(result.fallen.A).toBe(true);
  });
});

describe("isStellaFinalRound", () => {
  it("ends Stella after round 4", () => {
    expect(isStellaFinalRound(3)).toBe(false);
    expect(isStellaFinalRound(4)).toBe(true);
  });
});
