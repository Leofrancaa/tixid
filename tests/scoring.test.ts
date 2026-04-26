import { describe, it, expect } from "vitest";
import { computeScores, computeStellaScores } from "../src/lib/game/scoring";

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
  const submissionOwner = {
    "sub-A": "A",
    "sub-B": "B",
    "sub-C": "C",
    "sub-D": "D",
  };
  const playerIds = ["A", "B", "C", "D"];

  it("awards voter consensus and owner vote bonuses", () => {
    const d = computeStellaScores({
      submissionOwner,
      playerIds,
      votes: {
        A: "sub-B",
        B: "sub-C",
        C: "sub-B",
        D: "sub-B",
      },
      maxPointsPerRound: 5,
    });

    expect(d.A).toBe(2);
    expect(d.B).toBe(3);
    expect(d.C).toBe(3);
    expect(d.D).toBe(2);
  });

  it("gives no consensus points for a solo vote", () => {
    const d = computeStellaScores({
      submissionOwner,
      playerIds,
      votes: {
        A: "sub-B",
        B: "sub-A",
        C: "sub-B",
        D: "sub-C",
      },
      maxPointsPerRound: 5,
    });

    expect(d.A).toBe(2);
    expect(d.B).toBe(2);
    expect(d.C).toBe(2);
    expect(d.D).toBe(0);
  });

  it("caps each player at the round maximum", () => {
    const d = computeStellaScores({
      submissionOwner: {
        "sub-A": "A",
        "sub-B": "B",
        "sub-C": "C",
        "sub-D": "D",
        "sub-E": "E",
        "sub-F": "F",
        "sub-G": "G",
      },
      playerIds: ["A", "B", "C", "D", "E", "F", "G"],
      votes: {
        A: "sub-B",
        B: "sub-A",
        C: "sub-A",
        D: "sub-A",
        E: "sub-A",
        F: "sub-A",
        G: "sub-A",
      },
      maxPointsPerRound: 5,
    });

    expect(d.A).toBe(5);
    expect(d.B).toBe(5);
    expect(d.C).toBe(5);
    expect(d.D).toBe(5);
    expect(d.E).toBe(5);
    expect(d.F).toBe(5);
    expect(d.G).toBe(5);
  });
});
