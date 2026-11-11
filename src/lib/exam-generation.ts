import { buildVersion, type Question } from "./exam";

export function validateExamQuestions(ids: string[], questions: Question[]): Question[] {
  if (ids.length === 0) throw new Error("Selecione ao menos uma questão.");
  return ids.map(id => {
    const q = questions.find(q => q.id === id);
    if (!q) throw new Error("Uma questão foi excluída. Edite a seleção antes de gerar.");
    if (q.type === "objective" && (q.correct_index == null || !Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= q.options.length)) throw new Error("Marque a alternativa correta de todas as questões objetivas antes de gerar.");
    return q;
  });
}

export function generateExamVersions(examId: string, ids: string[], questions: Question[], labels: string[]) {
  const selected = validateExamQuestions(ids, questions);
  return labels.map(label => ({ exam_id: examId, label, items: buildVersion(selected) }));
}