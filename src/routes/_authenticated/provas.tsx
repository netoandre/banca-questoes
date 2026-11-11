import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { FileText, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, examsQuery, must, questionsQuery } from "@/lib/data";
import { ExamEditor, type ExamDraft } from "@/components/ExamEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export const Route = createFileRoute("/_authenticated/provas")({
  head: () => ({ meta: [{ title: "Provas — Banca" }, { name: "description", content: "Avaliações por turma e semestre com versões embaralhadas e gabaritos salvos." }, { property: "og:title", content: "Provas — Banca" }, { property: "og:description", content: "Monte e organize suas avaliações por turma." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => Promise.all([context.queryClient.ensureQueryData(examsQuery), context.queryClient.ensureQueryData(classesQuery), context.queryClient.ensureQueryData(questionsQuery)]),
  component: Provas,
});

function Provas() {
  const { data: exams } = useSuspenseQuery(examsQuery);
  const { data: classes } = useSuspenseQuery(classesQuery);
  const { data: questions } = useSuspenseQuery(questionsQuery);
  const qc = useQueryClient(); const navigate = useNavigate();
  const [draft, setDraft] = useState<ExamDraft | null>(null);
  const [search, setSearch] = useState(""); const [classId, setClassId] = useState("");
  const create = useMutation({
    mutationFn: async () => { if (!draft) throw new Error("Preencha a avaliação."); return must(await supabase.from("exams").insert({ ...draft, title: draft.title.trim() }).select("id").single()); },
    onSuccess: async row => { await qc.invalidateQueries({ queryKey: ["exams"] }); setDraft(null); toast.success("Prova criada"); navigate({ to: "/provas/$examId", params: { examId: row.id } }); },
    onError: e => toast.error(e.message),
  });
  const del = useMutation({ mutationFn: async (id: string) => must(await supabase.from("exams").delete().eq("id", id)), onSuccess: () => qc.invalidateQueries({ queryKey: ["exams"] }), onError: e => toast.error(e.message) });
  const filtered = exams.filter(e => e.title.toLocaleLowerCase().includes(search.toLocaleLowerCase()) && (!classId || e.class_id === classId));
  return <div>
    <div className="flex flex-wrap items-center justify-between gap-3"><h1 className="text-3xl font-bold text-ink">Provas</h1><Button onClick={() => setDraft({ title: "", header: "", class_id: classId || null, question_ids: [] })}><Plus /> Nova prova</Button></div>
    <div className="mt-6 flex flex-wrap gap-3"><div className="relative min-w-0 flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><Input aria-label="Buscar provas" placeholder="Buscar avaliações…" className="pl-9" value={search} onChange={e => setSearch(e.target.value)} /></div><select aria-label="Filtrar por turma" className="h-10 max-w-full rounded-md border bg-background px-3 text-sm" value={classId} onChange={e => setClassId(e.target.value)}><option value="">Todas as turmas</option>{classes.map(c => <option key={c.id} value={c.id}>{c.name} — {c.semester}</option>)}</select></div>
    <p className="mt-4 text-sm text-muted-foreground">{filtered.length} avaliação(ões)</p>
    <div className="mt-3 grid gap-3 sm:grid-cols-2">{filtered.map(exam => { const c = classes.find(c => c.id === exam.class_id); return <div key={exam.id} className="paper flex items-start gap-3 p-5"><FileText className="mt-1 h-5 w-5 shrink-0 text-accent" /><Link to="/provas/$examId" params={{ examId: exam.id }} className="min-w-0 flex-1"><h2 className="break-words text-xl font-semibold text-ink">{exam.title}</h2><p className="mt-1 text-sm text-muted-foreground">{c ? `${c.name} · ${c.semester}` : "Sem turma"}</p><p className="mt-3 text-xs text-muted-foreground">{exam.question_ids.length} questões · {new Date(exam.created_at).toLocaleDateString("pt-BR")}</p></Link><Button variant="ghost" size="icon" aria-label={`Excluir ${exam.title}`} disabled={del.isPending} onClick={() => confirm("Excluir esta prova e todas as versões e gabaritos salvos?") && del.mutate(exam.id)}><Trash2 /></Button></div>; })}</div>
    {filtered.length === 0 && <div className="py-16 text-center"><FileText className="mx-auto h-10 w-10 text-muted-foreground" /><p className="mt-4 text-muted-foreground">{exams.length ? "Nenhuma avaliação encontrada." : "Nenhuma prova cadastrada."}</p></div>}
    <Dialog open={!!draft} onOpenChange={open => !open && !create.isPending && setDraft(null)}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl"><DialogHeader><DialogTitle>Nova prova</DialogTitle></DialogHeader>{draft && <ExamEditor value={draft} onChange={setDraft} classes={classes} questions={questions} />}<DialogFooter><Button disabled={create.isPending || !draft?.title.trim()} onClick={() => create.mutate()}>{create.isPending ? "Salvando…" : "Salvar prova"}</Button></DialogFooter></DialogContent></Dialog>
  </div>;
}