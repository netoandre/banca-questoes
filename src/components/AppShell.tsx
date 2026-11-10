import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { BookOpen, FileText, LogOut, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const links = [
  { to: "/questoes", label: "Questões", icon: BookOpen },
  { to: "/provas", label: "Provas", icon: FileText },
  { to: "/turmas", label: "Turmas", icon: Users },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const qc = useQueryClient();
  const navigate = useNavigate();
  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center gap-2 px-4 py-3">
          <Link to="/questoes" className="mr-4 font-display text-xl font-semibold">
            Banca<span className="text-sidebar-primary">.</span>
          </Link>
          <nav className="flex flex-1 gap-1">
            {links.map((l) => (
              <Link key={l.to} to={l.to}
                className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent"
                activeProps={{ className: "bg-sidebar-accent text-sidebar-foreground" }}>
                <l.icon className="h-4 w-4" /><span className="hidden sm:inline">{l.label}</span>
              </Link>
            ))}
          </nav>
          <button onClick={signOut} aria-label="Sair" className="rounded-md p-2 hover:bg-sidebar-accent"><LogOut className="h-4 w-4" /></button>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
    </div>
  );
}
