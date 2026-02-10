import * as vscode from 'vscode';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
	const sidebarProvider = new SvgSidebarProvider(context);

	context.subscriptions.push(
		vscode.window.registerTreeDataProvider('svg-viewer.explorer', sidebarProvider),
		vscode.commands.registerCommand('svg-viewer.openFile', () => sidebarProvider.openFile()),
		vscode.commands.registerCommand('svg-viewer.openHistoryFile', (uri: vscode.Uri) => sidebarProvider.openHistoryFile(uri)),
		vscode.window.registerCustomEditorProvider(
			'svg-viewer.preview',
			new SvgPreviewProvider(context, sidebarProvider),
			{
				webviewOptions: {
					retainContextWhenHidden: true,
				},
				supportsMultipleEditorsPerDocument: false,
			}
		)
	);
}

class SvgSidebarProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
	private _onDidChangeTreeData: vscode.EventEmitter<vscode.TreeItem | undefined | null | void> = new vscode.EventEmitter<vscode.TreeItem | undefined | null | void>();
	readonly onDidChangeTreeData: vscode.Event<vscode.TreeItem | undefined | null | void> = this._onDidChangeTreeData.event;
	private history: string[] = [];

	constructor(private readonly context: vscode.ExtensionContext) {
		this.history = this.context.globalState.get<string[]>('svg-viewer.history', []);
	}

	refresh(): void {
		this._onDidChangeTreeData.fire();
	}

	getTreeItem(element: vscode.TreeItem): vscode.TreeItem {
		return element;
	}

	getChildren(element?: vscode.TreeItem): Thenable<vscode.TreeItem[]> {
		if (element) {
			return Promise.resolve([]);
		}

		const items: vscode.TreeItem[] = [];

		// Open File Button Item
		const openFileItem = new vscode.TreeItem('Select SVG File', vscode.TreeItemCollapsibleState.None);
		openFileItem.command = {
			command: 'svg-viewer.openFile',
			title: 'Open SVG File'
		};
		openFileItem.iconPath = new vscode.ThemeIcon('folder-opened');
		items.push(openFileItem);

		// History Items
		if (this.history.length > 0) {
			const separator = new vscode.TreeItem('History', vscode.TreeItemCollapsibleState.None);
			separator.contextValue = 'separator'; // Just a label effectively, but contextValue usually doesn't do visual separation in standard tree view unless it is a collapsible parent.
			// Actually, best to just list them. Or add a "History" group if user wants structure.
			// Since "History" implies a list, let's just add them below.
			// Maybe a specialized item for "Recent Files":

			// Reversing to show newest first
			[...this.history].reverse().forEach(fsPath => {
				const uri = vscode.Uri.file(fsPath);
				const item = new vscode.TreeItem(path.basename(fsPath), vscode.TreeItemCollapsibleState.None);
				item.description = path.dirname(fsPath);
				item.tooltip = fsPath;
				item.command = {
					command: 'svg-viewer.openHistoryFile',
					title: 'Open History File',
					arguments: [uri]
				};
				item.resourceUri = uri;
				items.push(item);
			});
		}

		return Promise.resolve(items);
	}

	public async openFile() {
		const uris = await vscode.window.showOpenDialog({
			canSelectMany: false,
			filters: {
				'SVG Images': ['svg']
			}
		});

		if (uris && uris.length > 0) {
			const uri = uris[0];
			await this.openHistoryFile(uri);
		}
	}

	public async openHistoryFile(uri: vscode.Uri) {
		// Open with our custom editor
		await vscode.commands.executeCommand('vscode.openWith', uri, 'svg-viewer.preview');
		// Add to history (will handle duplicates)
		this.addToHistory(uri);
	}

	public addToHistory(uri: vscode.Uri) {
		const fsPath = uri.fsPath;
		// Remove existing if present to move it to top (end of array)
		this.history = this.history.filter(p => p !== fsPath);
		this.history.push(fsPath);

		// Limit history size? Maybe 50.
		if (this.history.length > 50) {
			this.history.shift();
		}

		this.context.globalState.update('svg-viewer.history', this.history);
		this.refresh();
	}
}

class SvgPreviewProvider implements vscode.CustomTextEditorProvider {
	constructor(
		private readonly context: vscode.ExtensionContext,
		private readonly sidebarProvider: SvgSidebarProvider
	) { }

