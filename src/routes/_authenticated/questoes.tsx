import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { ClipboardPaste, Loader2, Pencil, Plus, Search, Sparkles, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { must, questionsQuery } from "@/lib/data";
import { LETTERS, type Question } from "@/lib/exam";
import { adaptQuestion, generateQuestion, parseQuestions } from "@/lib/ai.functions";
import { QuestionEditor, emptyDraft, type Draft } from "@/components/QuestionEditor";
import { Button } from "@/components/ui/button";
import { TagSelector } from "@/components/TagSelector";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/questoes")({
  head: () => ({ meta: [{ title: "Banco de questões — Banca" }, { name: "description", content: "Seu banco de questões com tags." }, { property: "og:title", content: "Banco de questões — Banca" }, { property: "og:description", content: "Cadastre, edite e adapte questões com tags e gabarito." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(questionsQuery),
  component: Questoes,
});

const toDraft = (q: Question): Draft => ({ type: q.type, statement: q.statement, options: q.options, correct_index: q.correct_index, answer_key: q.answer_key, tags: q.tags });

function Questoes() {
  const { data: questions } = useSuspenseQuery(questionsQuery);
  const qc = useQueryClient();
  const refresh = () => qc.invalidateQueries({ queryKey: ["questions"] });
  const [search, setSearch] = useState("");
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [editing, setEditing] = useState<{ id?: string; draft: Draft; extra?: Partial<{ adapted: boolean; source_id: string }> } | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [adaptingId, setAdaptingId] = useState<string | null>(null);
  const adaptFn = useServerFn(adaptQuestion);

  const allTags = useMemo(() => [...new Set(questions.flatMap((q) => q.tags))].sort(), [questions]);
  const filtered = questions.filter((q) =>
    (!search || q.statement.toLowerCase().includes(search.toLowerCase())) && tagFilter.every((t) => q.tags.includes(t)));

  const save = useMutation({
    mutationFn: async () => {
      if (!editing) return;
      const row = { ...editing.draft, ...editing.extra };
      if (editing.id) must(await supabase.from("questions").update(row).eq("id", editing.id));
      else must(await supabase.from("questions").insert(row));
    },
    onSuccess: () => { setEditing(null); refresh(); toast.success("Questão salva"); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => must(await supabase.from("questions").delete().eq("id", id)),
    onSuccess: refresh,
  });

  async function adapt(q: Question) {
    setAdaptingId(q.id);
    try {
      const { question } = await adaptFn({ data: { question: toDraft(q) } });
      setEditing({ draft: { ...question, tags: [...new Set([...q.tags, "adaptada"])] }, extra: { adapted: true, source_id: q.id } });
      toast.success("Versão adaptada pronta — revise e salve");
    } catch { toast.error("Não foi possível adaptar agora. Tente novamente."); }
    setAdaptingId(null);
  }

  return (
    <div>
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <h1 className="min-w-0 truncate text-3xl font-bold text-ink">Banco de questões</h1>
        <div className="flex min-w-0 flex-wrap gap-2">
          <Button variant="outline" onClick={() => setAiOpen(true)}><Sparkles className="h-4 w-4" /> Criar com IA</Button>
          <Button variant="outline" onClick={() => setImportOpen(true)}><ClipboardPaste className="h-4 w-4" /> Colar questões</Button>
          <Button onClick={() => setEditing({ draft: emptyDraft() })}><Plus className="h-4 w-4" /> Nova</Button>
        </div>
      </div>
      <div className="mt-6 flex items-center gap-2 rounded-md border bg-paper px-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <input className="h-10 flex-1 bg-transparent text-sm outline-none" placeholder="Buscar no enunciado…" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {allTags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {allTags.map((t) => (
            <button key={t} onClick={() => setTagFilter((f) => f.includes(t) ? f.filter((x) => x !== t) : [...f, t])}
              className={`max-w-full break-all rounded-full border px-2.5 py-0.5 text-left text-xs ${tagFilter.includes(t) ? "border-accent bg-accent text-accent-foreground" : "bg-paper text-muted-foreground"}`}>#{t}</button>
          ))}
        </div>
      )}
      <p className="mt-4 text-sm text-muted-foreground">{filtered.length} questão(ões)</p>
      <div className="mt-2 space-y-3">
        {filtered.map((q) => (
          <QuestionCard key={q.id} q={q} actions={<>
            <Button variant="ghost" size="sm" onClick={() => adapt(q)} disabled={adaptingId === q.id} title="Gerar versão adaptada">
              {adaptingId === q.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}<span className="hidden sm:inline">Adaptar</span></Button>
            <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => setEditing({ id: q.id, draft: toDraft(q) })}><Pencil className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir questão?") && del.mutate(q.id)}><Trash2 className="h-4 w-4" /></Button>
          </>} />
        ))}
        {questions.length === 0 && <p className="paper p-8 text-center text-muted-foreground">Comece colando suas questões — a IA separa tudo para você.</p>}
      </div>

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Editar questão" : editing?.extra?.adapted ? "Questão adaptada" : "Nova questão"}</DialogTitle></DialogHeader>
          {editing && <QuestionEditor value={editing.draft} onChange={(draft) => setEditing({ ...editing, draft })} existingTags={allTags} />}
          <DialogFooter><Button onClick={() => save.mutate()} disabled={save.isPending || !editing?.draft.statement.trim()}>Salvar</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <AiDialog open={aiOpen} onOpenChange={setAiOpen} existingTags={allTags} onReady={(draft) => { setAiOpen(false); setEditing({ draft }); }} />
      <ImportDialog open={importOpen} onOpenChange={setImportOpen} existingTags={allTags} onDone={refresh} />
    </div>
  );
}

