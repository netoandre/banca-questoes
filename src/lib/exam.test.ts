import { describe, expect, it } from "vitest";
import { buildVersion, type Question } from "./exam";

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
        const pos = "ABCD".indexOf(it.correct_letter!);
        expect(it.options[pos]).toBe("certa");
      }
    }
  });
});
