import { describe, expect, it } from "vitest";
import { answerKeyText, buildVersion, type Question } from "./exam";
import { generateExamVersions, validateExamQuestions } from "./exam-generation";

const q = (id: string, weight: number, type: "objective" | "subjective" = "objective"): Question => ({
  id, type, statement: id, options: type === "objective" ? ["certa", "b", "c", "d"] : [],
  correct_index: type === "objective" ? 0 : null, answer_key: "", weight, tags: [],
});

describe("buildVersion", () => {
  const qs = [q("a", 2), q("b", 1), q("c", 2), q("d", 1), q("s", 3, "subjective"), q("e", 1)];

  it("keeps questions of the same weight together, objectives before subjectives", () => {
    for (let i = 0; i < 20; i++) {
      const v = buildVersion(qs);
      expect(v.map((x) => x.weight)).toEqual([1, 1, 1, 2, 2, 3]);
      expect(v.at(-1)?.type).toBe("subjective");
    }
  });

  it("answer key letter always points to the original correct alternative", () => {
    for (let i = 0; i < 20; i++) {
      for (const it of buildVersion(qs).filter((x) => x.type === "objective")) {
        const pos = "ABCD".indexOf(it.correct_letter ?? "");
        expect(it.options[pos]).toBe("certa");
      }
    }
  });

  it("generates A and B using only selected questions and preserves their answer keys", () => {
    const rows = generateExamVersions("exam", ["a", "s"], qs, ["A", "B"]);
    expect(rows.map(r => r.label)).toEqual(["A", "B"]);
    for (const row of rows) {
      expect(row.exam_id).toBe("exam");
      expect(row.items.map(i => i.question_id).sort()).toEqual(["a", "s"]);
      const objective = row.items.find(i => i.question_id === "a");
      expect(objective?.options["ABCD".indexOf(objective.correct_letter ?? "")]).toBe("certa");
    }
  });

  it("does not change saved question content when the source is edited", () => {
    const source = q("source", 1);
    const row = generateExamVersions("exam", ["source"], [source], ["A"])[0];
    source.statement = "edited";
    source.options[0] = "changed";
    expect(row?.items[0]?.statement).toBe("source");
    expect(row?.items[0]?.options).toContain("certa");
  });

  it("includes expected subjective answers in the separate answer key", () => {
    const source = { ...q("s", 3, "subjective"), answer_key: "A fotossíntese produz glicose." };
    expect(answerKeyText(buildVersion([source]))).toContain("A fotossíntese produz glicose.");
  });

  it("rejects generation without selected questions", () => {
    expect(() => validateExamQuestions([], qs)).toThrow();
  });

  it("rejects generation when an objective question has no correct alternative", () => {
    expect(() => validateExamQuestions(["a"], [{ ...q("a", 1), correct_index: null }])).toThrow();
  });

  it("rejects deleted questions instead of silently omitting them", () => {
    expect(() => validateExamQuestions(["deleted"], qs)).toThrow();
  });
});
