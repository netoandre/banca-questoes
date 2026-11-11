import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { classesQuery, must } from "@/lib/data";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/_authenticated/turmas")({
  head: () => ({ meta: [{ title: "Turmas — Banca" }, { name: "description", content: "Suas turmas por semestre." }, { property: "og:title", content: "Turmas — Banca" }, { property: "og:description", content: "Organize suas turmas por semestre." }, { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(classesQuery),
  component: Turmas,
});

function Turmas() {
  const { data: classes } = useSuspenseQuery(classesQuery);
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [semester, setSemester] = useState(() => { const d = new Date(); return `${d.getFullYear()}.${d.getMonth() < 6 ? 1 : 2}`; });
  const add = useMutation({
    mutationFn: async () => must(await supabase.from("classes").insert({ name, semester })),
    onSuccess: () => { setName(""); qc.invalidateQueries({ queryKey: ["classes"] }); toast.success("Turma criada"); },
    onError: (e) => toast.error(e.message),
  });
  const del = useMutation({
    mutationFn: async (id: string) => must(await supabase.from("classes").delete().eq("id", id)),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["classes"] }),
  });
  const bySem = classes.reduce<Record<string, typeof classes>>((acc, c) => { (acc[c.semester] ||= []).push(c); return acc; }, {});

  return (
    <div>
      <h1 className="text-3xl font-bold text-ink">Turmas</h1>
      <form className="paper mt-6 flex flex-wrap gap-2 p-4" onSubmit={(e) => { e.preventDefault(); if (name.trim()) add.mutate(); }}>
        <Input placeholder="Nome da turma (ex.: Cálculo I — Turma A)" value={name} onChange={(e) => setName(e.target.value)} className="min-w-56 flex-1" />
        <Input placeholder="Semestre" value={semester} onChange={(e) => setSemester(e.target.value)} className="w-28" />
        <Button type="submit" disabled={add.isPending}>Adicionar</Button>
      </form>
      {Object.keys(bySem).length === 0 && <p className="mt-8 text-muted-foreground">Nenhuma turma ainda.</p>}
      {Object.entries(bySem).map(([sem, list]) => (
        <section key={sem} className="mt-8">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-accent">Semestre {sem || "—"}</h2>
          <div className="grid gap-2 sm:grid-cols-2">
            {list.map((c) => (
              <div key={c.id} className="paper flex items-center justify-between p-4">
                <span className="font-medium">{c.name}</span>
                <Button variant="ghost" size="icon" aria-label="Excluir" onClick={() => confirm("Excluir turma?") && del.mutate(c.id)}><Trash2 className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
