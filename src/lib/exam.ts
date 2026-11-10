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
 * Builds one exam version: objective questions first, then subjective.
 * Within each type, questions are grouped by weight (lowest first) so equal weights
 * stay together; order inside each group and the alternatives are shuffled.
 */
export function buildVersion(questions: Question[], rand: () => number = Math.random): VersionItem[] {
  const ordered: Question[] = [];
  for (const type of ["objective", "subjective"] as const) {
    const ofType = questions.filter((q) => q.type === type);
    const weights = [...new Set(ofType.map((q) => Number(q.weight)))].sort((a, b) => a - b);
    for (const w of weights) ordered.push(...shuffle(ofType.filter((q) => Number(q.weight) === w), rand));
  }
  return ordered.map((q, i) => {
    if (q.type === "objective") {
      const idx = shuffle(q.options.map((_, k) => k), rand);
      const pos = q.correct_index == null ? -1 : idx.indexOf(q.correct_index);
      return {
        number: i + 1, question_id: q.id, type: q.type, statement: q.statement,
        options: idx.map((k) => q.options[k] ?? ""),
        correct_letter: pos >= 0 ? (LETTERS[pos] ?? null) : null,
        answer_key: q.answer_key, weight: Number(q.weight),
      };
    }
    return {
      number: i + 1, question_id: q.id, type: q.type, statement: q.statement, options: [],
      correct_letter: null, answer_key: q.answer_key, weight: Number(q.weight),
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
  return items.map((it) => `${it.number}: ${it.type === "objective" ? it.correct_letter ?? "?" : "dissertativa"} (peso ${it.weight})`).join("\n");
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
