import { describe, it, expect } from "vitest";
import { computeScores } from "../src/lib/game/scoring";

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

  it("all correct → storyteller 0, voters +2", () => {
    const votes = { A: "sub-S", B: "sub-S", C: "sub-S" };
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      votes,
      voterIds,
    });
    expect(d.S).toBe(0);
    expect(d.A).toBe(2);
    expect(d.B).toBe(2);
    expect(d.C).toBe(2);
  });

  it("none correct → storyteller 0, voters +2", () => {
    const votes = { A: "sub-B", B: "sub-C", C: "sub-A" };
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      votes,
      voterIds,
    });
    expect(d.S).toBe(0);
    expect(d.A).toBe(2);
    expect(d.B).toBe(2);
    expect(d.C).toBe(2);
  });

  it("partial → storyteller +3, correct voters +3, bystander bonus", () => {
    // A correct, B voted sub-C, C voted sub-C
    const votes = { A: "sub-S", B: "sub-C", C: "sub-C" };
    const d = computeScores({
      storytellerId,
      submissionOwner,
      storytellerSubmissionId,
      votes,
      voterIds,
    });
    expect(d.S).toBe(3);
    expect(d.A).toBe(3);
    expect(d.B).toBe(0);
    expect(d.C).toBe(2); // received 2 votes on own card
  });
});
