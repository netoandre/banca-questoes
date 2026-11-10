import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface ParsedQuestion {
  type: "objective" | "subjective";
  statement: string;
  options: string[];
  correct_index: number | null;
  answer_key: string;
}

async function askJson(system: string, user: string): Promise<unknown> {
  const { generateResponse } = await import("@lovable.dev/ai-gateway");
  const res = await generateResponse({
    model: "openai/gpt-6-astra",
    instructions: system,
    input: [{ role: "user", content: user + "\n\nReturn JSON." }],
    text: { format: { type: "json_object" } },
  });
  let out = "";
  for (const item of res.output ?? []) {
    if (item.type === "message") for (const c of item.content) if (c.type === "output_text") out += c.text;
  }
  return JSON.parse(out);
}

const SHAPE = `Each question: {"type":"objective"|"subjective","statement":string,"options":string[] (alternative texts WITHOUT the letter prefix),"correct_index":number|null (0-based index of the correct option),"answer_key":string (expected answer for subjective, or "")}`;

export const parseQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { text: string }) => {
    if (!d.text || d.text.length > 60000) throw new Error("Texto vazio ou muito longo");
    return d;
  })
  .handler(async ({ data }) => {
    const json = (await askJson(
      `You extract exam questions written in Portuguese from pasted text. Identify each question, its statement, its alternatives and the answer key. The answer key may appear as a list at the end (e.g. "1-A, 2-C"), as a mark on the alternative (*, (X), bold, "correta"), or elsewhere. Keep the original wording exactly. Questions without alternatives are subjective. Respond as {"questions":[...]}. ${SHAPE}`,
      data.text,
    )) as { questions?: ParsedQuestion[] };
    return { questions: (json.questions ?? []).map(clean) };
  });

export const adaptQuestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { question: ParsedQuestion }) => d)
  .handler(async ({ data }) => {
    const json = (await askJson(
      `You adapt exam questions (Portuguese) for neurodivergent students or students with learning difficulties. Rules: keep the same concept and the same correct answer; make the statement short, direct and literal; remove unnecessary context and stories; no trick questions, no double negatives, no "all/none of the above"; objective questions must have exactly 4 alternatives, short and clearly distinct, with exactly one correct. Subjective questions: simplify the prompt and break it into clear steps if needed. Respond as {"question":{...}}. ${SHAPE}`,
      JSON.stringify(data.question),
    )) as { question?: ParsedQuestion };
    if (!json.question) throw new Error("A IA não retornou uma questão");
    return { question: clean(json.question) };
  });

function clean(q: ParsedQuestion): ParsedQuestion {
  const options = Array.isArray(q.options) ? q.options.map(String) : [];
  const type = q.type === "subjective" || options.length === 0 ? "subjective" : "objective";
  const ci = typeof q.correct_index === "number" && q.correct_index >= 0 && q.correct_index < options.length ? q.correct_index : null;
  return { type, statement: String(q.statement ?? ""), options: type === "objective" ? options : [], correct_index: type === "objective" ? ci : null, answer_key: String(q.answer_key ?? "") };
}
