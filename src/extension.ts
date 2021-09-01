import * as vscode from 'vscode';

class Command {
	readonly value: string;
	readonly manual: boolean;

	constructor(value: string, manual: boolean) {
		this.value = value;
		this.manual = manual;
	}
}

class Impl {
	private currentCommand: Command | null = null;
	private ctx: vscode.ExtensionContext;

	constructor(ctx: vscode.ExtensionContext) {
		this.ctx = ctx
	}

	public setCommand(command: Command | null) {
		this.currentCommand = command;
		let msg = command == null ? 'Disabled' : (command.manual ? 'Manual run configured...' : 'Run on save configured...');
		vscode.window.setStatusBarMessage(msg, 2000);
		this.triggerManually();
	}

	public async triggerOnSave(): Promise<void> {
		if (this.currentCommand != null) {
			if (!this.currentCommand.manual) {
				this.trigger(this.currentCommand);
			}
		}
	}

	public async triggerManually(): Promise<void> {
		if (this.currentCommand != null) {
			await vscode.workspace.saveAll(false)
			return this.trigger(this.currentCommand)
		}
	}

	private async trigger(command: Command): Promise<void> {
		if (vscode.window.activeTerminal) {
			const config = vscode.workspace.getConfiguration('terminal-onsave')
			console.log("Running:", this.currentCommand);

			// send ctrl+c
			await vscode.commands.executeCommand("workbench.action.terminal.sendSequence", { text: "\x03" })

			// TODO clear focuses the terminal
			// if (config.get<boolean>('clear') === true) {
			// 	await vscode.commands.executeCommand('workbench.action.terminal.clear')
			// } else {
			// }
			await vscode.commands.executeCommand('workbench.action.terminal.scrollToBottom')

			const runFirst = config.get<string>('run-first')
			const prefix = (config.get<boolean>('bypass-history')) ? ' ' : ''
			if (runFirst != null && runFirst != "") {
				vscode.window.activeTerminal.sendText(prefix + runFirst, true);
			}
			vscode.window.activeTerminal.sendText(prefix + command.value, true);
		} else {
			console.log("No active terminal");
		}
	}

	public async promptWithHistory(): Promise<Command | null> {
		const key = 'history'
		const state = this.ctx.globalState
		const current = state.get<string[]>(key) || [];
		const selected = await this.prompt(current);
		console.log("selected:", selected)
		if (selected != null) {
			// bump selected to the first entry
			const updated = current.filter((entry) => entry != selected.value);
			updated.unshift(selected.value);
			// then truncate
			while (updated.length > 10) {
				updated.pop();
			}
			await state.update(key, updated)
		}
		return selected
	}

	public prompt(history: string[]): Promise<Command | null> {
		const quickPick = vscode.window.createQuickPick()
		quickPick.placeholder = 'Enter a terminal command, or press <Esc> to disable'
		quickPick.canSelectMany = false
		quickPick.items = history.map(label => ({ label }));
		quickPick.activeItems = []

		quickPick.onDidChangeValue(() => {
			setTimeout(() => {
				quickPick.activeItems = []
			}, 1)
		})

		const manualButton = {
			iconPath: new vscode.ThemeIcon('play-circle'),
			tooltip: "Trigger manually",
		};
		quickPick.buttons = [manualButton];

		return new Promise<Command | null>((resolve) => {
			const accept = (button: vscode.QuickInputButton | null) => {
				// If there's an active item, pick it
				const isManual = button === manualButton;
				const active = quickPick.activeItems[0];
				console.log("accepted: " + active + " with filter = " + quickPick.value);
				if (active != null && active.label != quickPick.value) {
					// active differs from text, adopt active and give a chance to edit
					quickPick.activeItems = [];
					quickPick.value = active.label;
				} else {
					// accept current text
					if (quickPick.value.trim().length == 0) {
						resolve(null)
					} else {
						resolve(new Command(quickPick.value, isManual))
					}
				}
			}
			quickPick.onDidAccept(() => accept(null))
			quickPick.onDidHide(() => resolve(null))
			quickPick.onDidTriggerButton((button) => accept(button))
			quickPick.show()
		}).finally(() => {
			quickPick.dispose()
		})
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log("Activating terminal-onsave")
	let impl = new Impl(context);

	context.subscriptions.push(vscode.workspace.onDidSaveTextDocument(async (_: vscode.TextDocument) => {
		await impl.triggerOnSave()
	}));

	context.subscriptions.push(vscode.commands.registerCommand('terminal-onsave.configure', async () => {
		impl.setCommand(await impl.promptWithHistory());
	}));

	context.subscriptions.push(vscode.commands.registerCommand('terminal-onsave.trigger', async () => {
		await impl.triggerManually()
	}));
}

export function deactivate() { }
