# dotenc skills and plugin

[![skills.sh](https://skills.sh/b/dotenc/skills)](https://skills.sh/dotenc/skills)

Official, agent-agnostic skills for [dotenc](https://dotenc.org).

Use the dotenc plugin in Codex to diagnose encrypted environments, manage
access, and run authorized commands with the dotenc CLI. The plugin is skills
only; it needs an installed CLI, the target repository, and an authorized
identity in the execution environment. It does not connect a web chat to your
computer or install the CLI automatically.

## Install the plugin from Git

With Codex installed, register the marketplace and install the plugin:

```bash
codex plugin marketplace add dotenc/skills
codex plugin add dotenc@dotenc
```

Open a new task and try "Check this project with dotenc doctor" or mention the
dotenc plugin. If the app's plugin list has not refreshed, restart the app.
The marketplace is named `dotenc`; this is Git distribution, not a listing in
OpenAI's public Plugins Directory.

For a reproducible installation, use a release tag or full commit:

```bash
codex plugin marketplace add dotenc/skills --ref plugin-v0.1.0
codex plugin add dotenc@dotenc
```

Inspect your configured source with `codex plugin marketplace list`. To follow
new commits on an unpinned source, run `codex plugin marketplace upgrade dotenc`,
then `codex plugin add dotenc@dotenc` and start a new task. A pinned source stays
on its selected ref; register the desired new ref to change it.

The plugin is validated against dotenc CLI `0.14.1`. For human-run CLI setup,
see the [official installation guide](https://dotenc.org/#installation).
Prefer one installation method per agent: the plugin already includes the skill,
so it does not also need a skills.sh installation of the same skill.

## Skills

- `dotenc` - Operate encrypted environments, access control, CI identities,
  and commands that receive secrets through the dotenc CLI.

## Install the standalone skill

```bash
npx skills add dotenc/skills --skill dotenc
```

List the available skills without installing:

```bash
npx skills add dotenc/skills --list
```

## Layout

Each skill lives under `skills/<name>/` and contains a `SKILL.md` file with
the required `name` and `description` frontmatter.

`skills/` is the canonical source. `plugins/dotenc/` is a self-contained plugin
package; its skill copy and license are generated with `bun run build` and
committed so a Git install works without a build step. The marketplace catalog
is `.agents/plugins/marketplace.json`. Plugin versions are independent of CLI
versions.

## Development and validation

Use Bun 1.3.14:

```bash
bun run build
bun run check
bun run test
DOTENC_TEST_CLI=/absolute/path/to/dotenc/dist/cli.js bun run test:cli
```

The last command needs the published `@dotenc/cli@0.14.1` package and
`ssh-keygen`. It uses disposable keys and dummy values in a temporary home,
tests initialization, encrypted edits, command injection, personal profiles,
access changes, renaming, diagnostics, and failure behavior, then deletes its
fixtures. It never uses your real SSH keys or encrypted environments.

Before a release, validate the plugin with the Codex plugin-creator validator,
test a Git-based installation, and inspect the installed skill. See
[release checks](docs/RELEASING.md) for the procedure and behavioral cases.

## License

MIT
