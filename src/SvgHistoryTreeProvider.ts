// svg-viewer\src\SvgHistoryTreeProvider.ts
import * as vscode from 'vscode';
import * as path from 'path';

export class SvgHistoryTreeProvider implements vscode.TreeDataProvider<vscode.TreeItem> {
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
        try {
            await vscode.commands.executeCommand('vscode.openWith', uri, 'svg-viewer.preview');
            // Add to history (will handle duplicates)
            this.addToHistory(uri);
        } catch (error) {
            vscode.window.showErrorMessage(`Failed to open file: ${error instanceof Error ? error.message : String(error)}`);
        }
    }

    public addToHistory(uri: vscode.Uri) {
        const fsPath = uri.fsPath;
        // Remove existing if present to move it to top (end of array)
        this.history = this.history.filter(p => p !== fsPath);
        this.history.push(fsPath);

        // Limit history size
        if (this.history.length > 50) {
            this.history.shift();
        }

        this.context.globalState.update('svg-viewer.history', this.history);
        this.refresh();
    }
}
