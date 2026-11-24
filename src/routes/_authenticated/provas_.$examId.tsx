import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowLeft, Copy, FileText, KeyRound, Loader2, Pencil, Shuffle, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, examQuery, must, questionsQuery, versionsQuery, type VersionRow } from "@/lib/data";
import { answerKeyText, copyRich, LETTERS, versionToHtml, versionToText } from "@/lib/exam";
import { generateExamVersions } from "@/lib/exam-generation";
import { ExamEditor, type ExamDraft } from "@/components/ExamEditor";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/_authenticated/provas_/$examId")({
  head: () => ({ meta: [{ title: "Versões e gabaritos — Banca" }, { name: "description", content: "Gere versões da avaliação, consulte os gabaritos salvos e copie a prova formatada para Word." }, { property: "og:title", content: "Versões e gabaritos — Banca" }, { property: "og:description", content: "Avaliações embaralhadas com gabarito por versão." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context, params }) => Promise.all([context.queryClient.ensureQueryData(examQuery(params.examId)), context.queryClient.ensureQueryData(versionsQuery(params.examId)), context.queryClient.ensureQueryData(questionsQuery), context.queryClient.ensureQueryData(classesQuery)]),
  component: ExamDetail,
});

function ExamDetail() {
  const { examId } = Route.useParams();
  const { data: exam } = useSuspenseQuery(examQuery(examId));
  const { data: versions } = useSuspenseQuery(versionsQuery(examId));
  const { data: questions } = useSuspenseQuery(questionsQuery);
  const { data: classes } = useSuspenseQuery(classesQuery);
  const qc = useQueryClient();
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [count, setCount] = useState(2); const [activeId, setActiveId] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [orderByWeight, setOrderByWeight] = useState(exam.order_by_weight);
  const [renaming, setRenaming] = useState<VersionRow | null>(null);
  const [renameLabel, setRenameLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const active = versions.find(v => v.id === activeId) ?? versions[0];
  const c = classes.find(c => c.id === exam.class_id);
  const update = useMutation({ mutationFn: async () => { if (!draft) return; must(await supabase.from("exams").update({ ...draft, title: draft.title.trim() }).eq("id", examId)); }, onSuccess: async () => { if (draft) setOrderByWeight(draft.order_by_weight); await Promise.all([qc.invalidateQueries({ queryKey: ["exam", examId] }), qc.invalidateQueries({ queryKey: ["exams"] })]); setDraft(null); toast.success("Prova atualizada"); }, onError: e => toast.error(e.message) });
  const generate = useMutation({
    mutationFn: async () => {
      const labels = Array.from({ length: count }, (_, i) => `${LETTERS[i]}${versions.length ? ` · lote ${versions.length + 1}` : ""}`);
      const rows = generateExamVersions(examId, exam.question_ids, questions, labels, { weights: exam.question_weights, orderByWeight });
      return must(await supabase.from("exam_versions").insert(rows.map(row => ({ ...row, items: row.items.map(item => ({ ...item })) }))).select("*")) as unknown as VersionRow[];
    },
    onSuccess: async rows => { await qc.invalidateQueries({ queryKey: ["versions", examId] }); setActiveId(rows[0]?.id ?? ""); setShowKey(false); toast.success("Versões e gabaritos salvos"); },
    onError: e => toast.error(e.message),
  });
  const rename = useMutation({
    mutationFn: async () => { if (!renaming) return; must(await supabase.from("exam_versions").update({ label: renameLabel.trim() }).eq("id", renaming.id)); },
    onSuccess: async () => { await qc.invalidateQueries({ queryKey: ["versions", examId] }); setRenaming(null); toast.success("Versão renomeada"); },
    onError: e => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async (id: string) => { must(await supabase.from("exam_versions").delete().eq("id", id)); },
    onSuccess: async (_d, id) => { if (activeId === id) setActiveId(""); setDeletingId(null); await qc.invalidateQueries({ queryKey: ["versions", examId] }); toast.success("Versão excluída"); },
    onError: e => toast.error(e.message),
  });
  async function copy(key: boolean) {
    if (!active) return;
    try {
      if (key) await navigator.clipboard.writeText(`${exam.title} — Gabarito ${active.label}\n\n${answerKeyText(active.items)}`);
      else await copyRich(versionToHtml(exam.title, exam.header, active.label, active.items), versionToText(exam.title, exam.header, active.label, active.items));
      toast.success(key ? "Gabarito copiado" : "Prova copiada para colar no Word");
    } catch { toast.error("O navegador não permitiu copiar. Autorize o acesso à área de transferência e tente novamente."); }
  }
  return <div>
    <Button asChild variant="ghost" size="sm" className="mb-4"><Link to="/provas"><ArrowLeft /> Provas</Link></Button>
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h1 className="break-words text-3xl font-bold text-ink">{exam.title}</h1><p className="mt-1 text-sm text-muted-foreground">{c ? `${c.name} · ${c.semester}` : "Sem turma"} · {exam.question_ids.length} questões</p></div><Button variant="outline" onClick={() => setDraft({ title: exam.title, header: exam.header, class_id: exam.class_id, question_ids: exam.question_ids, question_weights: exam.question_weights ?? {}, order_by_weight: exam.order_by_weight })}><Pencil /> Editar prova</Button></div>
    <div className="mt-6 flex flex-wrap items-center gap-3 border-y py-4">
      <select aria-label="Quantidade de versões" className="h-9 rounded-md border bg-background px-3 text-sm" value={count} onChange={e => setCount(Number(e.target.value))}>{[1, 2, 3, 4].map(n => <option key={n} value={n}>{n} {n === 1 ? "versão" : "versões"}</option>)}</select>
      <label className="flex cursor-pointer items-center gap-2 text-sm">
        <Checkbox checked={orderByWeight} onCheckedChange={v => setOrderByWeight(Boolean(v))} />
        <span>Organizar por peso</span>
      </label>
      <Button onClick={() => generate.mutate()} disabled={generate.isPending || exam.question_ids.length === 0}>{generate.isPending ? <Loader2 className="animate-spin" /> : <Shuffle />}{generate.isPending ? "Gerando…" : "Gerar versões"}</Button>
      <span className="text-sm text-muted-foreground">{versions.length} versões salvas</span>
    </div>
    {active ? <>
      <Tabs className="mt-5" value={active.id} onValueChange={setActiveId}><TabsList className="h-auto max-w-full flex-wrap justify-start gap-1">{versions.map(v => <TabsTrigger key={v.id} value={v.id}>Prova {v.label}</TabsTrigger>)}</TabsList></Tabs>
      <div className="my-4 flex flex-wrap gap-2"><Button variant={showKey ? "default" : "outline"} onClick={() => setShowKey(s => !s)}><KeyRound />{showKey ? "Ocultar gabarito" : "Ver gabarito"}</Button><Button variant="outline" onClick={() => copy(false)}><Copy /> Copiar para Word</Button><Button variant="ghost" onClick={() => copy(true)}><Copy /> Copiar gabarito</Button><Button variant="ghost" size="sm" onClick={() => { setRenaming(active); setRenameLabel(active.label); }}><Pencil /> Renomear</Button><Button variant="ghost" size="sm" className="text-destructive" onClick={() => setDeletingId(active.id)}><Trash2 /> Excluir</Button></div>
      {showKey ? <section className="border-t py-6"><h2 className="text-xl font-semibold">Gabarito — Prova {active.label}</h2><pre className="mt-4 whitespace-pre-wrap break-words font-sans text-sm leading-7">{answerKeyText(active.items)}</pre></section> : <article className="mx-auto max-w-3xl border bg-paper px-5 py-8 sm:px-12"><h2 className="break-words text-center text-xl font-bold">{exam.title} — Prova {active.label}</h2>{exam.header && <p className="mt-4 whitespace-pre-wrap break-words font-serif">{exam.header}</p>}<p className="mt-4 border-b pb-4 text-sm text-muted-foreground">{active.items.length} questões · {active.items.reduce((s, it) => s + it.weight, 0).toLocaleString("pt-BR")} pontos</p><div className="mt-6 space-y-8">{active.items.map(it => <section key={it.number}><h3 className="font-sans text-sm font-semibold">Questão {it.number} <span className="font-normal">({it.weight.toLocaleString("pt-BR")} pontos)</span></h3><p className="mt-2 whitespace-pre-wrap break-words font-serif">{it.statement}</p>{it.options.length > 0 ? <ol className="mt-3 space-y-2">{it.options.map((option, i) => <li key={i} className="break-words font-serif">{LETTERS[i]}) {option}</li>)}</ol> : <div className="mt-4 space-y-7" aria-label="Espaço para resposta">{Array.from({ length: 6 }, (_, i) => <div key={i} className="border-b" />)}</div>}</section>)}</div></article>}
    </> : <div className="py-16 text-center"><FileText className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 text-muted-foreground">Nenhuma versão gerada.</p>{exam.question_ids.length === 0 && <Button variant="link" onClick={() => setDraft({ ...exam })}>Selecionar questões</Button>}</div>}
    <Dialog open={!!renaming} onOpenChange={open => !open && !rename.isPending && setRenaming(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Renomear versão</DialogTitle></DialogHeader><div className="space-y-2"><Label htmlFor="version-label">Nome da versão</Label><Input id="version-label" value={renameLabel} onChange={e => setRenameLabel(e.target.value)} placeholder="A, B, Adaptada…" /></div><DialogFooter><Button disabled={rename.isPending || !renameLabel.trim()} onClick={() => rename.mutate()}>{rename.isPending ? <Loader2 className="animate-spin" /> : null}Salvar</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!deletingId} onOpenChange={open => !open && !remove.isPending && setDeletingId(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Excluir versão</DialogTitle></DialogHeader><p className="text-sm text-muted-foreground">A versão {versions.find(v => v.id === deletingId)?.label} e o gabarito salvo dela serão excluídos. Essa ação não pode ser desfeita.</p><DialogFooter><Button variant="outline" onClick={() => setDeletingId(null)}>Cancelar</Button><Button variant="destructive" disabled={remove.isPending} onClick={() => deletingId && remove.mutate(deletingId)}>{remove.isPending ? <Loader2 className="animate-spin" /> : <Trash2 />}Excluir</Button></DialogFooter></DialogContent></Dialog>
    <Dialog open={!!draft} onOpenChange={open => !open && !update.isPending && setDraft(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Editar prova</DialogTitle></DialogHeader>{draft && <ExamEditor value={draft} onChange={setDraft} classes={classes} questions={questions} />}{versions.length > 0 && <p className="text-sm text-muted-foreground">As questões e os gabaritos das versões já geradas serão preservados.</p>}<DialogFooter><Button disabled={update.isPending || !draft?.title.trim()} onClick={() => update.mutate()}>Salvar alterações</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}