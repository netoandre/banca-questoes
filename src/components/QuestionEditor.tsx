import { useState } from "react";
import { Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { LETTERS, type QuestionType } from "@/lib/exam";

export interface Draft {
  type: QuestionType;
  statement: string;
  options: string[];
  correct_index: number | null;
  answer_key: string;
  weight: number;
  tags: string[];
}

export function QuestionEditor({ value, onChange }: { value: Draft; onChange: (d: Draft) => void }) {
  const [tag, setTag] = useState("");
  const set = (p: Partial<Draft>) => onChange({ ...value, ...p });
  const addTag = () => {
    const t = tag.trim().toLowerCase();
    if (t && !value.tags.includes(t)) set({ tags: [...value.tags, t] });
    setTag("");
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex rounded-md border p-0.5">
          {(["objective", "subjective"] as const).map((t) => (
            <button key={t} type="button" onClick={() => set({ type: t, options: t === "objective" && value.options.length === 0 ? ["", "", "", ""] : value.options })}
              className={`rounded px-3 py-1 text-sm ${value.type === t ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>
              {t === "objective" ? "Objetiva" : "Subjetiva"}
            </button>
          ))}
        </div>
        <div className="w-24"><Label className="text-xs">Peso</Label>
          <Input type="number" step="0.5" min="0" value={value.weight} onChange={(e) => set({ weight: Number(e.target.value) })} /></div>
      </div>
      <div><Label className="text-xs">Enunciado</Label>
        <Textarea rows={5} value={value.statement} onChange={(e) => set({ statement: e.target.value })} className="font-serif text-base" /></div>
      {value.type === "objective" ? (
        <div className="space-y-2">
          <Label className="text-xs">Alternativas — clique na letra para marcar a correta</Label>
          {value.options.map((o, i) => (
            <div key={i} className="flex items-start gap-2">
              <button type="button" onClick={() => set({ correct_index: i })} aria-label={`Marcar ${LETTERS[i]} como correta`}
                className={`mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${value.correct_index === i ? "border-success bg-success text-primary-foreground" : "text-muted-foreground"}`}>
                {LETTERS[i]}
              </button>
              <Textarea rows={1} className="min-h-9" value={o} onChange={(e) => { const opts = [...value.options]; opts[i] = e.target.value; set({ options: opts }); }} />
              <Button type="button" variant="ghost" size="icon" aria-label="Remover alternativa" onClick={() => {
                const opts = value.options.filter((_, k) => k !== i);
                const ci = value.correct_index == null ? null : value.correct_index === i ? null : value.correct_index > i ? value.correct_index - 1 : value.correct_index;
                set({ options: opts, correct_index: ci });
              }}><X className="h-4 w-4" /></Button>
            </div>
          ))}
          {value.options.length < 10 && <Button type="button" variant="outline" size="sm" onClick={() => set({ options: [...value.options, ""] })}><Plus className="h-4 w-4" /> Alternativa</Button>}
        </div>
      ) : (
        <div><Label className="text-xs">Resposta esperada / critérios de correção</Label>
          <Textarea rows={3} value={value.answer_key} onChange={(e) => set({ answer_key: e.target.value })} /></div>
      )}
      <div><Label className="text-xs">Tags</Label>
        <div className="flex flex-wrap items-center gap-1.5 rounded-md border bg-background p-1.5">
          {value.tags.map((t) => (
            <span key={t} className="flex items-center gap-1 rounded bg-highlight px-2 py-0.5 text-xs">{t}
              <button type="button" aria-label={`Remover ${t}`} onClick={() => set({ tags: value.tags.filter((x) => x !== t) })}><X className="h-3 w-3" /></button></span>
          ))}
          <input className="min-w-24 flex-1 bg-transparent px-1 text-sm outline-none" placeholder="Digite e Enter" value={tag}
            onChange={(e) => setTag(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); addTag(); } }} onBlur={addTag} />
        </div>
      </div>
    </div>
  );
}

export const emptyDraft = (): Draft => ({ type: "objective", statement: "", options: ["", "", "", ""], correct_index: null, answer_key: "", weight: 1, tags: [] });
