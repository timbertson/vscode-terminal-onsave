## Usage:

Press `Ctrl-Shift-p` and select "Terminal-onsave: Set command".

Type in the command you want to be re-run. If you want to be meta you can enter `"!!"` to rerun the last command.

### Stopping:

Just open the "Set command" dialog and press `<Esc>`.

### Status:

After entering a command the extension will show an unobtrusive message describing the current state in the status bar for 2s.

### Running in response to a shortcut instead of file save

This is a lightweight alternative to the "Re-run Last Command" extension.

In the top right of the selector there's a little "play" icon - click this instead of pressing return to use the command in manual mode. This will not run on save, but only when you run the `terminal-onsave.trigger` command ("Terminal-onsave: Manually trigger"). You probably want to set up a keyboard shortcut if you use this feature.

