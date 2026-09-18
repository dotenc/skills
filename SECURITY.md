# Security Policy

Report vulnerabilities through the
[dotenc security policy](https://github.com/dotenc/dotenc/security/policy).

Do not disclose suspected vulnerabilities in a public issue.

## Plugin boundary

The dotenc plugin packages instructions and brand assets. It does not bundle
the dotenc executable, an MCP server, lifecycle hooks, or credentials. It does
not grant access to a local filesystem or SSH identity; workflows require the
host's existing tools and permissions and an independently installed CLI.

Skill instructions are guidance, not a sandbox. The agent host, dotenc CLI,
authorized identity, and any wrapped child process remain part of the trust
boundary. A child can print or transmit injected values. Keep plaintext and
private-key material out of tool results, chat, logs, and command arguments;
capture sensitive output locally and report sanitized status only.

The plugin defines no dotenc-operated telemetry endpoint. The agent host's own
data handling policies still apply to conversations and tool results.

The committed plugin skill copy is generated from `skills/`; CI checks that
they match. Consumers can pin a Git commit or release tag when registering
the marketplace. A moving branch follows later publisher changes on refresh.
