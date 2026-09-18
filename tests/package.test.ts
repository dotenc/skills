import { expect, test } from "bun:test";
import { readdir, readFile } from "node:fs/promises";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dir, "..");
const plugin = resolve(root, "plugins/dotenc");

test("marketplace resolves an installable self-contained dotenc plugin", async () => {
  const catalog = await Bun.file(resolve(root, ".agents/plugins/marketplace.json")).json();
  expect(catalog.name).toBe("dotenc");
  expect(catalog.plugins).toHaveLength(1);
  const entry = catalog.plugins[0];
  expect(entry.source.source).toBe("local");
  expect(resolve(root, entry.source.path)).toBe(plugin);
  expect(entry.policy).toEqual({ installation: "AVAILABLE", authentication: "ON_INSTALL" });
  const manifest = await Bun.file(resolve(plugin, ".codex-plugin/plugin.json")).json();
  expect(manifest.name).toBe(entry.name);
  expect(manifest.version).toMatch(/^\d+\.\d+\.\d+$/);
  expect(manifest.mcpServers).toBeUndefined();
  expect(manifest.apps).toBeUndefined();
  expect(manifest.interface.defaultPrompt.length).toBeLessThanOrEqual(3);
  for (const prompt of manifest.interface.defaultPrompt) expect(prompt.length).toBeLessThanOrEqual(128);
  for (const asset of [manifest.interface.logo, manifest.interface.composerIcon]) {
    expect(asset.startsWith("./assets/")).toBe(true);
    expect(await Bun.file(resolve(plugin, asset)).exists()).toBe(true);
  }
  const skill = await Bun.file(resolve(plugin, manifest.skills, "dotenc/SKILL.md")).text();
  const metadata = Bun.YAML.parse(skill.split("---")[1]) as Record<string, string>;
  expect(metadata.name).toBe("dotenc");
  expect(metadata.description.length).toBeGreaterThan(20);
});

test("bundle contains only distributable regular files and internal references resolve", async () => {
  async function inspect(directory: string) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, entry.name);
      expect(entry.isSymbolicLink()).toBe(false);
      expect(entry.name).not.toMatch(/^(?:\.env(?:\.|$)|\.DS_Store$|node_modules$)/);
      if (entry.isDirectory()) await inspect(path);
      else if (entry.name.endsWith(".md")) {
        const text = await readFile(path, "utf8");
        expect(text).not.toMatch(/-----BEGIN (?:OPENSSH |RSA |EC )?PRIVATE KEY-----/);
        for (const match of text.matchAll(/\]\(([^)#]+)(?:#[^)]*)?\)/g)) {
          if (/^https?:/.test(match[1])) continue;
          const linked = resolve(directory, match[1]);
          expect(relative(plugin, linked).startsWith("..")).toBe(false);
          expect(await Bun.file(linked).exists()).toBe(true);
        }
      }
    }
  }
  await inspect(plugin);
});
