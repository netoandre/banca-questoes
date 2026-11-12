import { describe, expect, it } from "vitest";
import { isModuleLoadError, shouldReloadModule } from "./module-recovery";

describe("module load recovery", () => {
  it.each([
    "Importing a module script failed.",
    "Failed to fetch dynamically imported module: /assets/questoes.js",
    "error loading dynamically imported module: /assets/questoes.js",
  ])("recognizes browser import failures: %s", (message) => {
    expect(isModuleLoadError(new TypeError(message))).toBe(true);
  });

  it("does not reload ordinary application errors", () => {
    expect(isModuleLoadError(new Error("Permission denied"))).toBe(false);
  });

  it("reloads once and prevents a loop while the module remains unavailable", () => {
    const entries = new Map<string, string>();
    const storage = { getItem: (key: string) => entries.get(key) ?? null, setItem: (key: string, value: string) => { entries.set(key, value); } };
    const error = new TypeError("Importing a module script failed.");
    expect(shouldReloadModule(error, storage, 100_000)).toBe(true);
    expect(shouldReloadModule(error, storage, 100_001)).toBe(false);
    expect(shouldReloadModule(error, storage, 160_000)).toBe(true);
  });

  it("keeps manual recovery available when session storage is blocked", () => {
    const storage = { getItem: () => { throw new Error("Storage blocked"); }, setItem: () => {} };
    expect(shouldReloadModule(new TypeError("Importing a module script failed."), storage, 100_000)).toBe(false);
  });
});