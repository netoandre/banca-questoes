import { useState } from "react";
import { Search } from "lucide-react";
import type { ClassRow } from "@/lib/data";
import type { Question } from "@/lib/exam";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface ExamDraft { title: string; header: string; class_id: string | null; question_ids: string[] }

export function ExamEditor({ value, onChange, classes, questions }: {
  value: ExamDraft; onChange: (value: ExamDraft) => void; classes: ClassRow[]; questions: Question[];
}) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const tags = [...new Set(questions.flatMap(q => q.tags))].sort();
  const filtered = questions.filter(q => q.statement.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!tag || q.tags.includes(tag)));
  const selected = questions.filter(q => value.question_ids.includes(q.id));
  function toggle(id: string) {
    onChange({ ...value, question_ids: value.question_ids.includes(id) ? value.question_ids.filter(x => x !== id) : [...value.question_ids, id] });
  }
  return <div className="space-y-4">
    <div><Label htmlFor="exam-title">Nome da avaliação</Label><Input id="exam-title" placeholder="1ª avaliação, 2ª chamada…" value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} /></div>
    <div><Label htmlFor="exam-class">Turma e semestre</Label><select id="exam-class" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.class_id ?? ""} onChange={e => onChange({ ...value, class_id: e.target.value || null })}>
      <option value="">Sem turma</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.semester}</option>)}
    </select></div>
    <div><Label htmlFor="exam-header">Cabeçalho</Label><Textarea id="exam-header" rows={3} placeholder="Professor, disciplina, data, nome do aluno…" value={value.header} onChange={e => onChange({ ...value, header: e.target.value })} /></div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4"><h2 className="font-semibold">Questões</h2><span className="text-sm text-muted-foreground">{selected.length} selecionadas · {selected.reduce((s, q) => s + Number(q.weight), 0).toLocaleString("pt-BR")} pontos</span></div>
    <div className="flex flex-wrap gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar questões" placeholder="Buscar questões…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select aria-label="Filtrar por tag" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={tag} onChange={e => setTag(e.target.value)}><option value="">Todas as tags</option>{tags.map(t => <option key={t} value={t}>#{t}</option>)}</select>
    </div>
    <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, question_ids: [...new Set([...value.question_ids, ...filtered.map(q => q.id)])] })}>Selecionar filtradas</Button><Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, question_ids: [] })}>Limpar</Button></div>
    <div className="max-h-72 overflow-y-auto divide-y border-y">
      {filtered.map(q => <label key={q.id} className="flex cursor-pointer items-start gap-3 py-3"><Checkbox aria-label={`Selecionar ${q.statement}`} checked={value.question_ids.includes(q.id)} onCheckedChange={() => toggle(q.id)} className="mt-1" /><span className="min-w-0 flex-1"><span className="block whitespace-pre-wrap break-words text-sm">{q.statement}</span><span className="mt-1 block text-xs text-muted-foreground">{q.type === "objective" ? "Objetiva" : "Subjetiva"} · Peso {q.weight} {q.tags.map(t => ` · #${t}`).join("")}</span></span></label>)}
      {filtered.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma questão encontrada.</p>}
    </div>
  </div>;
}