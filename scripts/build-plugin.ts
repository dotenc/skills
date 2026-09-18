import { cp, mkdir, readdir, readFile, rm } from "node:fs/promises";
import { resolve, relative } from "node:path";

const root = resolve(import.meta.dir, "..");
const source = resolve(root, "skills");
const target = resolve(root, "plugins/dotenc/skills");

async function files(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...await files(path));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unsupported package entry: ${relative(root, path)}`);
  }
  return result.sort();
}

await files(source); // Reject links instead of packaging files outside the source.
if (process.argv.includes("--check")) {
  const expected = (await files(source)).map(path => relative(source, path));
  const actual = (await files(target)).map(path => relative(target, path));
  if (JSON.stringify(expected) !== JSON.stringify(actual)) {
    throw new Error("Bundled skill files differ; run bun run build.");
  }
  for (const file of expected) {
    if (!(await readFile(resolve(source, file))).equals(await readFile(resolve(target, file)))) {
      throw new Error(`Bundled ${file} is stale; run bun run build.`);
    }
  }
  if (!(await readFile(resolve(root, "LICENSE"))).equals(await readFile(resolve(root, "plugins/dotenc/LICENSE")))) {
    throw new Error("Bundled license is stale; run bun run build.");
  }
  console.log("Plugin skill bundle and license match their sources.");
} else {
  await rm(target, { recursive: true, force: true });
  await mkdir(target, { recursive: true });
  await cp(source, target, { recursive: true });
  await cp(resolve(root, "LICENSE"), resolve(root, "plugins/dotenc/LICENSE"));
  console.log("Built plugins/dotenc from canonical skills/ sources.");
}
