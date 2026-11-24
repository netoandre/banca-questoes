import { useState } from "react";
import { Check, Plus, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";

export function TagSelector({ value, onChange, existingTags, label = "Tags" }: {
  value: string[];
  onChange: (tags: string[]) => void;
  existingTags: string[];
  label?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const options = [...new Set([...existingTags, ...value])].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const newTag = search.trim().toLowerCase();
  const canCreate = Boolean(newTag) && !options.includes(newTag);
  const toggle = (tag: string) => onChange(value.includes(tag) ? value.filter((t) => t !== tag) : [...value, tag]);
  const create = () => {
    if (!canCreate) return;
    onChange([...value, newTag]);
    setSearch("");
  };

  return (
    <div className="min-w-0 space-y-2">
      <Label className="text-xs">{label}</Label>
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        {value.map((tag) => (
          <span key={tag} className="flex max-w-full min-w-0 items-center gap-1 rounded bg-highlight px-2 py-0.5 text-xs">
            <span className="min-w-0 break-all">{tag}</span>
            <Button type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0" aria-label={`Remover tag ${tag}`} onClick={() => toggle(tag)}>
              <X className="h-3 w-3" />
            </Button>
          </span>
        ))}
        <Popover open={open} onOpenChange={(next) => { setOpen(next); if (!next) setSearch(""); }}>
          <PopoverTrigger asChild>
            <Button type="button" variant="outline" size="sm"><Tags className="h-4 w-4" /> Selecionar tags</Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-80 max-w-[calc(100vw-2rem)] p-0">
            <Command>
              <CommandInput aria-label="Buscar ou criar tag" placeholder="Buscar ou criar tag…" value={search} onValueChange={setSearch}
                onKeyDown={(e) => { if (e.key === ",") { e.preventDefault(); create(); } }} />
              <CommandList className="max-h-52">
                <CommandEmpty>Nenhuma tag encontrada.</CommandEmpty>
                <CommandGroup>
                  {options.map((tag) => (
                    <CommandItem key={tag} value={tag} onSelect={() => toggle(tag)} aria-label={`Tag ${tag}`}>
                      <Check className={value.includes(tag) ? "opacity-100" : "opacity-0"} />
                      <span className="min-w-0 break-all">{tag}</span>
                    </CommandItem>
                  ))}
                  {canCreate && <CommandItem value={newTag} onSelect={create}>
                    <Plus /><span className="min-w-0 break-all">Criar “{newTag}”</span>
                  </CommandItem>}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}