function QuestionCard({ q, actions }: { q: Question; actions?: React.ReactNode }) {
  return (
    <div className="paper p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex flex-wrap gap-1.5 text-xs">
            <span className="rounded bg-secondary px-1.5 py-0.5">{q.type === "objective" ? "Objetiva" : "Subjetiva"}</span>
            {q.adapted && <span className="rounded bg-accent px-1.5 py-0.5 text-accent-foreground">Adaptada</span>}
            {q.tags.map((t) => <span key={t} className="max-w-full break-all text-muted-foreground">#{t}</span>)}
          </div>
          <p className="whitespace-pre-wrap break-words font-serif">{q.statement}</p>
          {q.options.length > 0 && (
            <ol className="mt-2 space-y-0.5 text-sm">
              {q.options.map((o, i) => (
                <li key={i} className={`break-words ${i === q.correct_index ? "font-semibold text-success" : ""}`}>{LETTERS[i]}) {o}</li>
              ))}
            </ol>
          )}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center justify-end gap-1 border-t pt-2 sm:border-t-0 sm:pt-0">{actions}</div>}
      </div>
    </div>
  );
}

function ImportDialog({ open, onOpenChange, onDone, existingTags }: { open: boolean; onOpenChange: (o: boolean) => void; onDone: () => void; existingTags: string[] }) {
  const parseFn = useServerFn(parseQuestions);
  const [text, setText] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);
  const [busy, setBusy] = useState(false);

  async function parse() {
    setBusy(true);
    try {
      const { questions } = await parseFn({ data: { text } });
      setDrafts(questions.map((q) => ({ ...q, tags: [...tags] })));
      if (questions.length === 0) toast.error("Nenhuma questão identificada");
    } catch { toast.error("Não foi possível ler as questões. Tente novamente."); }
    setBusy(false);
  }
  async function saveAll() {
    if (!drafts) return;
    setBusy(true);
    const { error } = await supabase.from("questions").insert(drafts);
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${drafts.length} questões salvas`);
    setDrafts(null); setText(""); setTags([]); onOpenChange(false); onDone();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{drafts ? `Revise ${drafts.length} questões` : "Colar questões"}</DialogTitle></DialogHeader>
        {!drafts ? (
          <div className="space-y-3">
            <Textarea rows={14} placeholder={"Cole aqui as questões, alternativas e gabarito em qualquer formato.\n\n1) Qual é...\na) ...\nb) ...\n\nGabarito: 1-B"} value={text} onChange={(e) => setText(e.target.value)} className="font-serif" />
            <TagSelector label="Tags para todas as questões" value={tags} onChange={setTags} existingTags={existingTags} />
          </div>
        ) : (
          <div className="space-y-6">
            {drafts.map((d, i) => (
              <div key={i} className="rounded-md border p-4">
                <div className="mb-2 flex justify-between text-sm font-semibold">Questão {i + 1}
                  <button className="text-destructive" onClick={() => setDrafts(drafts.filter((_, k) => k !== i))}>Descartar</button></div>
                <QuestionEditor value={d} onChange={(nd) => setDrafts(drafts.map((x, k) => (k === i ? nd : x)))} existingTags={[...new Set([...existingTags, ...drafts.flatMap((draft) => draft.tags)])]} />
              </div>
            ))}
          </div>
        )}
        <DialogFooter>
          {drafts && <Button variant="outline" onClick={() => setDrafts(null)}>Voltar</Button>}
          {!drafts ? (
            <Button onClick={parse} disabled={busy || !text.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Identificar com IA</Button>
          ) : (
            <Button onClick={saveAll} disabled={busy || drafts.length === 0}>Salvar todas</Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AiDialog({ open, onOpenChange, onReady, existingTags }: { open: boolean; onOpenChange: (o: boolean) => void; onReady: (d: Draft) => void; existingTags: string[] }) {
  const genFn = useServerFn(generateQuestion);
  const [type, setType] = useState<"objective" | "subjective">("objective");
  const [difficulty, setDifficulty] = useState<"fácil" | "média" | "difícil">("média");
  const [topic, setTopic] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  async function run() {
    setBusy(true);
    try {
      const { question, tags } = await genFn({ data: { type, difficulty, topic } });
      onReady({ ...question, tags: [...new Set([...selectedTags, ...tags, "ia"])] });
      setSelectedTags([]);
      toast.success("Questão criada — revise e salve");
    } catch { toast.error("Não foi possível criar a questão agora. Tente novamente."); }
    setBusy(false);
  }
  const seg = <T extends string>(opts: readonly T[], v: T, set: (x: T) => void, label: (x: T) => string) => (
    <div className="flex rounded-md border p-0.5">{opts.map((o) => (
      <button key={o} type="button" onClick={() => set(o)} className={`flex-1 rounded px-3 py-1 text-sm ${v === o ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>{label(o)}</button>))}</div>
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader><DialogTitle>Criar questão com IA</DialogTitle></DialogHeader>
        <div className="space-y-3">
          {seg(["objective", "subjective"] as const, type, setType, (x) => (x === "objective" ? "Objetiva" : "Subjetiva"))}
          {seg(["fácil", "média", "difícil"] as const, difficulty, setDifficulty, (x) => x.charAt(0).toUpperCase() + x.slice(1))}
          <Textarea rows={5} placeholder={"Tema geral ou instrução. Ex.: Revolução Francesa, causas econômicas; questão com interpretação de um trecho curto."} value={topic} onChange={(e) => setTopic(e.target.value)} />
          <TagSelector value={selectedTags} onChange={setSelectedTags} existingTags={existingTags} />
        </div>
        <DialogFooter><Button onClick={run} disabled={busy || !topic.trim()}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} Gerar questão</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
