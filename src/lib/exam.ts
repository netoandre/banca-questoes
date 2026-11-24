export type QuestionType = "objective" | "subjective";
export interface Question {
  id: string;
  type: QuestionType;
  statement: string;
  options: string[];
  correct_index: number | null;
  answer_key: string;
  weight: number;
  tags: string[];
  adapted?: boolean;
}
export interface VersionItem {
  number: number;
  question_id: string;
  type: QuestionType;
  statement: string;
  options: string[];
  correct_letter: string | null;
  answer_key: string;
  weight: number;
}

export const LETTERS = "ABCDEFGHIJ";

export function shuffle<T>(arr: T[], rand: () => number = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const t = a[i] as T; a[i] = a[j] as T; a[j] = t;
  }
  return a;
}

/**
 * Builds one exam version. When orderByWeight is true (default), questions are
 * grouped by weight ascending (objectives before subjectives within the same
 * weight) and shuffled within each group. When false, all questions are shuffled.
 * Objective alternatives are always shuffled.
 */
export interface BuildVersionOptions {
  rand?: () => number;
  weights?: Record<string, number>;
  orderByWeight?: boolean;
}

export function questionWeight(q: Question, weights?: Record<string, number>): number {
  const w = weights?.[q.id];
  return typeof w === "number" && Number.isFinite(w) && w > 0 ? w : (Number(q.weight) || 1);
}

export function buildVersion(questions: Question[], options: BuildVersionOptions = {}): VersionItem[] {
  const { rand = Math.random, weights, orderByWeight = true } = options;
  const ordered: Question[] = [];
  if (orderByWeight) {
    const distinctWeights = [...new Set(questions.map((q) => questionWeight(q, weights)))].sort((a, b) => a - b);
    for (const w of distinctWeights) {
      const ofWeight = questions.filter((q) => questionWeight(q, weights) === w);
      for (const type of ["objective", "subjective"] as const) {
        ordered.push(...shuffle(ofWeight.filter((q) => q.type === type), rand));
      }
    }
  } else {
    ordered.push(...shuffle(questions, rand));
  }
  return ordered.map((q, i) => {
    const weight = questionWeight(q, weights);
    if (q.type === "objective") {
      const idx = shuffle(q.options.map((_, k) => k), rand);
      const pos = q.correct_index == null ? -1 : idx.indexOf(q.correct_index);
      return {
        number: i + 1, question_id: q.id, type: q.type, statement: q.statement,
        options: idx.map((k) => q.options[k] ?? ""),
        correct_letter: pos >= 0 ? (LETTERS[pos] ?? null) : null,
        answer_key: q.answer_key, weight,
      };
    }
    return {
      number: i + 1, question_id: q.id, type: q.type, statement: q.statement, options: [],
      correct_letter: null, answer_key: q.answer_key, weight,
    };
  });
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>");

const fmtW = (w: number) => (w === 1 ? "1,0 ponto" : `${String(w).replace(".", ",")} pontos`);

export function versionToHtml(title: string, header: string, label: string, items: VersionItem[]) {
  const body = items.map((it) => {
    const opts = it.options.map((o, k) =>
      `<p style="margin:0 0 2pt 18pt">${LETTERS[k]}) ${esc(o)}</p>`).join("");
    const space = it.type === "subjective"
      ? `<p style="margin:0">&nbsp;</p>`.repeat(6) : "";
    return `<div style="margin:0 0 12pt 0"><p style="margin:0 0 4pt 0"><b>Questão ${it.number}</b> <i>(${fmtW(it.weight)})</i></p><p style="margin:0 0 6pt 0;text-align:justify">${esc(it.statement)}</p>${opts}${space}</div>`;
  }).join("");
  return `<div style="font-family:'Times New Roman',serif;font-size:12pt;line-height:1.3"><p style="text-align:center;margin:0"><b>${esc(title)} — Prova ${esc(label)}</b></p>${header ? `<p style="margin:4pt 0 12pt 0">${esc(header)}</p>` : "<p></p>"}${body}</div>`;
}

export function versionToText(title: string, header: string, label: string, items: VersionItem[]) {
  return [`${title} — Prova ${label}`, header, "", ...items.map((it) =>
    [`Questão ${it.number} (${fmtW(it.weight)})`, it.statement, ...it.options.map((o, k) => `${LETTERS[k]}) ${o}`), ""].join("\n"))].join("\n");
}

export function answerKeyText(items: VersionItem[]) {
  return items.map((it) => `${it.number}: ${it.type === "objective" ? it.correct_letter ?? "?" : `dissertativa${it.answer_key ? ` — ${it.answer_key}` : " — resposta esperada não informada"}`} (peso ${it.weight})`).join("\n");
}

export async function copyRich(html: string, text: string) {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([html], { type: "text/html" }),
      "text/plain": new Blob([text], { type: "text/plain" }),
    })]);
  } else {
    await navigator.clipboard.writeText(text);
  }
}
