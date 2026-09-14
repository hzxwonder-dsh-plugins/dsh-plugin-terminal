# Verification Scenarios

## Terminal panel

1. Open a Session and confirm the tab strip appears under the composer.
2. Press `+` on the local target and confirm a shell prompt renders and accepts
   typing, including a fullscreen TUI such as `vim`.
3. Open a second terminal and switch between the tabs; confirm each keeps its
   own screen and scrollback.
4. Drag the top edge and confirm the PTY width follows the container.
5. Reload the page, reopen the panel, and confirm the sessions are still listed
   and reattach to their output.
6. Select an allow-listed SSH connection as the target and confirm the new
   terminal starts from the bound workspace root.
7. Collapse the panel, confirm the PTY keeps running, and expand it again.
8. Close one terminal and confirm it disappears from the tab strip and from
   `remote_terminal_list`.

## Local PTY composition

1. Install the bundle into a disposable Web profile.
2. Confirm `terminal_open` is present and opens a `shell` session.
3. Send `printf` and a directory change in separate calls.
4. Confirm the second call observes the first call's state.
5. Close the session and confirm `terminal_list` no longer reports it.

## Remote PTY

1. Add a test alias with a pinned host key and an SSH-agent key.
2. Open `remote_terminal_open` with an absolute remote cwd.
3. Send a bounded command and read the resulting scrollback.
4. Signal a long-running command and verify the session remains usable.
5. Close the session and inspect the Harness log for a completed teardown.

Do not place credentials in tool arguments or screenshots. Unit tests use a
fake subprocess terminal; the remote scenarios require an explicitly authorized
test host.
