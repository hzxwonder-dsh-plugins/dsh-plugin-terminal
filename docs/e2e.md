# Verification Scenarios

## Terminal dock

1. Open a Session and confirm the terminal toggle sits with the Session header's
   right-aligned utilities. Press it and confirm the dock opens along the bottom
   of the frame, from the right edge of the left column to the window edge, with
   the composer and any open right column still visible above it.
2. Confirm the first open starts a terminal on the default target and renders a
   shell prompt that accepts typing, including a fullscreen TUI such as `vim`.
3. Open a second terminal and switch between the tabs; confirm the terminal on
   screen is the one that holds the focus and accepts typing, that the tab behind
   it keeps its own screen and scrollback, and that switching back still types
   into the terminal it switched to.
4. Drag the top edge and confirm the PTY width follows the container.
5. Reload the page, reopen the dock, and confirm the sessions are still listed
   and reattach to their output.
6. Select an allow-listed SSH connection as the target and confirm the new
   terminal starts from the bound workspace root.
7. Press the header toggle, confirm the dock closes and releases the strip while
   the PTY keeps running, then open it again and confirm output produced while it
   was closed appears, that exactly one terminal element is on screen for the
   active tab, and that typing lands in that terminal again.
8. Close one terminal and confirm it disappears from the tab strip and from
   `remote_terminal_list`.
9. Run `exit` in a terminal: the tab is marked exited, the bar reads 终端已退出 and
   stops calling the terminal connected, and further keystrokes stop asking the
   Host for a terminal that is gone.
10. Collapse the left column and open the right one with the dock open: the dock
    follows the left column's edge and no column overlaps it.

The same behaviour is exercised end to end, with screenshots, by
`docs/acceptance/2026-09-15-terminal-panel.md`.

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
