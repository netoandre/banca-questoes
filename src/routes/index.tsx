import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ClipboardPaste, Shuffle, Sparkles, Tags } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Banca — monte provas embaralhadas com gabarito" },
      { name: "description", content: "Cole suas questões, a IA separa enunciado, alternativas e gabarito. Monte provas A e B embaralhadas e copie para o Word." },
      { property: "og:title", content: "Banca — monte provas embaralhadas com gabarito" },
      { property: "og:description", content: "Banco de questões com IA, provas A/B embaralhadas e versões adaptadas." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { icon: ClipboardPaste, t: "Cole e pronto", d: "A IA separa enunciado, alternativas e gabarito." },
  { icon: Shuffle, t: "Provas A, B, C…", d: "Questões e alternativas embaralhadas, agrupadas por peso." },
  { icon: Sparkles, t: "Versões adaptadas", d: "4 alternativas, linguagem direta, sem pegadinhas." },
  { icon: Tags, t: "Tags", d: "Encontre questões por assunto em segundos." },
];

function Index() {
  return (
    <div className="min-h-screen ruled">
      <div className="mx-auto max-w-4xl px-6 py-16 sm:py-24">
        <p className="font-display text-2xl font-semibold text-ink">Banca<span className="text-accent">.</span></p>
        <h1 className="mt-10 text-4xl font-bold leading-tight text-ink sm:text-6xl">
          Suas provas, montadas em <span className="bg-highlight px-1">minutos</span>.
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Banco de questões por turma e semestre, provas embaralhadas com gabarito guardado e cópia formatada para o Word.
        </p>
        <Button asChild size="lg" className="mt-8 bg-accent text-accent-foreground hover:bg-accent/90">
          <Link to="/auth">Entrar</Link>
        </Button>
        <div className="mt-16 grid gap-4 sm:grid-cols-2">
          {features.map((f) => (
            <div key={f.t} className="paper p-5">
              <f.icon className="h-5 w-5 text-accent" />
              <h3 className="mt-3 text-lg font-semibold text-ink">{f.t}</h3>
              <p className="text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
