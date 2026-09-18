import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

// No real identities, credentials, provider sessions, or project files are used.
const cli = process.env.DOTENC_TEST_CLI;
assert(cli, "Set DOTENC_TEST_CLI to the released CLI's dist/cli.js.");
const executable = resolve(cli);
const fixture = await mkdtemp(join(tmpdir(), "dotenc-plugin-smoke-"));
const project = join(fixture, "project");
const home = join(fixture, "home");
const environment = {
  PATH: process.env.PATH!, HOME: home, USERPROFILE: home,
  XDG_CONFIG_HOME: join(home, ".config"), XDG_CACHE_HOME: join(home, ".cache"),
  DOTENC_SKIP_UPDATE_CHECK: "1", NO_COLOR: "1", CI: "true",
};

function run(args: string[], input?: string) {
  return spawnSync(process.execPath, [executable, ...args], {
    cwd: project, env: environment, input, encoding: "utf8", timeout: 30000,
  });
}
function success(args: string[], input?: string) {
  const result = run(args, input);
  assert.equal(result.status, 0, `CLI failed: ${args.slice(0, 2).join(" ")} (output withheld)`);
  return result.stdout;
}
function check(name: string) { console.log(`PASS ${name}`); }

try {
  await mkdir(project, { recursive: true });
  await mkdir(join(home, ".ssh"), { recursive: true, mode: 0o700 });
  for (const name of ["alice", "bob"]) {
    const result = spawnSync("ssh-keygen", ["-q", "-t", "ed25519", "-N", "", "-f", join(home, ".ssh", name)], { encoding: "utf8" });
    assert.equal(result.status, 0, "Disposable key generation failed");
  }
  assert.equal(spawnSync("git", ["init", "-q"], { cwd: project }).status, 0);
  assert.equal(success(["--version"]).trim(), "0.14.1");
  success(["init", "--name", "alice", "--private-key", "alice"]);
  assert(await Bun.file(join(project, ".env.personal.alice.enc")).exists());
  check("initialize with explicit identity and personal profile");

  // Capture plaintext only inside this process. None is emitted to the caller.
  const before = JSON.parse(success(["env", "decrypt", "development", "--json"]));
  assert.equal(before.ok, true);
  assert.equal(JSON.parse(success(["env", "encrypt", "development", "--stdin", "--json"], "PLUGIN_SMOKE_VALUE=dummy-development\n")).ok, true);
  const probe = join(fixture, "probe.js");
  await writeFile(probe, 'if (process.env.PLUGIN_SMOKE_VALUE !== process.argv[2]) process.exit(1); console.log("injection-ok");\n');
  assert.equal(success(["run", "--strict", "-e", "development", process.execPath, probe, "dummy-development"]).trim(), "injection-ok");
  check("in-memory edit and strict child injection");

  success(["env", "encrypt", "personal.alice", "--stdin", "--json"], "PLUGIN_SMOKE_VALUE=dummy-personal\n");
  assert.equal(success(["dev", "--profile", "alice", process.execPath, probe, "dummy-personal"]).trim(), "injection-ok");
  check("personal profile overrides development");

  success(["key", "add", "bob", "--from-private-key", "bob"]);
  success(["auth", "grant", "development", "bob"]);
  const granted = JSON.parse(success(["env", "decrypt", "development", "--json"]));
  assert(granted.grantedUsers.includes("bob"));
  success(["auth", "purge", "bob", "--yes"]);
  const purged = JSON.parse(success(["env", "decrypt", "development", "--json"]));
  assert(!purged.grantedUsers.includes("bob"));
  assert.equal(purged.content, granted.content);
  check("grant and full offboarding preserve environment content");

  success(["env", "create", "staging", "alice"]);
  success(["env", "encrypt", "staging", "--stdin", "--json"], "PLUGIN_SMOKE_VALUE=dummy-staging\n");
  success(["env", "rename", "staging", "preview", "--yes"]);
  assert.equal(success(["run", "--strict", "-e", "preview", process.execPath, probe, "dummy-staging"]).trim(), "injection-ok");
  const encryptedBeforeDoctor = await readFile(join(project, ".env.development.enc"));
  const doctor = JSON.parse(success(["doctor", "--json"]));
  assert.equal(doctor.complete, true);
  assert.equal(doctor.exitCode, 0);
  assert(!JSON.stringify(doctor).includes("dummy-development"));
  assert((await readFile(join(project, ".env.development.enc"))).equals(encryptedBeforeDoctor));
  check("cryptographic rename and read-only redacted doctor report");

  const marker = join(fixture, "should-not-exist");
  const forbidden = join(fixture, "forbidden.js");
  await writeFile(forbidden, `require("node:fs").writeFileSync(${JSON.stringify(marker)}, "ran");`);
  const missing = run(["run", "--strict", "-e", "missing", process.execPath, forbidden]);
  assert.notEqual(missing.status, 0);
  assert(!(await Bun.file(marker).exists()));
  check("missing environment prevents child execution");

  const invalid = run(["env", "create", "../escape", "alice"]);
  assert.notEqual(invalid.status, 0);
  assert(!(await Bun.file(join(fixture, ".env.escape.enc")).exists()));
  check("invalid environment name is rejected");

  await writeFile(join(project, ".env.preview.enc"), "invalid-envelope\n");
  const corrupt = run(["run", "--strict", "-e", "preview", process.execPath, forbidden]);
  assert.notEqual(corrupt.status, 0);
  assert(!(await Bun.file(marker).exists()));
  check("corrupt environment prevents child execution");
} finally {
  await rm(fixture, { recursive: true, force: true });
}
