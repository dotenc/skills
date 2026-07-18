# dotenc skills

[![skills.sh](https://skills.sh/b/dotenc/skills)](https://skills.sh/dotenc/skills)

Official, agent-agnostic skills for [dotenc](https://dotenc.org).

## Skills

- `dotenc` - Operate encrypted environments, access control, CI identities,
  and commands that receive secrets through the dotenc CLI.

## Install

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

## License

MIT

