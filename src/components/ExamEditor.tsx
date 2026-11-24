import { useState } from "react";
import { Search } from "lucide-react";
import type { ClassRow } from "@/lib/data";
import type { Question } from "@/lib/exam";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

export interface ExamDraft {
  title: string;
  header: string;
  class_id: string | null;
  question_ids: string[];
  question_weights: Record<string, number>;
  order_by_weight: boolean;
}

const TITLE_PRESETS = ["1ª avaliação", "2ª avaliação", "2ª chamada", "Prova final"] as const;
const TYPE_PRESETS = ["A", "B", "C", "Adaptada"] as const;
const TYPE_SUFFIX_RE = /\s*—\s*(?:Tipo\s+[ABC]|Adaptada)$/i;

export function ExamEditor({ value, onChange, classes, questions }: {
  value: ExamDraft; onChange: (value: ExamDraft) => void; classes: ClassRow[]; questions: Question[];
}) {
  const [search, setSearch] = useState("");
  const [tag, setTag] = useState("");
  const [bulkWeight, setBulkWeight] = useState("1");
  const tags = [...new Set(questions.flatMap(q => q.tags))].sort();
  const filtered = questions.filter(q => q.statement.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!tag || q.tags.includes(tag)));
  const selected = questions.filter(q => value.question_ids.includes(q.id));
  const getWeight = (id: string) => value.question_weights[id] ?? 1;
  const totalPoints = selected.reduce((s, q) => s + getWeight(q.id), 0);

  function pickBaseTitle(base: string) {
    const suffix = value.title.match(TYPE_SUFFIX_RE)?.[0] ?? "";
    onChange({ ...value, title: `${base}${suffix}` });
  }
  function pickType(type: string) {
    const base = value.title.replace(TYPE_SUFFIX_RE, "").trim();
    const suffix = type === "Adaptada" ? "Adaptada" : `Tipo ${type}`;
    onChange({ ...value, title: base ? `${base} — ${suffix}` : suffix });
  }
  function toggle(id: string) {
    const exists = value.question_ids.includes(id);
    const question_ids = exists ? value.question_ids.filter(x => x !== id) : [...value.question_ids, id];
    const question_weights = { ...value.question_weights };
    if (!exists && question_weights[id] == null) question_weights[id] = 1;
    onChange({ ...value, question_ids, question_weights });
  }
  function setWeight(id: string, raw: string) {
    const n = Number(raw.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    onChange({ ...value, question_weights: { ...value.question_weights, [id]: n } });
  }
  function applyBulkWeight(scope: "selected" | "objective" | "subjective") {
    const n = Number(bulkWeight.replace(",", "."));
    if (!Number.isFinite(n) || n <= 0) return;
    const targets = scope === "selected" ? selected : selected.filter(q => q.type === scope);
    if (targets.length === 0) return;
    const question_weights = { ...value.question_weights };
    for (const q of targets) question_weights[q.id] = n;
    onChange({ ...value, question_weights });
  }

  return <div className="space-y-4">
    <div className="space-y-2">
      <Label htmlFor="exam-title">Nome da avaliação</Label>
      <Input id="exam-title" placeholder="1ª avaliação, 2ª chamada…" value={value.title} onChange={e => onChange({ ...value, title: e.target.value })} />
      <div className="flex flex-wrap gap-1.5">
        {TITLE_PRESETS.map(p => <Button key={p} type="button" size="sm" variant="outline" className="h-7 px-2.5 text-xs" onClick={() => pickBaseTitle(p)}>{p}</Button>)}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted-foreground">Tipo:</span>
        {TYPE_PRESETS.map(t => <Button key={t} type="button" size="sm" variant="secondary" className="h-7 px-2.5 text-xs" onClick={() => pickType(t)}>{t}</Button>)}
      </div>
    </div>
    <div><Label htmlFor="exam-class">Turma e semestre</Label><select id="exam-class" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={value.class_id ?? ""} onChange={e => onChange({ ...value, class_id: e.target.value || null })}>
      <option value="">Sem turma</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.semester}</option>)}
    </select></div>
    <div><Label htmlFor="exam-header">Cabeçalho</Label><Textarea id="exam-header" rows={3} placeholder="Professor, disciplina, data, nome do aluno…" value={value.header} onChange={e => onChange({ ...value, header: e.target.value })} /></div>
    <label className="flex cursor-pointer items-center gap-2 text-sm">
      <Checkbox checked={value.order_by_weight} onCheckedChange={v => onChange({ ...value, order_by_weight: Boolean(v) })} />
      <span>Organizar questões por peso (menor para maior) mesmo ao embaralhar</span>
    </label>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-4"><h2 className="font-semibold">Questões</h2><span className="text-sm text-muted-foreground">{selected.length} selecionadas · {totalPoints.toLocaleString("pt-BR")} pontos</span></div>
    {selected.length > 0 && (
      <div className="flex flex-wrap items-center gap-2 rounded-md border bg-secondary/40 p-2.5">
        <Label htmlFor="bulk-weight" className="text-xs">Peso em grupo:</Label>
        <Input id="bulk-weight" type="number" step="0.5" min="0.1" className="h-8 w-20 bg-background text-sm" value={bulkWeight} onChange={e => setBulkWeight(e.target.value)} />
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyBulkWeight("selected")}>Aplicar às selecionadas</Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyBulkWeight("objective")}>Todas objetivas</Button>
        <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => applyBulkWeight("subjective")}>Todas subjetivas</Button>
      </div>
    )}
    <div className="flex flex-wrap gap-2"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar questões" placeholder="Buscar questões…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div>
      <select aria-label="Filtrar por tag" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={tag} onChange={e => setTag(e.target.value)}><option value="">Todas as tags</option>{tags.map(t => <option key={t} value={t}>#{t}</option>)}</select>
    </div>
    <div className="flex gap-2"><Button type="button" size="sm" variant="outline" onClick={() => onChange({ ...value, question_ids: [...new Set([...value.question_ids, ...filtered.map(q => q.id)])] })}>Selecionar filtradas</Button><Button type="button" size="sm" variant="ghost" onClick={() => onChange({ ...value, question_ids: [] })}>Limpar</Button></div>
    <div className="max-h-72 overflow-y-auto divide-y border-y">
      {filtered.map(q => {
        const isSelected = value.question_ids.includes(q.id);
        return <div key={q.id} className="flex items-start gap-3 py-3">
          <Checkbox aria-label={`Selecionar ${q.statement}`} checked={isSelected} onCheckedChange={() => toggle(q.id)} className="mt-1" />
          <button type="button" onClick={() => toggle(q.id)} className="min-w-0 flex-1 text-left">
            <span className="block whitespace-pre-wrap break-words text-sm">{q.statement}</span>
            <span className="mt-1 block break-all text-xs text-muted-foreground">{q.type === "objective" ? "Objetiva" : "Subjetiva"}{q.tags.map(t => ` · #${t}`).join("")}</span>
          </button>
          {isSelected && (
            <div className="flex shrink-0 items-center gap-1">
              <Label htmlFor={`w-${q.id}`} className="text-xs text-muted-foreground">Peso</Label>
              <Input id={`w-${q.id}`} type="number" step="0.5" min="0.1" className="h-8 w-16 text-sm" value={getWeight(q.id)} onChange={e => setWeight(q.id, e.target.value)} />
            </div>
          )}
        </div>;
      })}
      {filtered.length === 0 && <p className="py-6 text-sm text-muted-foreground">Nenhuma questão encontrada.</p>}
    </div>
  </div>;
}