	public async resolveCustomTextEditor(
		document: vscode.TextDocument,
		webviewPanel: vscode.WebviewPanel,
		_token: vscode.CancellationToken
	): Promise<void> {

		// Add to history when opened
		this.sidebarProvider.addToHistory(document.uri);

		webviewPanel.webview.options = {
			enableScripts: true,
		};

		const updateWebview = () => {
			webviewPanel.webview.postMessage({
				type: 'update',
				text: document.getText(),
			});
		};

		webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);

		// Initial update
		updateWebview();

		const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(e => {
			if (e.document.uri.toString() === document.uri.toString()) {
				updateWebview();
			}
		});

		webviewPanel.onDidDispose(() => {
			changeDocumentSubscription.dispose();
		});
	}

	private getHtmlForWebview(webview: vscode.Webview): string {
		return `<!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    margin: 0;
                    padding: 0;
                    overflow: hidden;
                    background-color: var(--vscode-editor-background);
                    height: 100vh;
                    width: 100vw;
                }
                #container {
                    width: 100%;
                    height: 100%;
                    position: relative;
                    overflow: hidden;
                    cursor: grab;
                }
                #container:active {
                    cursor: grabbing;
                }
                #content {
                    position: absolute;
                    top: 0;
                    left: 0;
                    transform-origin: 0 0;
                }
                #content svg {
                    display: block;
                    width: auto;
                    height: auto;
                }
            </style>
        </head>
        <body>
            <div id="container">
                <div id="content"></div>
            </div>
            <script>
                const vscode = acquireVsCodeApi();
                const content = document.getElementById('content');
                const container = document.getElementById('container');
                
                let scale = 1;
                let translateX = 0;
                let translateY = 0;
                let isPanning = false;
                let startX = 0;
                let startY = 0;

                window.addEventListener('message', event => {
                    const message = event.data;
                    if (message.type === 'update') {
                        content.innerHTML = message.text;
                        scale = 1;
                        translateX = 0;
                        translateY = 0;
                        updateTransform();
                        // Wait for layout to settle
                        setTimeout(centerContent, 50);
                    }
                });

                function centerContent() {
                    const containerRect = container.getBoundingClientRect();
                    const contentRect = content.getBoundingClientRect();
                    
                    translateX = (containerRect.width - contentRect.width) / 2;
                    translateY = (containerRect.height - contentRect.height) / 2;
                    updateTransform();
                }

                // Zoom with mouse wheel aiming at cursor
                container.addEventListener('wheel', (e) => {
                    e.preventDefault();
                    
                    const rect = container.getBoundingClientRect();
                    const mouseX = e.clientX - rect.left;
                    const mouseY = e.clientY - rect.top;

                    // Zoom in (1.1) or out (0.9)
                    const delta = e.deltaY > 0 ? 0.9 : 1.1;
                    const newScale = scale * delta;

                    // Calculate new translation to keep the point under cursor fixed
                    translateX = mouseX - (mouseX - translateX) * delta;
                    translateY = mouseY - (mouseY - translateY) * delta;
                    scale = newScale;

                    updateTransform();
                });

                // Pan with left (0) or middle (1) mouse button
                container.addEventListener('mousedown', (e) => {
                    if (e.button === 0 || e.button === 1) {
                        e.preventDefault();
                        isPanning = true;
                        startX = e.clientX - translateX;
                        startY = e.clientY - translateY;
                        container.style.cursor = 'grabbing';
                    }
                });

                window.addEventListener('mousemove', (e) => {
                    if (!isPanning) return;
                    e.preventDefault();
                    translateX = e.clientX - startX;
                    translateY = e.clientY - startY;
                    updateTransform();
                });

                window.addEventListener('mouseup', () => {
                    isPanning = false;
                    container.style.cursor = 'grab';
                });
                
                window.addEventListener('mouseleave', () => {
                    isPanning = false;
                    container.style.cursor = 'grab';
                });

                function updateTransform() {
                    content.style.transform = \`translate(\${translateX}px, \${translateY}px) scale(\${scale})\`;
                }
            </script>
        </body>
        </html>`;
	}
}

export function deactivate() { }
