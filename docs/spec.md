# Terminal Plugin Specification

## Surfaces

The plugin owns both terminal surfaces and they share one PTY manager.

- The dock panel is the browser surface. It mounts in the composer dock slot,
  stores its own per-Session state in the browser, and drives the manager over
  `POST /api/dsh-terminal` plus the `panel.js` and `panel.css` assets that carry
  xterm. Panel terminals are owned by the Session and work before any agent runs.
- Agent tools are the model surface. Local tools use the official Harness
  terminal registry composed by this bundle's patch; remote tools use
  `remote-pty-*` ids through the same manager with an exact-object owner check.

`dsh-plugin-sidebar` owns files only. The panel no longer depends on the right
sidebar or on any other plugin's HTTP route, so removing the sidebar leaves the
terminal panel intact.

## Panel transport

The panel resolves its placement from server state, never from client input:

| Action | Effect |
| --- | --- |
| `workspace` | The Session's current target: kind, root, connection, label, read-only |
| `connections` | Allow-listed SSH connections the target selector may offer |
| `listTerminals` | The Session owner's terminals |
| `openTerminal` | Local PTY, or a remote PTY on the bound connection in its root |
| `readTerminal` | Raw output after a cursor, with `reset` for a dropped buffer |
| `writeTerminal` | Raw keystrokes from the terminal |
| `resizeTerminal` | PTY size after a container resize |
| `sendTerminal` | A bounded line plus Enter, for callers that want readiness |
| `signalTerminal` | One allowed POSIX signal to the foreground process group |
| `closeTerminal` | Close and await PTY teardown |

Every mutating action carries the workspace key the client last observed. A
mismatched key returns `409 TERMINAL_WORKSPACE_CHANGED`, and a terminal opened
while the target changed is closed before the error is returned. Read-only
Sessions are limited to `workspace`, `connections`, `listTerminals`, and
`readTerminal`; anything else fails with `TERMINAL_READ_ONLY`.

The panel reads raw terminal output, so ANSI sequences, cursor addressing, and
fullscreen TUIs render. The agent-facing `remote_terminal_read` keeps returning
ANSI-cleaned, redacted, bounded text.

## Remote transport

Each remote session starts `ssh -tt` through `ctx.subprocess.spawnTerminal()`.
The host is validated before argv construction, host-key checking is strict,
batch authentication is enabled, and no shell is used by the local process.
An optional absolute cwd is encoded as one safely quoted remote command.

The remote adapter retains bounded raw output for the panel and bounded
ANSI-cleaned line output for the model. It exposes a heuristic idle result
because arbitrary remote prompts cannot be identified without trusting prompt
text. Session status and explicit reads remain the source of truth for command
completion.

## Lifecycle

An owner can only access its own sessions. A session is closed on owner
disposal, plugin disposal, or an explicit close. Panel owners follow Session
disposal; agent owners follow Agent disposal. Every close awaits the subprocess
provider's terminal teardown promise. A failed SSH startup is never published as
a usable session.

## Policy

Remote open/send/signal/close operations use the effective Harness sandbox
policy and approval service for agent calls. Read-only sessions fail closed for
both surfaces. The remote account and server-side OpenSSH configuration remain
outside this plugin's authority boundary.
