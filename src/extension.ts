// svg-viewer\src\extension.ts
import * as vscode from 'vscode';
import { SvgHistoryTreeProvider } from './SvgHistoryTreeProvider';
import { SvgCustomEditorProvider } from './SvgCustomEditorProvider';

export function activate(context: vscode.ExtensionContext) {
	const historyProvider = new SvgHistoryTreeProvider(context);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('svg-viewer.explorer', historyProvider),
		vscode.commands.registerCommand('svg-viewer.openFile', () => historyProvider.openFile()),
		vscode.commands.registerCommand('svg-viewer.openHistoryFile', (uri: vscode.Uri) => historyProvider.openHistoryFile(uri)),
		vscode.window.registerCustomEditorProvider(
			'svg-viewer.preview',
			new SvgCustomEditorProvider(context, historyProvider),
			{
				webviewOptions: {
					retainContextWhenHidden: false,
				},
				supportsMultipleEditorsPerDocument: false,
			}
		)
	);
}

export function deactivate() { }
