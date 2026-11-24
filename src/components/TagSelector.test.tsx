import { useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { TagSelector } from "./TagSelector";

beforeAll(() => {
  vi.stubGlobal("ResizeObserver", class {
    observe() {}
    unobserve() {}
    disconnect() {}
  });
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);

function Form() {
  const [tags, setTags] = useState<string[]>([]);
  return <TagSelector value={tags} onChange={setTags} existingTags={["matemática", "história"]} />;
}

describe("Tag selection", () => {
  it("searches an existing tag and allows selection and removal without typing its full name", async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar tags" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "mate" } });
    fireEvent.click(await screen.findByRole("option", { name: "Tag matemática" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover tag matemática" }));
    expect(screen.queryByRole("button", { name: "Remover tag matemática" })).not.toBeInTheDocument();
  });

  it("still creates new lowercase tags and does not offer to duplicate an existing tag", async () => {
    render(<Form />);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar tags" }));
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "BIOLOGIA" } });
    fireEvent.click(await screen.findByRole("option", { name: "Criar “biologia”" }));
    expect(screen.getByRole("button", { name: "Remover tag biologia" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "matemática" } });
    expect(screen.queryByRole("option", { name: "Criar “matemática”" })).not.toBeInTheDocument();
  });
});